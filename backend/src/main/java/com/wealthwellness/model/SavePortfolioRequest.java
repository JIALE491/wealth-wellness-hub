package com.wealthwellness.model;

import java.util.List;

public class SavePortfolioRequest {
    private String name;
    private List<Asset> assets;

    public String getName()              { return name; }
    public void setName(String name)     { this.name = name; }
    public List<Asset> getAssets()       { return assets; }
    public void setAssets(List<Asset> a) { this.assets = a; }
}
