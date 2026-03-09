package com.wealthwellness.service;

import com.wealthwellness.model.AllocationEntry;
import com.wealthwellness.model.Asset;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ScoringService {

    public List<AllocationEntry> computeAllocation(List<Asset> assets) {
        double total = assets.stream().mapToDouble(Asset::getValueSgd).sum();
        Map<String, Double> grouped = new LinkedHashMap<>();
        for (Asset a : assets) {
            grouped.merge(a.getAssetClass(), a.getValueSgd(), Double::sum);
        }
        List<AllocationEntry> result = new ArrayList<>();
        for (Map.Entry<String, Double> e : grouped.entrySet()) {
            double weight = total > 0 ? e.getValue() / total : 0.0;
            result.add(new AllocationEntry(e.getKey(), e.getValue(), weight));
        }
        result.sort((a, b) -> Double.compare(b.getValueSgd(), a.getValueSgd()));
        return result;
    }

    public double diversificationScore(List<Asset> assets) {
        List<AllocationEntry> alloc = computeAllocation(assets);
        double concentration = alloc.stream().mapToDouble(e -> e.getWeight() * e.getWeight()).sum();
        return clamp(100.0 * (1.0 - concentration));
    }

    public double liquidityScore(List<Asset> assets) {
        double total = assets.stream().mapToDouble(Asset::getValueSgd).sum();
        double liquid = assets.stream()
                .filter(a -> a.getLiquidityDays() <= 7)
                .mapToDouble(Asset::getValueSgd).sum();
        return clamp(total > 0 ? 100.0 * liquid / total : 0.0);
    }

    public double resilienceScore(double worstDropPct) {
        return clamp(100.0 - 2.0 * worstDropPct);
    }

    public String topConcentrationClass(List<Asset> assets) {
        return computeAllocation(assets).stream()
                .max(Comparator.comparingDouble(AllocationEntry::getWeight))
                .map(AllocationEntry::getAssetClass)
                .orElse("");
    }

    public double topConcentrationWeight(List<Asset> assets) {
        return computeAllocation(assets).stream()
                .mapToDouble(AllocationEntry::getWeight)
                .max().orElse(0.0);
    }

    /**
     * Debt Health: penalises leverage. 0 debt = 100, 50%+ debt-to-assets = 0.
     * Formula: 100 - (debtRatio * 200), clamped to [0,100].
     */
    public double debtHealthScore(double totalAssets, double totalDebts) {
        if (totalAssets <= 0) return 100.0;
        double debtRatio = totalDebts / totalAssets;
        return clamp(100.0 - debtRatio * 200.0);
    }

    /**
     * Concentration (single-asset): looks at the largest individual holding.
     * Distinct from diversification which operates at asset-class level.
     * Formula: 100 * (1 - topSingleAssetWeight).
     */
    public double concentrationScore(List<Asset> assets) {
        double total = assets.stream().mapToDouble(Asset::getValueSgd).sum();
        if (total <= 0) return 100.0;
        double topWeight = assets.stream()
                .mapToDouble(a -> a.getValueSgd() / total)
                .max().orElse(0.0);
        return clamp(100.0 * (1.0 - topWeight));
    }

    /**
     * Emergency Fund: rewards holding cash as a % of total assets.
     * Reaches 100 at 20% cash allocation (the commonly recommended buffer).
     * Formula: min(100, cashOnHand / totalAssets * 500).
     */
    public double emergencyFundScore(double cashOnHand, double totalAssets) {
        if (totalAssets <= 0) return 0.0;
        return clamp((cashOnHand / totalAssets) * 500.0);
    }

    private double clamp(double x) {
        return Math.max(0.0, Math.min(100.0, x));
    }
}
