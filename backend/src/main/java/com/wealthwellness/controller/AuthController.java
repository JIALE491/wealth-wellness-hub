package com.wealthwellness.controller;

import com.wealthwellness.model.*;
import com.wealthwellness.repository.UserRepository;
import com.wealthwellness.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private AuthenticationManager authManager;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        if (req.getEmail() == null || req.getPassword() == null || req.getPassword().length() < 6)
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password (min 6 chars) are required."));

        if (userRepository.findByEmail(req.getEmail().toLowerCase()).isPresent())
            return ResponseEntity.badRequest().body(Map.of("error", "An account with this email already exists."));

        User user = new User();
        user.setEmail(req.getEmail().toLowerCase().trim());
        user.setName(req.getName() != null ? req.getName().trim() : "");
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), user.getName()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        try {
            authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail().toLowerCase().trim(), req.getPassword())
            );
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password."));
        }
        User user = userRepository.findByEmail(req.getEmail().toLowerCase()).orElseThrow();
        String token = jwtUtil.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), user.getName()));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(Map.of(
            "email", user.getEmail(),
            "name",  user.getName() != null ? user.getName() : ""
        ));
    }
}
