package com.taxi.booking.controller;

import com.taxi.booking.model.User;
import com.taxi.booking.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/driver")
@CrossOrigin(origins = "*")
public class DriverController {
    private static final Logger logger = LoggerFactory.getLogger(DriverController.class);
    
    @Autowired
    private UserRepository userRepository;

    @GetMapping("/status")
    public ResponseEntity<?> getDriverStatus(@RequestParam String username) {
        logger.info("Received request to get status for driver: {}", username);
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty() || userOpt.get().getRole() != User.UserRole.DRIVER) {
            logger.warn("Driver not found or user is not a driver: {}", username);
            return ResponseEntity.notFound().build();
        }
        logger.info("Driver status retrieved successfully: {} - {}", username, userOpt.get().getStatus());
        return ResponseEntity.ok().body(
            java.util.Map.of("status", userOpt.get().getStatus())
        );
    }

    @PutMapping("/status")
    public ResponseEntity<?> updateDriverStatus(@RequestParam String username, @RequestParam String status) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty() || userOpt.get().getRole() != User.UserRole.DRIVER) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        try {
            user.setStatus(User.Status.valueOf(status.toUpperCase()));
            userRepository.save(user);
            return ResponseEntity.ok().body(java.util.Map.of("status", user.getStatus()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Invalid status value"));
        }
    }
} 