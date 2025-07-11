package com.taxi.booking.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
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
public class RiderNotificationWebSocketHandler extends TextWebSocketHandler {
    
    private static final Logger log = LoggerFactory.getLogger(RiderNotificationWebSocketHandler.class);
    
    // Map to store rider sessions: riderId -> WebSocketSession
    private final Map<String, WebSocketSession> riderSessions = new ConcurrentHashMap<>();
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        // Extract rider ID from session attributes or query parameters
        String riderId = extractRiderId(session);
        if (riderId != null) {
            riderSessions.put(riderId, session);
            log.info("Rider {} connected to notification WebSocket", riderId);
        } else {
            log.warn("Rider connection established without rider ID");
        }
    }
    
    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            String payload = message.getPayload();
            log.info("Received message from rider: {}", payload);
            
            // Parse the message to handle authentication
            Map<String, Object> response = objectMapper.readValue(payload, Map.class);
            String type = (String) response.get("type");
            
            if ("AUTH".equals(type)) {
                String riderId = (String) response.get("riderId");
                if (riderId != null) {
                    riderSessions.put(riderId, session);
                    log.info("Rider {} authenticated via WebSocket", riderId);
                }
            }
            
        } catch (Exception e) {
            log.error("Error handling rider message", e);
        }
    }
    
    public void notifyRider(String riderId, Map<String, Object> message) {
        WebSocketSession session = riderSessions.get(riderId);
        if (session != null && session.isOpen()) {
            try {
                String json = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(json));
                log.debug("📤 Message sent to rider {}: {}", riderId, json);
            } catch (IOException e) {
                log.error("❌ Error sending message to rider {}", riderId, e);
                riderSessions.remove(riderId);
            }
        } else {
            log.warn("⚠️ Rider {} not connected to WebSocket - cannot send notification", riderId);
        }
    }
    
    private String extractRiderId(WebSocketSession session) {
        // Try to get rider ID from query parameters
        String query = session.getUri().getQuery();
        if (query != null && query.contains("riderId=")) {
            return query.split("riderId=")[1].split("&")[0];
        }
        
        // Try to get from session attributes
        return (String) session.getAttributes().get("riderId");
    }
    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        riderSessions.entrySet().removeIf(entry -> entry.getValue().equals(session));
        log.info("Rider WebSocket connection closed: {}", session.getId());
    }
    
    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("Rider WebSocket transport error for session: {}", session.getId(), exception);
    }
    
    public boolean isRiderConnected(String riderId) {
        WebSocketSession session = riderSessions.get(riderId);
        return session != null && session.isOpen();
    }
} 