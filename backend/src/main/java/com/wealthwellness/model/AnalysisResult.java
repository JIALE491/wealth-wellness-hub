package com.wealthwellness.model;

import java.util.List;
import java.util.Map;

public class AnalysisResult {
    private double netWorth;
    private double baseNetWorth;
    private double delta;
    private String appliedScenario;
    private List<Asset> assets;
    private List<AllocationEntry> allocation;
    private double diversificationScore;
    private double liquidityScore;
    private double resilienceScore;
    private double worstDropPct;
    private List<String> healthIssues;
    private List<String> alerts;
    private List<Recommendation> recommendations;
    private List<ScenarioImpactItem> scenarioImpact;
    private String pricesUpdatedAt;
    private double totalAssets;
    private double totalDebts;
    private double cashOnHand;
    private double investableAssets;
    private double debtHealthScore;
    private double concentrationScore;
    private double emergencyFundScore;
    private Map<String, Double> currencyExposure;  // { "USD" -> 15000, "SGD" -> 30000 } in SGD
    private Map<String, Double> fxRates;            // { "USD" -> 1.35, "EUR" -> 1.47 }
    private Map<String, Double> platformBreakdown;  // { "Tiger Broker" -> 25000, "Moomoo" -> 10000 } in SGD

    public double getNetWorth() { return netWorth; }
    public void setNetWorth(double netWorth) { this.netWorth = netWorth; }

    public double getBaseNetWorth() { return baseNetWorth; }
    public void setBaseNetWorth(double baseNetWorth) { this.baseNetWorth = baseNetWorth; }

    public double getDelta() { return delta; }
    public void setDelta(double delta) { this.delta = delta; }

    public String getAppliedScenario() { return appliedScenario; }
    public void setAppliedScenario(String appliedScenario) { this.appliedScenario = appliedScenario; }

    public List<Asset> getAssets() { return assets; }
    public void setAssets(List<Asset> assets) { this.assets = assets; }

    public List<AllocationEntry> getAllocation() { return allocation; }
    public void setAllocation(List<AllocationEntry> allocation) { this.allocation = allocation; }

    public double getDiversificationScore() { return diversificationScore; }
    public void setDiversificationScore(double diversificationScore) { this.diversificationScore = diversificationScore; }

    public double getLiquidityScore() { return liquidityScore; }
    public void setLiquidityScore(double liquidityScore) { this.liquidityScore = liquidityScore; }

    public double getResilienceScore() { return resilienceScore; }
    public void setResilienceScore(double resilienceScore) { this.resilienceScore = resilienceScore; }

    public double getWorstDropPct() { return worstDropPct; }
    public void setWorstDropPct(double worstDropPct) { this.worstDropPct = worstDropPct; }

    public List<String> getHealthIssues() { return healthIssues; }
    public void setHealthIssues(List<String> healthIssues) { this.healthIssues = healthIssues; }

    public List<String> getAlerts() { return alerts; }
    public void setAlerts(List<String> alerts) { this.alerts = alerts; }

    public List<Recommendation> getRecommendations() { return recommendations; }
    public void setRecommendations(List<Recommendation> recommendations) { this.recommendations = recommendations; }

    public List<ScenarioImpactItem> getScenarioImpact() { return scenarioImpact; }
    public void setScenarioImpact(List<ScenarioImpactItem> scenarioImpact) { this.scenarioImpact = scenarioImpact; }

    public String getPricesUpdatedAt() { return pricesUpdatedAt; }
    public void setPricesUpdatedAt(String pricesUpdatedAt) { this.pricesUpdatedAt = pricesUpdatedAt; }

    public double getTotalAssets() { return totalAssets; }
    public void setTotalAssets(double totalAssets) { this.totalAssets = totalAssets; }

    public double getTotalDebts() { return totalDebts; }
    public void setTotalDebts(double totalDebts) { this.totalDebts = totalDebts; }

    public double getCashOnHand() { return cashOnHand; }
    public void setCashOnHand(double cashOnHand) { this.cashOnHand = cashOnHand; }

    public double getInvestableAssets() { return investableAssets; }
    public void setInvestableAssets(double investableAssets) { this.investableAssets = investableAssets; }

    public double getDebtHealthScore() { return debtHealthScore; }
    public void setDebtHealthScore(double debtHealthScore) { this.debtHealthScore = debtHealthScore; }

    public double getConcentrationScore() { return concentrationScore; }
    public void setConcentrationScore(double concentrationScore) { this.concentrationScore = concentrationScore; }

    public double getEmergencyFundScore() { return emergencyFundScore; }
    public void setEmergencyFundScore(double emergencyFundScore) { this.emergencyFundScore = emergencyFundScore; }

    public Map<String, Double> getCurrencyExposure() { return currencyExposure; }
    public void setCurrencyExposure(Map<String, Double> currencyExposure) { this.currencyExposure = currencyExposure; }

    public Map<String, Double> getFxRates() { return fxRates; }
    public void setFxRates(Map<String, Double> fxRates) { this.fxRates = fxRates; }

    public Map<String, Double> getPlatformBreakdown() { return platformBreakdown; }
    public void setPlatformBreakdown(Map<String, Double> platformBreakdown) { this.platformBreakdown = platformBreakdown; }
}
