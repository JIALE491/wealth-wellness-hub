package com.wealthwellness.service;

import com.wealthwellness.model.Asset;
import com.wealthwellness.model.Recommendation;
import com.wealthwellness.model.UserProfile;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    @Autowired
    private ScoringService scoring;

    // ── Target allocations by profile ──────────────────────────────────────────
    // Keys must match Asset.assetClass values used in the frontend

    private static final Map<String, Map<String, Double>> BASE_TARGETS = new LinkedHashMap<>();
    static {
        Map<String, Double> cons = new LinkedHashMap<>();
        cons.put("Cash",              0.25);
        cons.put("Bonds",             0.35);
        cons.put("Equities",          0.25);
        cons.put("Real Estate",       0.10);
        cons.put("Crypto",            0.02);
        cons.put("Commodities",       0.03);
        BASE_TARGETS.put("conservative", cons);

        Map<String, Double> bal = new LinkedHashMap<>();
        bal.put("Cash",              0.15);
        bal.put("Bonds",             0.25);
        bal.put("Equities",          0.40);
        bal.put("Real Estate",       0.12);
        bal.put("Crypto",            0.05);
        bal.put("Commodities",       0.03);
        BASE_TARGETS.put("balanced", bal);

        Map<String, Double> agg = new LinkedHashMap<>();
        agg.put("Cash",              0.05);
        agg.put("Bonds",             0.10);
        agg.put("Equities",          0.55);
        agg.put("Real Estate",       0.15);
        agg.put("Crypto",            0.12);
        agg.put("Commodities",       0.03);
        BASE_TARGETS.put("aggressive", agg);
    }

    // Suggested instruments per asset class for actionable steps
    private static final Map<String, String> CLASS_INSTRUMENTS = new LinkedHashMap<>();
    static {
        CLASS_INSTRUMENTS.put("Bonds",       "e.g. SSB, ABF Bond ETF (A35)");
        CLASS_INSTRUMENTS.put("Equities",    "e.g. STI ETF (ES3), IWDA, VOO");
        CLASS_INSTRUMENTS.put("Cash",        "e.g. high-yield savings, T-bills");
        CLASS_INSTRUMENTS.put("Real Estate", "e.g. CapitaLand REIT (C38U), Mapletree Industrial");
        CLASS_INSTRUMENTS.put("Crypto",      "e.g. BTC, ETH via licensed exchange");
        CLASS_INSTRUMENTS.put("Commodities", "e.g. GLD, SPDR Gold MiniShares");
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    public List<String> generateAlerts(List<Asset> assets, UserProfile profile) {
        if (profile == null) profile = new UserProfile();
        List<String> alerts = new ArrayList<>();
        double total = assets.stream().mapToDouble(Asset::getValueSgd).sum();
        if (total <= 0) return alerts;

        // 1. Concentration by asset class
        String topClass = scoring.topConcentrationClass(assets);
        double topW     = scoring.topConcentrationWeight(assets);
        if (topW >= 0.60) {
            alerts.add(String.format(
                "High concentration: %s is %.0f%% of your portfolio — consider diversifying.",
                topClass, topW * 100));
        }

        // 2. Single-holding dominance
        assets.stream()
            .max(Comparator.comparingDouble(Asset::getValueSgd))
            .ifPresent(top -> {
                double w = top.getValueSgd() / total;
                if (w >= 0.40) {
                    alerts.add(String.format(
                        "Single-holding risk: \"%s\" alone is %.0f%% of your portfolio.",
                        top.getAssetName(), w * 100));
                }
            });

        // 3. Liquidity
        double liquid7   = assets.stream().filter(a -> a.getLiquidityDays() <= 7)
                                 .mapToDouble(Asset::getValueSgd).sum();
        double liquidPct = liquid7 / total;
        if (liquidPct <= 0.10) {
            alerts.add(String.format(
                "Critical liquidity gap: only %.0f%% of assets are accessible within 7 days.",
                liquidPct * 100));
        } else if (liquidPct <= 0.20) {
            alerts.add(String.format(
                "Low short-term liquidity: %.0f%% liquid within 7 days — target ≥20%%.",
                liquidPct * 100));
        }

        // 4. High-risk exposure
        double highRisk    = assets.stream().filter(a -> "High".equals(a.getRiskTag()))
                                   .mapToDouble(Asset::getValueSgd).sum();
        double highRiskPct = highRisk / total;
        double riskThresh  = "aggressive".equals(profile.getRiskAppetite()) ? 0.65 : 0.50;
        if (highRiskPct >= riskThresh) {
            alerts.add(String.format(
                "High-risk exposure: %.0f%% is tagged High risk — misaligns with your %s profile.",
                highRiskPct * 100, profile.getRiskAppetite()));
        }

        // 5. Age-inappropriate allocation
        int age = profile.getAge();
        double equityPct = assets.stream()
            .filter(a -> "Equities".equals(a.getAssetClass()) || "Crypto".equals(a.getAssetClass()))
            .mapToDouble(Asset::getValueSgd).sum() / total;
        double aggressiveEquityMax = Math.max(0.30, 1.0 - (age - 20) * 0.01);  // rule of thumb: 100-age in equities
        if (age >= 55 && equityPct > aggressiveEquityMax + 0.15) {
            alerts.add(String.format(
                "Age risk: at %d years old, %.0f%% in equities/crypto may be too high for your timeline.",
                age, equityPct * 100));
        }

        // 6. Debt-to-income ratio
        if (profile.getMonthlyIncome() > 0) {
            double totalDebt     = assets.stream().filter(a -> a.getValueSgd() < 0)
                                         .mapToDouble(a -> Math.abs(a.getValueSgd())).sum();
            double monthlyDebtSvc = totalDebt * 0.005; // rough 0.5% monthly of debt
            double dti            = monthlyDebtSvc / profile.getMonthlyIncome();
            if (dti >= 0.40) {
                alerts.add(String.format(
                    "High debt-to-income: estimated monthly obligations are ≈%.0f%% of income (threshold: 40%%).",
                    dti * 100));
            }
        }

        // 7. Emergency fund
        double cash    = assets.stream().filter(a -> "Cash".equals(a.getAssetClass()))
                               .mapToDouble(Asset::getValueSgd).sum();
        double cashPct = cash / total;
        if (cashPct < 0.05) {
            alerts.add("Emergency fund alert: cash reserves are under 5% of portfolio — aim for 3–6 months of expenses.");
        }

        return alerts;
    }

    public List<Recommendation> generateRecommendations(List<Asset> assets, UserProfile profile) {
        if (profile == null) profile = new UserProfile();
        List<Recommendation> recs = new ArrayList<>();
        double total = assets.stream().mapToDouble(Asset::getValueSgd).sum();
        if (total <= 0) return recs;

        Map<String, Double> targets = buildTargets(profile);
        Map<String, Double> current = buildCurrentAllocation(assets);

        // 1. Target-allocation gaps (largest deviation first)
        List<Map.Entry<String, Double>> gaps = new ArrayList<>();
        for (Map.Entry<String, Double> e : targets.entrySet()) {
            double curr    = current.getOrDefault(e.getKey(), 0.0);
            double delta   = e.getValue() - curr; // positive = under-weight
            if (delta >= 0.05) gaps.add(Map.entry(e.getKey(), delta));
        }
        gaps.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));

        for (Map.Entry<String, Double> gap : gaps.subList(0, Math.min(2, gaps.size()))) {
            String cls        = gap.getKey();
            double deltaPct   = gap.getValue();
            double amountNeeded = deltaPct * total;
            double currentPct   = current.getOrDefault(cls, 0.0);
            double targetPct    = targets.get(cls);
            String instrument   = CLASS_INSTRUMENTS.getOrDefault(cls, "");
            recs.add(new Recommendation(
                String.format("Increase %s allocation by %.0f%%", cls, deltaPct * 100),
                String.format("Your %s target is %.0f%% but you currently hold %.0f%%. " +
                              "Rebalancing toward the target improves risk alignment for a %s profile.",
                              cls, targetPct * 100, currentPct * 100, profile.getRiskAppetite()),
                List.of(
                    String.format("Buy S$%,.0f of %s (%s)", amountNeeded, cls, instrument),
                    String.format("This brings %s from %.0f%% to %.0f%% of your portfolio",
                                  cls, currentPct * 100, targetPct * 100)
                )
            ));
        }

        // 2. Over-concentration
        String topClass = scoring.topConcentrationClass(assets);
        double topW     = scoring.topConcentrationWeight(assets);
        if (topW >= 0.60) {
            double excess       = topW - targets.getOrDefault(topClass, 0.20);
            double excessAmount = excess * total;
            recs.add(new Recommendation(
                "Reduce over-concentration in " + topClass,
                String.format("%s is %.0f%% of your portfolio but your %s target is %.0f%%. " +
                              "Diversification score: %.0f/100.",
                              topClass, topW * 100,
                              profile.getRiskAppetite(),
                              targets.getOrDefault(topClass, 0.20) * 100,
                              scoring.diversificationScore(assets)),
                List.of(
                    String.format("Consider selling S$%,.0f of %s holdings (to reach target weight)", excessAmount, topClass),
                    "Reinvest proceeds into under-weighted asset classes"
                )
            ));
        }

        // 3. Emergency fund / liquidity
        double liquid7   = assets.stream().filter(a -> a.getLiquidityDays() <= 7)
                                 .mapToDouble(Asset::getValueSgd).sum();
        double liquidPct = total > 0 ? liquid7 / total : 0.0;
        if (liquidPct <= 0.20) {
            double gap       = 0.20 * total - liquid7;
            recs.add(new Recommendation(
                "Strengthen cash buffer",
                String.format("Only %.0f%% of your portfolio (S$%,.0f) is liquid within 7 days. " +
                              "A 20%% buffer reduces forced-selling risk.",
                              liquidPct * 100, liquid7),
                List.of(
                    String.format("Move S$%,.0f into high-yield savings or T-bills", gap),
                    "Target: 3–6 months of living expenses in accessible cash"
                )
            ));
        }

        // 4. Goal-specific recommendation
        recs.add(goalRec(profile, total, current, targets));

        // 5. Stress-test / scenario reminder
        recs.add(new Recommendation(
            "Run a stress test on your portfolio",
            "Scenario analysis reveals how much your net worth would fall in market shocks — " +
            "essential for a " + profile.getRiskAppetite() + " profile with a " +
            profile.getPrimaryGoal().replace("_", " ") + " goal.",
            List.of(
                "Use the Scenario Analysis tab to simulate a market crash (-30%)",
                "Ensure the simulated drawdown stays within your personal risk tolerance"
            )
        ));

        return recs.stream().limit(6).collect(Collectors.toList());
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /** Build target allocation, adjusting bonds/equities split by age. */
    private Map<String, Double> buildTargets(UserProfile profile) {
        String risk = profile.getRiskAppetite();
        if (!BASE_TARGETS.containsKey(risk)) risk = "balanced";

        Map<String, Double> t = new LinkedHashMap<>(BASE_TARGETS.get(risk));

        // Age adjustment: for every 5 years over 40, shift 3% from equities to bonds
        int age = profile.getAge();
        if (age > 40) {
            double shift = Math.min(0.15, ((age - 40) / 5) * 0.03);
            t.merge("Equities", -shift, Double::sum);
            t.merge("Bonds",    +shift, Double::sum);
        }
        return t;
    }

    private Map<String, Double> buildCurrentAllocation(List<Asset> assets) {
        double total = assets.stream().mapToDouble(Asset::getValueSgd).sum();
        Map<String, Double> result = new LinkedHashMap<>();
        if (total <= 0) return result;
        for (Asset a : assets) {
            result.merge(a.getAssetClass(), a.getValueSgd() / total, Double::sum);
        }
        return result;
    }

    private Recommendation goalRec(UserProfile profile, double total,
                                   Map<String, Double> current, Map<String, Double> targets) {
        switch (profile.getPrimaryGoal()) {
            case "emergency_fund": {
                double cash    = current.getOrDefault("Cash", 0.0) * total;
                double income  = profile.getMonthlyIncome();
                double target6m = income > 0 ? income * 6 : total * 0.15;
                double needed  = Math.max(0, target6m - cash);
                return new Recommendation(
                    "Build your emergency fund first",
                    String.format("Your primary goal is an emergency fund. " +
                                  "You currently have S$%,.0f in cash; aim for S$%,.0f (6 months of expenses).",
                                  cash, target6m),
                    List.of(
                        needed > 0
                            ? String.format("Add S$%,.0f to high-yield savings or T-bills", needed)
                            : "Your emergency fund target is met — shift focus to wealth building",
                        "Park funds in OCBC 360, DBS Multiplier, or 6-month T-bills"
                    )
                );
            }
            case "retirement": {
                double targetBondPct = targets.getOrDefault("Bonds", 0.25);
                return new Recommendation(
                    "Align portfolio for retirement income",
                    String.format("At age %d with a retirement goal, shift toward income-generating assets. " +
                                  "Bonds target: %.0f%% (currently %.0f%%).",
                                  profile.getAge(), targetBondPct * 100,
                                  current.getOrDefault("Bonds", 0.0) * 100),
                    List.of(
                        "Increase bond allocation with SSB (Singapore Savings Bonds) — risk-free, government-backed",
                        "Consider adding REITs for dividend income: CapitaLand Integrated, Mapletree Pan Asia",
                        "Maximise CPF SA top-ups to lock in 4% p.a. guaranteed return"
                    )
                );
            }
            case "income": {
                return new Recommendation(
                    "Maximise dividend and income yield",
                    "Your goal is income generation. Focus on yield-producing assets.",
                    List.of(
                        "Target REITs with ≥5% distribution yield (e.g. Parkway Life REIT, Frasers Logistics)",
                        "Consider dividend ETFs: SPDR STI ETF (ES3) ~3.5% yield, iShares Asia Pacific Dividend",
                        "Avoid locking up too much in growth equities with zero dividend yield"
                    )
                );
            }
            default: { // wealth_building
                double targetEqPct = targets.getOrDefault("Equities", 0.40);
                return new Recommendation(
                    "Invest consistently for long-term wealth building",
                    String.format("For wealth building at age %d, regular equity investing compounds well over time. " +
                                  "Equities target: %.0f%% (currently %.0f%%).",
                                  profile.getAge(), targetEqPct * 100,
                                  current.getOrDefault("Equities", 0.0) * 100),
                    List.of(
                        "Set up a monthly RSP (Regular Savings Plan) into IWDA or VOO — low-cost global diversification",
                        "Increase CPF OA investments via CPFIA once OA balance exceeds S$20,000",
                        "Review and rebalance every 6 months to stay on target"
                    )
                );
            }
        }
    }
}
