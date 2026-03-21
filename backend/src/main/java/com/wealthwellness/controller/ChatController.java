package com.wealthwellness.controller;

import com.wealthwellness.model.ChatRequest;
import com.wealthwellness.model.ChatResponse;
import com.wealthwellness.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody ChatRequest request) {
        try {
            String reply = chatService.chat(
                request.getMessages(),
                request.getAssets(),
                request.getUserProfile(),
                request.getAnalysisResult()
            );
            return ResponseEntity.ok(new ChatResponse(reply));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
