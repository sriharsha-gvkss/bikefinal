package com.taxi.booking.config;

import com.taxi.booking.websocket.DriverLocationWebSocketHandler;
import com.taxi.booking.websocket.DriverNotificationWebSocketHandler;
import com.taxi.booking.websocket.DriverWebSocketHandler;
import com.taxi.booking.websocket.RiderNotificationWebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    
    @Value("${app.cors.allowed-origins:http://localhost:3000,https://localhost:3000}")
    private String allowedOrigins;
    
    private final DriverLocationWebSocketHandler driverLocationWebSocketHandler;
    private final DriverNotificationWebSocketHandler driverNotificationWebSocketHandler;
    private final DriverWebSocketHandler driverWebSocketHandler;
    private final RiderNotificationWebSocketHandler riderNotificationWebSocketHandler;
    
    public WebSocketConfig(DriverLocationWebSocketHandler driverLocationWebSocketHandler,
                          DriverNotificationWebSocketHandler driverNotificationWebSocketHandler,
                          DriverWebSocketHandler driverWebSocketHandler,
                          RiderNotificationWebSocketHandler riderNotificationWebSocketHandler) {
        this.driverLocationWebSocketHandler = driverLocationWebSocketHandler;
        this.driverNotificationWebSocketHandler = driverNotificationWebSocketHandler;
        this.driverWebSocketHandler = driverWebSocketHandler;
        this.riderNotificationWebSocketHandler = riderNotificationWebSocketHandler;
    }
    
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] origins = allowedOrigins.split(",");
        
        registry.addHandler(driverLocationWebSocketHandler, "/ws/driver-location")
                .setAllowedOrigins(origins);
        
        registry.addHandler(driverNotificationWebSocketHandler, "/ws/driver-notifications")
                .setAllowedOrigins(origins);
        
        registry.addHandler(driverWebSocketHandler, "/ws/driver/{driverId}")
                .setAllowedOrigins(origins);
        
        registry.addHandler(riderNotificationWebSocketHandler, "/ws/rider-notifications")
                .setAllowedOrigins(origins);
    }
} 