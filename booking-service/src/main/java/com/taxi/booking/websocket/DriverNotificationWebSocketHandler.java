package com.taxi.booking.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taxi.booking.model.Booking;
import com.taxi.booking.service.BookingService;
import com.taxi.booking.util.LocationUtils;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DriverNotificationWebSocketHandler extends TextWebSocketHandler {
    
    private static final Logger log = LoggerFactory.getLogger(DriverNotificationWebSocketHandler.class);
    
    // Map to store driver sessions: driverId -> WebSocketSession
    private final Map<String, WebSocketSession> driverSessions = new ConcurrentHashMap<>();
    
    private BookingService bookingService;
    
    @Autowired
    public void setBookingService(BookingService bookingService) {
        this.bookingService = bookingService;
    }
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        // Extract driver ID from session attributes or query parameters
        String driverId = extractDriverId(session);
        if (driverId != null) {
            driverSessions.put(driverId, session);
            log.info("Driver {} connected to notification WebSocket", driverId);
        } else {
            log.warn("Driver connection established without driver ID");
        }
    }
    
    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            String payload = message.getPayload();
            log.info("Received message from driver: {}", payload);
            
            // Parse the message to handle accept/reject responses
            Map<String, Object> response = objectMapper.readValue(payload, Map.class);
            String type = (String) response.get("type");
            
            if ("RIDE_RESPONSE".equals(type)) {
                handleRideResponse(response);
            }
            
        } catch (Exception e) {
            log.error("Error handling driver message", e);
        }
    }
    
    private void handleRideResponse(Map<String, Object> response) {
        try {
            String driverId = (String) response.get("driverId");
            Long bookingId = Long.valueOf(response.get("bookingId").toString());
            String action = (String) response.get("action"); // "ACCEPT" or "REJECT"
            
            log.info("Driver {} {} booking {}", driverId, action, bookingId);
            
            if ("ACCEPT".equals(action)) {
                // Update booking status to ACCEPTED and assign driver
                bookingService.assignDriver(bookingId, driverId);
                
                // Send confirmation to driver
                sendToDriver(driverId, Map.of(
                    "type", "RIDE_ACCEPTED",
                    "bookingId", bookingId,
                    "message", "Ride accepted successfully!"
                ));
                
                // Notify rider that driver accepted
                notifyRider(bookingId, "ACCEPTED", driverId);
                
            } else if ("REJECT".equals(action)) {
                // Update booking status to REJECTED
                bookingService.updateBookingStatus(bookingId, "REJECTED");
                
                // Send confirmation to driver
                sendToDriver(driverId, Map.of(
                    "type", "RIDE_REJECTED",
                    "bookingId", bookingId,
                    "message", "Ride rejected"
                ));
                
                // Notify rider that driver rejected
                notifyRider(bookingId, "REJECTED", driverId);
            }
            
        } catch (Exception e) {
            log.error("Error handling ride response", e);
        }
    }
    
    public void sendRideRequestToDriver(String driverId, Booking booking, double distance, double duration, double price) {
        try {
            log.info("📱 Sending ride request to driver {} for booking {}", driverId, booking.getId());
            
            // Convert coordinates to readable location names
            String pickupLocationName = LocationUtils.getLocationName(booking.getPickupLocation());
            String destinationLocationName = LocationUtils.getLocationName(booking.getDestination());
            
            Map<String, Object> notification = Map.of(
                "type", "RIDE_REQUEST",
                "bookingId", booking.getId(),
                "pickupLocation", pickupLocationName,
                "destinationLocation", destinationLocationName,
                "pickupCoordinates", booking.getPickupLocation(), // Keep original coordinates for reference
                "destinationCoordinates", booking.getDestination(), // Keep original coordinates for reference
                "distance", String.format("%.1f km", distance),
                "duration", String.format("%.0f min", duration),
                "price", String.format("₹%.0f", price),
                "riderName", booking.getRiderId(),
                "timestamp", System.currentTimeMillis()
            );
            
            sendToDriver(driverId, notification);
            log.info("✅ Successfully sent ride request to driver {} for booking {} - Pickup: {}, Destination: {}", 
                    driverId, booking.getId(), pickupLocationName, destinationLocationName);
            
        } catch (Exception e) {
            log.error("❌ Error sending ride request to driver {} for booking {}", driverId, booking.getId(), e);
        }
    }
    
    public void sendToDriver(String driverId, Map<String, Object> message) {
        WebSocketSession session = driverSessions.get(driverId);
        if (session != null && session.isOpen()) {
            try {
                String json = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(json));
                log.debug("📤 Message sent to driver {}: {}", driverId, json);
            } catch (IOException e) {
                log.error("❌ Error sending message to driver {}", driverId, e);
                driverSessions.remove(driverId);
            }
        } else {
            log.warn("⚠️ Driver {} not connected to WebSocket - cannot send notification", driverId);
        }
    }
    
    private void notifyRider(Long bookingId, String status, String driverId) {
        // This would typically send a notification to the rider
        // For now, we'll just log it
        log.info("Rider notification: Booking {} {} by driver {}", bookingId, status, driverId);
    }
    
    private String extractDriverId(WebSocketSession session) {
        // Try to get driver ID from query parameters
        String query = session.getUri().getQuery();
        if (query != null && query.contains("driverId=")) {
            return query.split("driverId=")[1].split("&")[0];
        }
        
        // Try to get from session attributes
        return (String) session.getAttributes().get("driverId");
    }
    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        driverSessions.entrySet().removeIf(entry -> entry.getValue().equals(session));
        log.info("Driver WebSocket connection closed: {}", session.getId());
    }
    
    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("Driver WebSocket transport error for session: {}", session.getId(), exception);
    }
    
    public boolean isDriverConnected(String driverId) {
        WebSocketSession session = driverSessions.get(driverId);
        return session != null && session.isOpen();
    }
    
    /**
     * Get list of connected driver IDs
     */
    public List<String> getConnectedDrivers() {
        return List.copyOf(driverSessions.keySet());
    }
} 