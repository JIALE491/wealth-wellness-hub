package com.wealthwellness.model;

import java.util.List;

public class Recommendation {
    private String       action;
    private String       why;
    private List<String> steps;   // concrete, actionable next steps

    public Recommendation() {}

    public Recommendation(String action, String why, List<String> steps) {
        this.action = action;
        this.why    = why;
        this.steps  = steps;
    }

    // backwards-compatible constructor (no steps)
    public Recommendation(String action, String why) {
        this(action, why, List.of());
    }

    public String       getAction()             { return action; }
    public void         setAction(String action){ this.action = action; }

    public String       getWhy()                { return why; }
    public void         setWhy(String why)      { this.why = why; }

    public List<String> getSteps()              { return steps; }
    public void         setSteps(List<String> steps){ this.steps = steps; }
}
