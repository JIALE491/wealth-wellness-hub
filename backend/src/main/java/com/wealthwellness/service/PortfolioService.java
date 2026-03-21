package com.wealthwellness.service;

import com.wealthwellness.model.Asset;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PortfolioService {

    @Autowired
    private PriceService priceService;

    private static final List<String> REQUIRED_COLS = List.of(
            "asset_name", "asset_class", "value_sgd", "liquidity_days", "risk_tag", "source"
    );

    public List<Asset> parseCSV(InputStream inputStream) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));

        String headerLine = reader.readLine();
        if (headerLine == null) throw new IllegalArgumentException("CSV is empty.");

        String[] headers = Arrays.stream(headerLine.split(","))
                .map(String::trim)
                .toArray(String[]::new);

        Map<String, Integer> colIndex = new HashMap<>();
        for (int i = 0; i < headers.length; i++) {
            colIndex.put(headers[i], i);
        }

        for (String req : REQUIRED_COLS) {
            if (!colIndex.containsKey(req)) {
                throw new IllegalArgumentException("CSV missing column: " + req
                        + ". Required: " + String.join(", ", REQUIRED_COLS));
            }
        }

        List<Asset> assets = new ArrayList<>();
        String line;
        int row = 2;
        while ((line = reader.readLine()) != null) {
            if (line.trim().isEmpty() || line.trim().startsWith("#")) continue;
            String[] parts = line.split(",", -1);
            try {
                Asset a = new Asset();
                a.setAssetName(parts[colIndex.get("asset_name")].trim());
                a.setAssetClass(parts[colIndex.get("asset_class")].trim());
                a.setValueSgd(Double.parseDouble(parts[colIndex.get("value_sgd")].trim()));
                a.setLiquidityDays(Double.parseDouble(parts[colIndex.get("liquidity_days")].trim()));
                a.setRiskTag(parts[colIndex.get("risk_tag")].trim());
                a.setSource(parts[colIndex.get("source")].trim());

                // Optional entry_type (asset or debt)
                if (colIndex.containsKey("entry_type") && colIndex.get("entry_type") < parts.length) {
                    String et = parts[colIndex.get("entry_type")].trim();
                    a.setEntryType(et.isEmpty() ? "asset" : et.toLowerCase());
                } else {
                    a.setEntryType("asset");
                }

                // Optional currency + original_value (multi-currency support)
                String ccy = "SGD";
                if (colIndex.containsKey("currency") && colIndex.get("currency") < parts.length) {
                    String raw = parts[colIndex.get("currency")].trim().toUpperCase();
                    if (!raw.isEmpty()) ccy = raw;
                }
                a.setCurrency(ccy);

                if (colIndex.containsKey("original_value") && colIndex.get("original_value") < parts.length) {
                    String ov = parts[colIndex.get("original_value")].trim();
                    if (!ov.isEmpty()) a.setOriginalValue(Double.parseDouble(ov));
                }
                if (a.getOriginalValue() == null) a.setOriginalValue(a.getValueSgd());

                // Optional platform
                if (colIndex.containsKey("platform") && colIndex.get("platform") < parts.length) {
                    String p = parts[colIndex.get("platform")].trim();
                    if (!p.isEmpty()) a.setPlatform(p);
                }

                // Optional ticker + quantity
                if (colIndex.containsKey("ticker") && colIndex.get("ticker") < parts.length) {
                    String t = parts[colIndex.get("ticker")].trim();
                    if (!t.isEmpty()) a.setTicker(t);
                }
                if (colIndex.containsKey("quantity") && colIndex.get("quantity") < parts.length) {
                    String q = parts[colIndex.get("quantity")].trim();
                    if (!q.isEmpty()) a.setQuantity(Double.parseDouble(q));
                }
                a.setPriceSource("manual");
                assets.add(a);
            } catch (NumberFormatException | ArrayIndexOutOfBoundsException e) {
                throw new IllegalArgumentException("Invalid data at row " + row + ": " + e.getMessage());
            }
            row++;
        }

        if (assets.isEmpty()) throw new IllegalArgumentException("CSV has no data rows.");
        return enrichWithLivePrices(assets);
    }

    public List<Asset> loadSample(String name) throws IOException {
        String resourcePath = "/samples/" + name + ".csv";
        InputStream is = getClass().getResourceAsStream(resourcePath);
        if (is == null) throw new IllegalArgumentException("Sample not found: " + name);
        return parseCSV(is);
    }

    /**
     * Enrich assets with live prices (crypto/stocks) and apply FX conversion
     * for non-SGD assets that have an originalValue set.
     */
    public List<Asset> enrichWithLivePrices(List<Asset> assets) {
        List<Asset> withTicker = assets.stream()
                .filter(a -> a.getTicker() != null && a.getQuantity() != null)
                .collect(Collectors.toList());

        // Fetch all FX rates once (used for both stock USD conversion and non-SGD assets)
        Map<String, Double> fxRates = null;

        if (!withTicker.isEmpty()) {
            List<String> cryptoSymbols = withTicker.stream()
                    .filter(a -> priceService.isCryptoSymbol(a.getTicker()))
                    .map(Asset::getTicker).distinct().collect(Collectors.toList());

            List<String> stockTickers = withTicker.stream()
                    .filter(a -> !priceService.isCryptoSymbol(a.getTicker()))
                    .map(Asset::getTicker).distinct().collect(Collectors.toList());

            Map<String, Double> cryptoPrices = priceService.fetchCryptoPricesSgd(cryptoSymbols);
            Map<String, PriceService.StockQuote> stockQuotes = priceService.fetchStockQuotes(stockTickers);

            if (!stockQuotes.isEmpty() || assets.stream().anyMatch(a -> !"SGD".equals(a.getCurrency()))) {
                fxRates = priceService.fetchAllRatesToSgd();
            }
            double usdToSgd = fxRates != null ? fxRates.getOrDefault("USD", 1.35) : 1.35;

            for (Asset a : assets) {
                if (a.getTicker() == null || a.getQuantity() == null) continue;
                String sym = a.getTicker().toUpperCase();

                if (cryptoPrices.containsKey(sym)) {
                    double priceSgd = cryptoPrices.get(sym);
                    a.setLivePrice(priceSgd);
                    a.setValueSgd(a.getQuantity() * priceSgd);
                    a.setPriceSource("live");
                } else if (stockQuotes.containsKey(a.getTicker())) {
                    PriceService.StockQuote q = stockQuotes.get(a.getTicker());
                    double priceSgd = "SGD".equals(q.currency()) ? q.price() : q.price() * usdToSgd;
                    a.setLivePrice(priceSgd);
                    a.setValueSgd(a.getQuantity() * priceSgd);
                    a.setPriceSource("live");
                }
            }
        }

        // Apply FX conversion for non-SGD manual assets
        boolean hasForeignCcy = assets.stream().anyMatch(a ->
                !"SGD".equalsIgnoreCase(a.getCurrency())
                && a.getOriginalValue() != null
                && !"live".equals(a.getPriceSource()));

        if (hasForeignCcy) {
            if (fxRates == null) fxRates = priceService.fetchAllRatesToSgd();
            for (Asset a : assets) {
                if (!"SGD".equalsIgnoreCase(a.getCurrency())
                        && a.getOriginalValue() != null
                        && !"live".equals(a.getPriceSource())) {
                    double rate = fxRates.getOrDefault(a.getCurrency().toUpperCase(), 1.0);
                    a.setValueSgd(a.getOriginalValue() * rate);
                }
            }
        }

        return assets;
    }
}
