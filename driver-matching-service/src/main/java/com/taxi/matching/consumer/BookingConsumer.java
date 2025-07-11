package com.taxi.matching.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taxi.matching.service.GeoMatchingService;
import com.taxi.matching.model.DriverLocation;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.List;

@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class BookingConsumer {
    
    private static final Logger log = LoggerFactory.getLogger(BookingConsumer.class);
    
    private final GeoMatchingService geoMatchingService;
    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public BookingConsumer(GeoMatchingService geoMatchingService, ObjectMapper objectMapper, @Autowired(required = false) KafkaTemplate<String, String> kafkaTemplate) {
        this.geoMatchingService = geoMatchingService;
        this.objectMapper = objectMapper;
        this.kafkaTemplate = kafkaTemplate;
        log.info("BookingConsumer initialized with Kafka support: {}", kafkaTemplate != null);
    }
    
    // Manual method to handle booking events (can be called from REST endpoints)
    public void handleBookingEvent(String bookingJson) {
        try {
            log.info("Received booking event: {}", bookingJson);
            
            // Parse booking JSON
            Map<String, Object> booking = objectMapper.readValue(bookingJson, Map.class);
            
            // Extract pickup location
            String pickupLocation = (String) booking.get("pickupLocation");
            String[] coords = pickupLocation.split(",");
            double lat = Double.parseDouble(coords[0]);
            double lng = Double.parseDouble(coords[1]);
            
            // First try to find nearest driver within reasonable distance
            var nearestDriver = geoMatchingService.findNearestDriver(lat, lng);
            
            if (nearestDriver.isPresent()) {
                log.info("Found nearest driver {} for booking {}", 
                        nearestDriver.get().getDriverId(), booking.get("id"));
                assignDriverToBooking(booking, nearestDriver.get().getDriverId());
            } else {
                // If no nearby driver, assign any available driver
                List<DriverLocation> allDrivers = geoMatchingService.getAllDrivers();
                if (!allDrivers.isEmpty()) {
                    // Assign the first available driver
                    String assignedDriverId = allDrivers.get(0).getDriverId();
                    log.info("No nearby drivers found. Assigning available driver {} to booking {}", 
                            assignedDriverId, booking.get("id"));
                    assignDriverToBooking(booking, assignedDriverId);
                } else {
                    log.warn("No drivers available for booking {}. Creating a demo driver assignment.", booking.get("id"));
                    // Create a demo driver assignment for testing purposes
                    assignDriverToBooking(booking, "demo-driver");
                }
            }
            
        } catch (Exception e) {
            log.error("Error processing booking event", e);
        }
    }
    
    private void assignDriverToBooking(Map<String, Object> booking, String driverId) {
        try {
            // Create driver assignment event with additional booking details
            Map<String, Object> assignment = Map.of(
                "bookingId", booking.get("id"),
                "driverId", driverId,
                "status", "ASSIGNED",
                "timestamp", System.currentTimeMillis(),
                "distance", booking.get("distance") != null ? booking.get("distance") : 5.0,
                "duration", booking.get("duration") != null ? booking.get("duration") : 10.0,
                "price", booking.get("price") != null ? booking.get("price") : 100.0
            );
            
            String assignmentJson = objectMapper.writeValueAsString(assignment);
            
            // Send to driver-assignment topic if Kafka is available
            if (kafkaTemplate != null) {
                kafkaTemplate.send("driver-assignments", assignmentJson);
                log.info("Sent driver assignment: {}", assignmentJson);
            } else {
                log.info("Kafka not available. Driver assignment logged: {}", assignmentJson);
            }
            
        } catch (Exception e) {
            log.error("Error creating driver assignment", e);
        }
    }
} 