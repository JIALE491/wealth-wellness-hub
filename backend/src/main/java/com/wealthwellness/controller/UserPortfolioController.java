package com.wealthwellness.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wealthwellness.model.*;
import com.wealthwellness.repository.UserPortfolioRepository;
import com.wealthwellness.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user/portfolios")
public class UserPortfolioController {

    @Autowired private UserPortfolioRepository portfolioRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<?> list(Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(
            portfolioRepository.findByUserOrderBySavedAtDesc(user).stream().map(p -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("name", p.getName());
                m.put("savedAt", p.getSavedAt().toString());
                try { m.put("assets", objectMapper.readValue(p.getAssetsJson(), Object.class)); }
                catch (Exception e) { m.put("assets", List.of()); }
                return m;
            }).collect(Collectors.toList())
        );
    }

    @PostMapping
    public ResponseEntity<?> save(@RequestBody SavePortfolioRequest req, Principal principal) {
        if (req.getName() == null || req.getName().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Portfolio name is required."));

        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        UserPortfolio portfolio = portfolioRepository.findByUserAndName(user, req.getName())
                .orElse(new UserPortfolio());
        portfolio.setUser(user);
        portfolio.setName(req.getName().trim());
        portfolio.setSavedAt(LocalDateTime.now());
        try {
            portfolio.setAssetsJson(objectMapper.writeValueAsString(req.getAssets()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to serialize assets."));
        }
        portfolioRepository.save(portfolio);
        return ResponseEntity.ok(Map.of("saved", true, "name", portfolio.getName(), "savedAt", portfolio.getSavedAt().toString()));
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<?> delete(@PathVariable String name, Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        portfolioRepository.findByUserAndName(user, name)
                .ifPresent(portfolioRepository::delete);
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}
