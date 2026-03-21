package com.wealthwellness.controller;

import com.wealthwellness.model.*;
import com.wealthwellness.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PortfolioController {

    @Autowired private PriceService priceService;
    @Autowired private PortfolioService portfolioService;
    @Autowired private ScoringService scoringService;
    @Autowired private ScenarioService scenarioService;
    @Autowired private RecommendationService recommendationService;

    @PostMapping("/portfolio/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        try {
            List<Asset> assets = portfolioService.parseCSV(file.getInputStream());
            return ResponseEntity.ok(assets);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/portfolio/sample/{name}")
    public ResponseEntity<?> sample(@PathVariable String name) {
        try {
            List<Asset> assets = portfolioService.loadSample(name);
            return ResponseEntity.ok(assets);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/scenarios/asset-classes")
    public ResponseEntity<List<String>> assetClasses() {
        return ResponseEntity.ok(ScenarioService.ASSET_CLASSES);
    }

    @GetMapping("/fx-rates")
    public ResponseEntity<Map<String, Double>> fxRates() {
        return ResponseEntity.ok(priceService.fetchAllRatesToSgd());
    }

    @GetMapping("/prices/history/{ticker}")
    public ResponseEntity<?> priceHistory(
            @PathVariable String ticker,
            @RequestParam(defaultValue = "3mo") String range) {
        try {
            OhlcResponse ohlc = priceService.fetchOhlcData(ticker, range);
            return ResponseEntity.ok(ohlc);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/prices/refresh")
    public ResponseEntity<?> refreshPrices(@RequestBody List<Asset> assets) {
        try {
            List<Asset> enriched = portfolioService.enrichWithLivePrices(assets);
            return ResponseEntity.ok(Map.of(
                    "assets", enriched,
                    "updatedAt", Instant.now().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> analyze(@RequestBody AnalysisRequest request) {
        try {
            List<Asset> base = request.getAssets();
            CustomScenario cs = request.getCustomScenario();
            boolean hasScenario = cs != null && cs.getAssetClass() != null;

            // Apply scenario (debts are automatically skipped inside ScenarioService)
            List<Asset> allAssets = hasScenario
                    ? scenarioService.applyCustomScenario(base, cs)
                    : new ArrayList<>(base);

            // Split into assets vs debts for separate accounting
            List<Asset> assetsOnly = allAssets.stream()
                    .filter(a -> !"debt".equalsIgnoreCase(a.getEntryType()))
                    .collect(java.util.stream.Collectors.toList());
            List<Asset> baseAssetsOnly = base.stream()
                    .filter(a -> !"debt".equalsIgnoreCase(a.getEntryType()))
                    .collect(java.util.stream.Collectors.toList());

            double totalDebts = base.stream()
                    .filter(a -> "debt".equalsIgnoreCase(a.getEntryType()))
                    .mapToDouble(Asset::getValueSgd).sum();
            double totalAssets    = assetsOnly.stream().mapToDouble(Asset::getValueSgd).sum();
            double netWorth       = totalAssets - totalDebts;
            double baseNetWorth   = baseAssetsOnly.stream().mapToDouble(Asset::getValueSgd).sum() - totalDebts;
            double cashOnHand     = assetsOnly.stream()
                    .filter(a -> "Cash".equalsIgnoreCase(a.getAssetClass()))
                    .mapToDouble(Asset::getValueSgd).sum();
            double investable     = assetsOnly.stream()
                    .filter(a -> a.getLiquidityDays() <= 7)
                    .mapToDouble(Asset::getValueSgd).sum();
            double worstDrop      = scenarioService.worstReferenceDropPct(baseAssetsOnly);

            AnalysisResult result = new AnalysisResult();
            result.setNetWorth(netWorth);
            result.setBaseNetWorth(baseNetWorth);
            result.setDelta(netWorth - baseNetWorth);
            result.setTotalAssets(totalAssets);
            result.setTotalDebts(totalDebts);
            result.setCashOnHand(cashOnHand);
            result.setInvestableAssets(investable);
            result.setAssets(allAssets);
            result.setAllocation(scoringService.computeAllocation(assetsOnly));
            result.setDiversificationScore(scoringService.diversificationScore(assetsOnly));
            result.setLiquidityScore(scoringService.liquidityScore(assetsOnly));
            result.setWorstDropPct(worstDrop);
            result.setResilienceScore(scoringService.resilienceScore(worstDrop));
            result.setDebtHealthScore(scoringService.debtHealthScore(totalAssets, totalDebts));
            result.setConcentrationScore(scoringService.concentrationScore(assetsOnly));
            result.setEmergencyFundScore(scoringService.emergencyFundScore(cashOnHand, totalAssets));

            List<String> issues = new ArrayList<>();
            if (result.getDiversificationScore() < 40) issues.add("high concentration risk");
            if (result.getLiquidityScore() < 20)       issues.add("low short-term liquidity buffer");
            if (result.getResilienceScore() < 50)      issues.add("fragile under stress scenarios");
            result.setHealthIssues(issues);

            UserProfile profile = request.getUserProfile();
            result.setAlerts(recommendationService.generateAlerts(assetsOnly, profile));
            result.setRecommendations(recommendationService.generateRecommendations(assetsOnly, profile));
            result.setScenarioImpact(hasScenario
                    ? scenarioService.computeImpact(base, allAssets)
                    : List.of());

            // Currency exposure: sum SGD value by source currency
            Map<String, Double> currencyExposure = new java.util.LinkedHashMap<>();
            for (Asset a : assetsOnly) {
                String ccy = a.getCurrency() != null ? a.getCurrency() : "SGD";
                currencyExposure.merge(ccy, a.getValueSgd(), Double::sum);
            }
            result.setCurrencyExposure(currencyExposure);
            result.setFxRates(priceService.fetchAllRatesToSgd());

            // Platform breakdown: sum SGD value by platform (assets only, skip nulls)
            Map<String, Double> platformBreakdown = new java.util.LinkedHashMap<>();
            for (Asset a : assetsOnly) {
                if (a.getPlatform() != null && !a.getPlatform().isBlank()) {
                    platformBreakdown.merge(a.getPlatform(), a.getValueSgd(), Double::sum);
                }
            }
            result.setPlatformBreakdown(platformBreakdown);

            result.setPricesUpdatedAt(Instant.now().toString());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
