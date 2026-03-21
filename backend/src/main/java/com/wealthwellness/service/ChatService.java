package com.wealthwellness.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.wealthwellness.model.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

@Service
public class ChatService {

    @Value("${groq.api.key}")
    private String apiKey;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL    = "llama-3.3-70b-versatile";

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper mapper   = new ObjectMapper();

    public String chat(List<ChatMessage> messages, List<Asset> assets,
                       UserProfile profile, AnalysisResult result) throws Exception {

        String systemPrompt = buildSystemPrompt(assets, profile, result);

        // Build OpenAI-compatible request body (Groq uses the same format)
        ObjectNode body = mapper.createObjectNode();
        body.put("model", MODEL);
        body.put("max_tokens", 512);
        body.put("temperature", 0.7);

        ArrayNode msgArray = mapper.createArrayNode();

        // System message first
        ObjectNode sysMsg = mapper.createObjectNode();
        sysMsg.put("role", "system");
        sysMsg.put("content", systemPrompt);
        msgArray.add(sysMsg);

        // Conversation history
        for (ChatMessage msg : messages) {
            ObjectNode turn = mapper.createObjectNode();
            turn.put("role", msg.getRole()); // "user" or "assistant" — matches Groq directly
            turn.put("content", msg.getContent());
            msgArray.add(turn);
        }

        body.set("messages", msgArray);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(GROQ_URL))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + apiKey)
            .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq API error " + response.statusCode() + ": " + response.body());
        }

        JsonNode json = mapper.readTree(response.body());
        return json.at("/choices/0/message/content").asText("Sorry, I could not generate a response.");
    }

    private String buildSystemPrompt(List<Asset> assets, UserProfile profile, AnalysisResult result) {
        StringBuilder sb = new StringBuilder();

        sb.append("You are a professional financial advisor embedded in Wealth Wellness Hub.\n");
        sb.append("Your role is to help the user understand and optimise their asset distribution based on their current portfolio.\n");
        sb.append("Tone: clear, concise, and professional. No filler. Get straight to the point.\n");
        sb.append("Format: use short paragraphs or bullet points where appropriate. Maximum 3 paragraphs per response.\n");
        sb.append("Always base your answers strictly on the portfolio data provided below — do not make up figures.\n\n");

        if (profile != null) {
            sb.append("=== USER PROFILE ===\n");
            sb.append("Age: ").append(profile.getAge()).append("\n");
            sb.append("Risk Appetite: ").append(profile.getRiskAppetite()).append("\n");
            sb.append("Primary Goal: ").append(profile.getPrimaryGoal()).append("\n");
            if (profile.getMonthlyIncome() > 0)
                sb.append("Monthly Income: SGD ").append(String.format("%.0f", profile.getMonthlyIncome())).append("\n");
            sb.append("\n");
        }

        if (result != null) {
            sb.append("=== PORTFOLIO SUMMARY ===\n");
            sb.append("Net Worth: SGD ").append(String.format("%.0f", result.getNetWorth())).append("\n");
            sb.append("Total Assets: SGD ").append(String.format("%.0f", result.getTotalAssets())).append("\n");
            sb.append("Total Debts: SGD ").append(String.format("%.0f", result.getTotalDebts())).append("\n");
            sb.append("Cash on Hand: SGD ").append(String.format("%.0f", result.getCashOnHand())).append("\n");
            sb.append("Investable (liquid ≤7d): SGD ").append(String.format("%.0f", result.getInvestableAssets())).append("\n\n");

            sb.append("=== HEALTH SCORES (0-100) ===\n");
            sb.append("Diversification: ").append(String.format("%.0f", result.getDiversificationScore())).append("/100\n");
            sb.append("Liquidity: ").append(String.format("%.0f", result.getLiquidityScore())).append("/100\n");
            sb.append("Resilience: ").append(String.format("%.0f", result.getResilienceScore())).append("/100\n");
            sb.append("Debt Health: ").append(String.format("%.0f", result.getDebtHealthScore())).append("/100\n");
            sb.append("Concentration: ").append(String.format("%.0f", result.getConcentrationScore())).append("/100\n");
            sb.append("Emergency Fund: ").append(String.format("%.0f", result.getEmergencyFundScore())).append("/100\n\n");

            if (result.getAllocation() != null && !result.getAllocation().isEmpty()) {
                sb.append("=== ALLOCATION BY ASSET CLASS ===\n");
                for (AllocationEntry a : result.getAllocation()) {
                    sb.append(String.format("%-20s SGD %10.0f  (%.1f%%)\n",
                        a.getAssetClass(), a.getValueSgd(), a.getWeight() * 100));
                }
                sb.append("\n");
            }

            if (result.getRecommendations() != null && !result.getRecommendations().isEmpty()) {
                sb.append("=== SYSTEM-GENERATED RECOMMENDATIONS ===\n");
                for (Recommendation rec : result.getRecommendations()) {
                    sb.append("- ").append(rec.getAction()).append(": ").append(rec.getWhy()).append("\n");
                }
                sb.append("\n");
            }

            if (result.getAlerts() != null && !result.getAlerts().isEmpty()) {
                sb.append("=== ACTIVE ALERTS ===\n");
                for (String alert : result.getAlerts()) {
                    sb.append("! ").append(alert).append("\n");
                }
                sb.append("\n");
            }
        }

        if (assets != null && !assets.isEmpty()) {
            sb.append("=== INDIVIDUAL HOLDINGS ===\n");
            for (Asset a : assets) {
                sb.append(String.format("%-30s %-15s SGD %10.0f  liquidity=%.0fd  risk=%s\n",
                    a.getAssetName(), a.getAssetClass(), a.getValueSgd(),
                    a.getLiquidityDays(), a.getRiskTag()));
            }
        }

        return sb.toString();
    }
}
