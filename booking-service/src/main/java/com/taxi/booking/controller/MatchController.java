package com.taxi.booking.controller;

import com.taxi.booking.model.DriverLocation;
import com.taxi.booking.service.GeoMatchingService;
import com.taxi.booking.consumer.BookingConsumer;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/match")
@CrossOrigin(origins = "*")
public class MatchController {
    
    private static final Logger log = LoggerFactory.getLogger(MatchController.class);
    
    private final GeoMatchingService geoMatchingService;
    private final BookingConsumer bookingConsumer;
    
    @Autowired
    private ApplicationContext applicationContext;

    public MatchController(GeoMatchingService geoMatchingService, @Autowired(required = false) BookingConsumer bookingConsumer) {
        this.geoMatchingService = geoMatchingService;
        this.bookingConsumer = bookingConsumer;
    }
    
    @GetMapping("/nearest")
    public ResponseEntity<DriverLocation> findNearestDriver(
            @RequestParam double lat,
            @RequestParam double lng) {
        
        log.info("Finding nearest driver for lat={}, lng={}", lat, lng);
        
        Optional<DriverLocation> nearestDriver = geoMatchingService.findNearestDriver(lat, lng);
        
        return nearestDriver
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/nearby")
    public ResponseEntity<List<DriverLocation>> findNearbyDrivers(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "10") int maxDistance) {
        
        log.info("Finding nearby drivers for lat={}, lng={}, maxDistance={}km", lat, lng, maxDistance);
        
        List<DriverLocation> nearbyDrivers = geoMatchingService.findNearbyDrivers(lat, lng, maxDistance);
        
        return ResponseEntity.ok(nearbyDrivers);
    }
    
    @GetMapping("/drivers")
    public ResponseEntity<List<DriverLocation>> getAllDrivers() {
        List<DriverLocation> allDrivers = geoMatchingService.getAllDrivers();
        return ResponseEntity.ok(allDrivers);
    }
    
    @PostMapping("/driver-location")
    public ResponseEntity<String> updateDriverLocation(@RequestBody DriverLocation location) {
        geoMatchingService.updateDriverLocation(location);
        return ResponseEntity.ok("Driver location updated");
    }
    
    @PostMapping("/process-booking")
    public ResponseEntity<String> processBooking(@RequestBody Map<String, Object> booking) {
        log.info("Manually processing booking: {}", booking);
        
        try {
            if (bookingConsumer != null) {
                // Convert booking to JSON string for the consumer
                com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
                String bookingJson = objectMapper.writeValueAsString(booking);
                
                // Process the booking
                bookingConsumer.handleBookingEvent(bookingJson);
                
                return ResponseEntity.ok("Booking processed successfully");
            } else {
                log.warn("BookingConsumer not available (Kafka disabled). Processing booking locally.");
                // Handle booking processing without Kafka
                return ResponseEntity.ok("Booking processed locally (Kafka disabled)");
            }
        } catch (Exception e) {
            log.error("Error processing booking", e);
            return ResponseEntity.internalServerError().body("Error processing booking: " + e.getMessage());
        }
    }
    
    @GetMapping("/available-drivers")
    public ResponseEntity<Map<String, Object>> getAvailableDrivers() {
        try {
            var driverNotificationService = applicationContext.getBean(com.taxi.booking.service.DriverNotificationService.class);
            List<String> availableDrivers = driverNotificationService.getAvailableDrivers();
            
            Map<String, Object> response = Map.of(
                "availableDrivers", availableDrivers,
                "count", availableDrivers.size(),
                "timestamp", System.currentTimeMillis()
            );
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting available drivers", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/test-notification")
    public ResponseEntity<String> sendTestNotification(@RequestBody Map<String, Object> request) {
        try {
            String driverId = (String) request.get("driverId");
            String message = (String) request.get("message");
            
            if (driverId == null || message == null) {
                return ResponseEntity.badRequest().body("driverId and message are required");
            }
            
            var driverNotificationWebSocketHandler = applicationContext.getBean(com.taxi.booking.websocket.DriverNotificationWebSocketHandler.class);
            
            Map<String, Object> testNotification = Map.of(
                "type", "TEST_NOTIFICATION",
                "message", message,
                "timestamp", System.currentTimeMillis()
            );
            
            driverNotificationWebSocketHandler.sendToDriver(driverId, testNotification);
            
            return ResponseEntity.ok("Test notification sent to driver " + driverId);
        } catch (Exception e) {
            log.error("Error sending test notification", e);
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
} 