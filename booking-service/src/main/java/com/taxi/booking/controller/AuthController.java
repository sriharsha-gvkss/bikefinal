package com.taxi.booking.controller;

import com.taxi.booking.model.User;
import com.taxi.booking.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    
    @Autowired
    private AuthService authService;
    
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String email = request.get("email");
        String password = request.get("password");
        String roleStr = request.get("role");
        String phoneNumber = request.get("phoneNumber");
        String vehicleType = request.get("vehicleType");
        String licenseNumber = request.get("licenseNumber");
        
        if (username == null || email == null || password == null || roleStr == null || phoneNumber == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "All fields are required"
            ));
        }
        
        User.UserRole role;
        try {
            role = User.UserRole.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid role. Must be RIDER, DRIVER, or ADMIN"
            ));
        }
        
        Map<String, Object> result = authService.register(
            username, email, password, role, phoneNumber,
            role == User.UserRole.DRIVER ? vehicleType : null,
            role == User.UserRole.DRIVER ? licenseNumber : null
        );
        
        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }
    
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");
        
        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Username and password are required"
            ));
        }
        
        Map<String, Object> result = authService.login(username, password);
        
        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }
    
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(@RequestHeader("Authorization") String sessionToken) {
        if (sessionToken == null || !sessionToken.startsWith("Bearer ")) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid session token"
            ));
        }
        
        String token = sessionToken.substring(7); // Remove "Bearer " prefix
        Map<String, Object> result = authService.logout(token);
        
        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }
    
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(@RequestHeader("Authorization") String sessionToken) {
        if (sessionToken == null || !sessionToken.startsWith("Bearer ")) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid session token"
            ));
        }
        
        String token = sessionToken.substring(7);
        User user = authService.getCurrentUser(token);
        
        if (user != null) {
            return ResponseEntity.ok(Map.of(
                "success", true,
                "user", Map.of(
                    "id", user.getId(),
                    "username", user.getUsername(),
                    "email", user.getEmail(),
                    "role", user.getRole()
                )
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid session"
            ));
        }
    }
} 