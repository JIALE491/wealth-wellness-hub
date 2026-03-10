package com.wealthwellness.model;

public class UserProfile {
    private int    age           = 35;
    private String riskAppetite  = "balanced";   // "conservative" | "balanced" | "aggressive"
    private String primaryGoal   = "wealth_building"; // "emergency_fund" | "wealth_building" | "retirement" | "income"
    private double monthlyIncome = 0;            // SGD, used for debt-to-income alerts

    public int    getAge()            { return age; }
    public void   setAge(int age)     { this.age = age; }

    public String getRiskAppetite()                     { return riskAppetite; }
    public void   setRiskAppetite(String riskAppetite) { this.riskAppetite = riskAppetite; }

    public String getPrimaryGoal()                  { return primaryGoal; }
    public void   setPrimaryGoal(String primaryGoal){ this.primaryGoal = primaryGoal; }

    public double getMonthlyIncome()                      { return monthlyIncome; }
    public void   setMonthlyIncome(double monthlyIncome)  { this.monthlyIncome = monthlyIncome; }
}
