package com.taxi.booking.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taxi.booking.model.Booking;
import com.taxi.booking.repository.BookingRepository;
import com.taxi.booking.service.DriverNotificationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class DriverAssignmentConsumer {
    
    private static final Logger log = LoggerFactory.getLogger(DriverAssignmentConsumer.class);
    
    private final BookingRepository bookingRepository;
    private final ObjectMapper objectMapper;
    private final DriverNotificationService driverNotificationService;

    public DriverAssignmentConsumer(BookingRepository bookingRepository, ObjectMapper objectMapper, DriverNotificationService driverNotificationService) {
        this.bookingRepository = bookingRepository;
        this.objectMapper = objectMapper;
        this.driverNotificationService = driverNotificationService;
    }
    
    @KafkaListener(topics = "driver-assignments", groupId = "booking-service")
    public void handleDriverAssignment(String assignmentJson) {
        try {
            log.info("Received driver assignment: {}", assignmentJson);
            
            // Parse assignment JSON
            Map<String, Object> assignment = objectMapper.readValue(assignmentJson, Map.class);
            
            Long bookingId = Long.valueOf(assignment.get("bookingId").toString());
            String driverId = (String) assignment.get("driverId");
            String status = (String) assignment.get("status");
            
            // Find and update the booking
            bookingRepository.findById(bookingId).ifPresent(booking -> {
                booking.setDriverId(driverId);
                booking.setStatus(status);
                booking.setDriverAssignmentStatus("PENDING");
                bookingRepository.save(booking);
                log.info("Updated booking {} with driver {} and status {}", 
                        bookingId, driverId, status);
                
                // Send notification to the assigned driver
                try {
                    // Extract distance, duration, and price from assignment if available
                    Double distance = assignment.get("distance") != null ? 
                        Double.valueOf(assignment.get("distance").toString()) : 5.0;
                    Double duration = assignment.get("duration") != null ? 
                        Double.valueOf(assignment.get("duration").toString()) : 10.0;
                    Double price = assignment.get("price") != null ? 
                        Double.valueOf(assignment.get("price").toString()) : 100.0;
                    
                    driverNotificationService.sendRideRequestToDriver(driverId, booking, distance, duration, price);
                    log.info("Sent notification to driver {} for booking {}", driverId, bookingId);
                } catch (Exception e) {
                    log.error("Error sending notification to driver {} for booking {}", driverId, bookingId, e);
                }
            }); 
                
            
        } catch (Exception e) {
            log.error("Error processing driver assignment", e);
        }
    }
} 