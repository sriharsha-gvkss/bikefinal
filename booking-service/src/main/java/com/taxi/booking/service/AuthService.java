package com.taxi.booking.service;

import com.taxi.booking.model.User;
import com.taxi.booking.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {
    
    @Autowired
    private UserRepository userRepository;
    
    // Simple in-memory session storage (in production, use Redis or JWT)
    private final Map<String, User> activeSessions = new HashMap<>();
    
    public Map<String, Object> register(String username, String email, String password, User.UserRole role, String phoneNumber, String vehicleTypeStr, String licenseNumber) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Check if user already exists
            if (userRepository.existsByUsername(username)) {
                response.put("success", false);
                response.put("message", "Username already exists");
                return response;
            }
            
            if (userRepository.existsByEmail(email)) {
                response.put("success", false);
                response.put("message", "Email already exists");
                return response;
            }
            
            // Create new user
            User user = new User();
            user.setUsername(username);
            user.setEmail(email);
            user.setPassword(password); // In production, hash the password
            user.setRole(role);
            user.setPhoneNumber(phoneNumber);
            if (role == User.UserRole.DRIVER) {
                if (vehicleTypeStr == null || licenseNumber == null) {
                    response.put("success", false);
                    response.put("message", "Vehicle type and license number are required for drivers");
                    return response;
                }
                try {
                    user.setVehicleType(User.VehicleType.valueOf(vehicleTypeStr.toUpperCase()));
                } catch (IllegalArgumentException e) {
                    response.put("success", false);
                    response.put("message", "Invalid vehicle type");
                    return response;
                }
                user.setLicenseNumber(licenseNumber);
            }
            
            User savedUser = userRepository.save(user);
            
            response.put("success", true);
            response.put("message", "User registered successfully");
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", savedUser.getId());
            userMap.put("username", savedUser.getUsername());
            userMap.put("email", savedUser.getEmail());
            userMap.put("role", savedUser.getRole());
            userMap.put("phoneNumber", savedUser.getPhoneNumber());
            userMap.put("vehicleType", savedUser.getVehicleType());
            userMap.put("licenseNumber", savedUser.getLicenseNumber());
            
            response.put("user", userMap);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Registration failed: " + e.getMessage());
        }
        
        return response;
    }
    
    public Map<String, Object> login(String username, String password) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Optional<User> userOpt = userRepository.findByUsername(username);
            
            if (userOpt.isEmpty()) {
                response.put("success", false);
                response.put("message", "Invalid username or password");
                return response;
            }
            
            User user = userOpt.get();
            
            // In production, use proper password hashing
            if (!user.getPassword().equals(password)) {
                response.put("success", false);
                response.put("message", "Invalid username or password");
                return response;
            }
            
            // Generate session token (in production, use JWT)
            String sessionToken = "session_" + System.currentTimeMillis() + "_" + user.getId();
            activeSessions.put(sessionToken, user);
            
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("sessionToken", sessionToken);
            response.put("user", Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "role", user.getRole()
            ));
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Login failed: " + e.getMessage());
        }
        
        return response;
    }
    
    public Map<String, Object> logout(String sessionToken) {
        Map<String, Object> response = new HashMap<>();
        
        if (activeSessions.remove(sessionToken) != null) {
            response.put("success", true);
            response.put("message", "Logout successful");
        } else {
            response.put("success", false);
            response.put("message", "Invalid session");
        }
        
        return response;
    }
    
    public User getCurrentUser(String sessionToken) {
        return activeSessions.get(sessionToken);
    }
    
    public boolean isAuthenticated(String sessionToken) {
        return activeSessions.containsKey(sessionToken);
    }
} 