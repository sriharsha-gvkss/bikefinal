package com.taxi.booking.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taxi.booking.service.GeoMatchingService;
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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DriverWebSocketHandler extends TextWebSocketHandler {
    
    private static final Logger log = LoggerFactory.getLogger(DriverWebSocketHandler.class);
    
    // Map to store driver sessions: driverId -> WebSocketSession
    private final Map<String, WebSocketSession> driverSessions = new ConcurrentHashMap<>();
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private GeoMatchingService geoMatchingService;
    
    @Autowired
    private DriverNotificationWebSocketHandler driverNotificationWebSocketHandler;
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        // Extract driver ID from the URI path
        String driverId = extractDriverId(session);
        if (driverId != null) {
            driverSessions.put(driverId, session);
            log.info("Driver {} connected to WebSocket", driverId);
            
            // Send welcome message
            sendToDriver(driverId, Map.of(
                "type", "CONNECTION_ESTABLISHED",
                "driverId", driverId,
                "message", "WebSocket connection established"
            ));
        } else {
            log.warn("Driver connection established without driver ID");
        }
    }
    
    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            String payload = message.getPayload();
            log.info("Received message from driver: {}", payload);
            
            // Parse the message
            Map<String, Object> data = objectMapper.readValue(payload, Map.class);
            String type = (String) data.get("type");
            String driverId = (String) data.get("driverId");
            
            switch (type) {
                case "DRIVER_REGISTER":
                    handleDriverRegistration(driverId, data);
                    break;
                case "DRIVER_LOCATION":
                    handleDriverLocation(driverId, data);
                    break;
                case "DRIVER_STATUS":
                    handleDriverStatus(driverId, data);
                    break;
                case "BOOKING_RESPONSE":
                    handleBookingResponse(driverId, data);
                    break;
                case "TRIP_COMPLETED":
                    handleTripCompleted(driverId, data);
                    break;
                default:
                    log.warn("Unknown message type: {}", type);
            }
            
        } catch (Exception e) {
            log.error("Error handling driver message", e);
        }
    }
    
    private void handleDriverRegistration(String driverId, Map<String, Object> data) {
        log.info("Driver {} registered", driverId);
        sendToDriver(driverId, Map.of(
            "type", "REGISTRATION_CONFIRMED",
            "driverId", driverId,
            "message", "Driver registration confirmed"
        ));
    }
    
    private void handleDriverLocation(String driverId, Map<String, Object> data) {
        try {
            Map<String, Object> location = (Map<String, Object>) data.get("location");
            double lat = Double.parseDouble(location.get("latitude").toString());
            double lng = Double.parseDouble(location.get("longitude").toString());
            
            // Update driver location in the geo matching service
            geoMatchingService.updateDriverLocation(new com.taxi.booking.model.DriverLocation(driverId, lat, lng));
            
            log.debug("Updated driver {} location: lat={}, lng={}", driverId, lat, lng);
            
        } catch (Exception e) {
            log.error("Error updating driver location for driver {}", driverId, e);
        }
    }
    
    private void handleDriverStatus(String driverId, Map<String, Object> data) {
        String status = (String) data.get("status");
        log.info("Driver {} status updated to: {}", driverId, status);
        
        // You can add logic here to update driver status in the database
        // For now, just log it
    }
    
    private void handleBookingResponse(String driverId, Map<String, Object> data) {
        // Forward to the notification handler
        driverNotificationWebSocketHandler.handleRideResponse(data);
    }
    
    private void handleTripCompleted(String driverId, Map<String, Object> data) {
        Long bookingId = Long.valueOf(data.get("bookingId").toString());
        log.info("Driver {} completed trip for booking {}", driverId, bookingId);
        
        // You can add logic here to update booking status
        // For now, just log it
    }
    
    public void sendToDriver(String driverId, Map<String, Object> message) {
        WebSocketSession session = driverSessions.get(driverId);
        if (session != null && session.isOpen()) {
            try {
                String json = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(json));
                log.debug("Message sent to driver {}: {}", driverId, json);
            } catch (IOException e) {
                log.error("Error sending message to driver {}", driverId, e);
                driverSessions.remove(driverId);
            }
        } else {
            log.warn("Driver {} not connected to WebSocket - cannot send message", driverId);
        }
    }
    
    private String extractDriverId(WebSocketSession session) {
        String path = session.getUri().getPath();
        // Extract driver ID from path like /ws/driver/{driverId}
        if (path.startsWith("/ws/driver/")) {
            return path.substring("/ws/driver/".length());
        }
        return null;
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
} 