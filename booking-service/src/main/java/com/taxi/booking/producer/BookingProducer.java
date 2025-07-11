package com.taxi.booking.producer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taxi.booking.model.Booking;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class BookingProducer {
    
    private static final Logger log = LoggerFactory.getLogger(BookingProducer.class);
    
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    
    // Default constructor for Spring
    public BookingProducer() {
        this.kafkaTemplate = null;
        this.objectMapper = new ObjectMapper();
        log.info("BookingProducer initialized without Kafka support");
    }
    
    @Autowired(required = false)
    public BookingProducer(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        log.info("BookingProducer initialized with Kafka support: {}", kafkaTemplate != null);
    }
    
    public void sendBookingEvent(Booking booking) {
        try {
            String json = objectMapper.writeValueAsString(booking);
            
            if (kafkaTemplate != null) {
                kafkaTemplate.send("booking-events", json);
                log.info("Sent booking event to Kafka: {}", json);
            } else {
                log.info("Kafka not available. Booking event logged: {}", json);
            }
        } catch (JsonProcessingException e) {
            log.error("Error serializing booking to JSON", e);
        } catch (Exception e) {
            log.warn("Failed to send to Kafka (this is normal if Kafka is not running): {}", e.getMessage());
            log.info("Booking event processed locally: {}", booking);
        }
    }
    
    public void sendBookingEventWithDetails(Booking booking, double distance, double duration, double price) {
        try {
            // Create enhanced booking event with additional details
            java.util.Map<String, Object> enhancedBooking = new java.util.HashMap<>();
            enhancedBooking.put("id", booking.getId());
            enhancedBooking.put("riderId", booking.getRiderId());
            enhancedBooking.put("pickupLocation", booking.getPickupLocation());
            enhancedBooking.put("destination", booking.getDestination());
            enhancedBooking.put("status", booking.getStatus());
            enhancedBooking.put("createdAt", booking.getCreatedAt());
            enhancedBooking.put("distance", distance);
            enhancedBooking.put("duration", duration);
            enhancedBooking.put("price", price);
            
            String json = objectMapper.writeValueAsString(enhancedBooking);
            
            if (kafkaTemplate != null) {
                kafkaTemplate.send("booking-events", json);
                log.info("Sent enhanced booking event to Kafka: {}", json);
            } else {
                log.info("Kafka not available. Enhanced booking event logged: {}", json);
            }
        } catch (JsonProcessingException e) {
            log.error("Error serializing enhanced booking to JSON", e);
        } catch (Exception e) {
            log.warn("Failed to send enhanced booking to Kafka (this is normal if Kafka is not running): {}", e.getMessage());
            log.info("Enhanced booking event processed locally: {}", booking);
        }
    }
} 