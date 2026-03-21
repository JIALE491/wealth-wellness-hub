package com.wealthwellness.model;

import java.util.List;

public class ChatRequest {
    private List<ChatMessage> messages;
    private List<Asset> assets;
    private UserProfile userProfile;
    private AnalysisResult analysisResult;

    public List<ChatMessage> getMessages() { return messages; }
    public void setMessages(List<ChatMessage> messages) { this.messages = messages; }

    public List<Asset> getAssets() { return assets; }
    public void setAssets(List<Asset> assets) { this.assets = assets; }

    public UserProfile getUserProfile() { return userProfile; }
    public void setUserProfile(UserProfile userProfile) { this.userProfile = userProfile; }

    public AnalysisResult getAnalysisResult() { return analysisResult; }
    public void setAnalysisResult(AnalysisResult analysisResult) { this.analysisResult = analysisResult; }
}
