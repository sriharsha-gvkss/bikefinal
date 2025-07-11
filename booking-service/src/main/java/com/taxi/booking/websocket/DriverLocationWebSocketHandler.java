package com.taxi.booking.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taxi.booking.model.DriverLocation;
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
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class DriverLocationWebSocketHandler extends TextWebSocketHandler {
    
    private static final Logger log = LoggerFactory.getLogger(DriverLocationWebSocketHandler.class);
    
    private final List<WebSocketSession> sessions = new CopyOnWriteArrayList<>();
    
    @Autowired
    private GeoMatchingService geoMatchingService;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        log.info("WebSocket connection established: {}", session.getId());
    }
    
    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            String payload = message.getPayload();
            log.info("Received driver location: {}", payload);
            
            // Parse driver location and update GeoMatchingService
            DriverLocation driverLocation = objectMapper.readValue(payload, DriverLocation.class);
            geoMatchingService.updateDriverLocation(driverLocation);
            
            // Broadcast driver location to all connected clients
            for (WebSocketSession wsSession : sessions) {
                try {
                    if (wsSession.isOpen()) {
                        wsSession.sendMessage(new TextMessage(payload));
                    }
                } catch (IOException e) {
                    log.error("Error sending message to session: {}", wsSession.getId(), e);
                }
            }
        } catch (Exception e) {
            log.error("Error processing driver location message", e);
        }
    }
    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        log.info("WebSocket connection closed: {}", session.getId());
    }
    
    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("WebSocket transport error for session: {}", session.getId(), exception);
    }
} 