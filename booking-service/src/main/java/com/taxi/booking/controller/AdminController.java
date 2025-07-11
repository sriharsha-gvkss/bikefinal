package com.taxi.booking.controller;

import com.taxi.booking.model.Booking;
import com.taxi.booking.model.User;
import com.taxi.booking.repository.BookingRepository;
import com.taxi.booking.repository.UserRepository;
import com.taxi.booking.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {
    
    private static final Logger log = LoggerFactory.getLogger(AdminController.class);
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private BookingRepository bookingRepository;
    
    @Autowired
    private AuthService authService;
    
    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers(@RequestHeader("Authorization") String sessionToken) {
        try {
            // Verify admin access
            User adminUser = getAdminUser(sessionToken);
            if (adminUser == null) {
                return ResponseEntity.status(401).build();
            }
            
            List<User> users = userRepository.findByRole(User.UserRole.RIDER);
            List<Map<String, Object>> userList = users.stream()
                .map(user -> {
                    Map<String, Object> userMap = new HashMap<>();
                    userMap.put("id", user.getId());
                    userMap.put("username", user.getUsername());
                    userMap.put("email", user.getEmail());
                    userMap.put("role", user.getRole());
                    userMap.put("phoneNumber", user.getPhoneNumber());
                    // Map ONLINE/OFFLINE to ACTIVE/INACTIVE for frontend
                    String displayStatus = user.getStatus() == User.Status.ONLINE ? "ACTIVE" : "INACTIVE";
                    userMap.put("status", displayStatus);
                    userMap.put("createdAt", user.getCreatedAt());
                    userMap.put("vehicleType", user.getVehicleType());
                    userMap.put("licenseNumber", user.getLicenseNumber());
                    return userMap;
                })
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(userList);
        } catch (Exception e) {
            log.error("Error fetching users", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/drivers")
    public ResponseEntity<List<Map<String, Object>>> getAllDrivers(@RequestHeader("Authorization") String sessionToken) {
        try {
            // Verify admin access
            User adminUser = getAdminUser(sessionToken);
            if (adminUser == null) {
                return ResponseEntity.status(401).build();
            }
            
            List<User> drivers = userRepository.findByRole(User.UserRole.DRIVER);
            List<Map<String, Object>> driverList = drivers.stream()
                .map(driver -> {
                    Map<String, Object> driverMap = new HashMap<>();
                    driverMap.put("id", driver.getId());
                    driverMap.put("username", driver.getUsername());
                    driverMap.put("email", driver.getEmail());
                    driverMap.put("phoneNumber", driver.getPhoneNumber());
                    // Map ONLINE/OFFLINE to AVAILABLE/BUSY for frontend
                    String displayStatus = driver.getStatus() == User.Status.ONLINE ? "AVAILABLE" : "BUSY";
                    driverMap.put("status", displayStatus);
                    // Add accountStatus field that frontend expects
                    String accountStatus = driver.getStatus() == User.Status.ONLINE ? "ACTIVE" : "INACTIVE";
                    driverMap.put("accountStatus", accountStatus);
                    driverMap.put("vehicleType", driver.getVehicleType());
                    driverMap.put("licenseNumber", driver.getLicenseNumber());
                    driverMap.put("createdAt", driver.getCreatedAt());
                    return driverMap;
                })
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(driverList);
        } catch (Exception e) {
            log.error("Error fetching drivers", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/bookings")
    public ResponseEntity<List<Map<String, Object>>> getAllBookings(@RequestHeader("Authorization") String sessionToken) {
        try {
            // Verify admin access
            User adminUser = getAdminUser(sessionToken);
            if (adminUser == null) {
                return ResponseEntity.status(401).build();
            }
            
            List<Booking> bookings = bookingRepository.findAll();
            List<Map<String, Object>> bookingList = bookings.stream()
                .map(booking -> {
                    Map<String, Object> bookingMap = new HashMap<>();
                    bookingMap.put("id", booking.getId());
                    bookingMap.put("riderId", booking.getRiderId());
                    bookingMap.put("driverId", booking.getDriverId());
                    bookingMap.put("pickupLocation", booking.getPickupLocation());
                    bookingMap.put("destination", booking.getDestination());
                    bookingMap.put("status", booking.getStatus());
                    bookingMap.put("price", booking.getPrice());
                    bookingMap.put("distance", booking.getDistance());
                    bookingMap.put("vehicleType", booking.getVehicleType());
                    bookingMap.put("createdAt", booking.getCreatedAt());
                    return bookingMap;
                })
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(bookingList);
        } catch (Exception e) {
            log.error("Error fetching bookings", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(@RequestHeader("Authorization") String sessionToken) {
        try {
            // Verify admin access
            User adminUser = getAdminUser(sessionToken);
            if (adminUser == null) {
                return ResponseEntity.status(401).build();
            }
            
            Map<String, Object> stats = new HashMap<>();
            
            // Total users
            long totalUsers = userRepository.count();
            stats.put("totalUsers", totalUsers);
            
            // Total drivers
            long totalDrivers = userRepository.countByRole(User.UserRole.DRIVER);
            stats.put("totalDrivers", totalDrivers);
            
            // Active drivers (online)
            long activeDrivers = userRepository.countByRoleAndStatus(User.UserRole.DRIVER, User.Status.ONLINE);
            stats.put("activeDrivers", activeDrivers);
            
            // Total riders
            long totalRiders = userRepository.countByRole(User.UserRole.RIDER);
            stats.put("totalRiders", totalRiders);
            
            // Total bookings
            long totalBookings = bookingRepository.count();
            stats.put("totalBookings", totalBookings);
            
            // Today's bookings
            LocalDateTime today = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
            long todayBookings = bookingRepository.countByCreatedAtAfter(today);
            stats.put("todayBookings", todayBookings);
            
            // Completed bookings
            long completedBookings = bookingRepository.countByStatus("COMPLETED");
            stats.put("completedBookings", completedBookings);
            
            // Pending bookings
            long pendingBookings = bookingRepository.countByStatus("REQUESTED");
            stats.put("pendingBookings", pendingBookings);
            
            // Total revenue (sum of all completed booking prices)
            Double totalRevenue = bookingRepository.sumPriceByStatus("COMPLETED");
            stats.put("totalRevenue", totalRevenue != null ? totalRevenue : 0.0);
            
            // System status
            stats.put("systemStatus", "OPERATIONAL");
            stats.put("lastUpdated", LocalDateTime.now());
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Error fetching stats", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PutMapping("/users/{userId}/status")
    public ResponseEntity<Map<String, Object>> updateUserStatus(
            @PathVariable Long userId,
            @RequestBody Map<String, String> request,
            @RequestHeader("Authorization") String sessionToken) {
        try {
            // Verify admin access
            User adminUser = getAdminUser(sessionToken);
            if (adminUser == null) {
                return ResponseEntity.status(401).build();
            }
            
            String newStatus = request.get("status");
            if (newStatus == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Status is required"));
            }
            
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.notFound().build();
            }
            
            try {
                // Map ACTIVE/INACTIVE to ONLINE/OFFLINE
                User.Status status;
                if ("ACTIVE".equalsIgnoreCase(newStatus)) {
                    status = User.Status.ONLINE;
                } else if ("INACTIVE".equalsIgnoreCase(newStatus)) {
                    status = User.Status.OFFLINE;
                } else {
                    status = User.Status.valueOf(newStatus.toUpperCase());
                }
                user.setStatus(status);
                userRepository.save(user);
                
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "User status updated successfully",
                    "userId", userId,
                    "newStatus", user.getStatus()
                ));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid status value"));
            }
        } catch (Exception e) {
            log.error("Error updating user status", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PutMapping("/drivers/{driverId}/status")
    public ResponseEntity<Map<String, Object>> updateDriverStatus(
            @PathVariable Long driverId,
            @RequestBody Map<String, String> request,
            @RequestHeader("Authorization") String sessionToken) {
        try {
            // Verify admin access
            User adminUser = getAdminUser(sessionToken);
            if (adminUser == null) {
                return ResponseEntity.status(401).build();
            }
            
            String newStatus = request.get("status");
            if (newStatus == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Status is required"));
            }
            
            User driver = userRepository.findById(driverId).orElse(null);
            if (driver == null || driver.getRole() != User.UserRole.DRIVER) {
                return ResponseEntity.notFound().build();
            }
            
            try {
                // Map ACTIVE/INACTIVE to ONLINE/OFFLINE
                User.Status status;
                if ("ACTIVE".equalsIgnoreCase(newStatus)) {
                    status = User.Status.ONLINE;
                } else if ("INACTIVE".equalsIgnoreCase(newStatus)) {
                    status = User.Status.OFFLINE;
                } else {
                    status = User.Status.valueOf(newStatus.toUpperCase());
                }
                driver.setStatus(status);
                userRepository.save(driver);
                
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Driver status updated successfully",
                    "driverId", driverId,
                    "newStatus", driver.getStatus()
                ));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid status value"));
            }
        } catch (Exception e) {
            log.error("Error updating driver status", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    private User getAdminUser(String sessionToken) {
        if (sessionToken == null || !sessionToken.startsWith("Bearer ")) {
            return null;
        }
        
        String token = sessionToken.substring(7); // Remove "Bearer " prefix
        User user = authService.getCurrentUser(token);
        
        if (user != null && user.getRole() == User.UserRole.ADMIN) {
            return user;
        }
        
        return null;
    }
} 