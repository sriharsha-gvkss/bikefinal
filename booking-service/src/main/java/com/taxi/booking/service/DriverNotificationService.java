package com.taxi.booking.service;

import com.taxi.booking.model.Booking;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
public class DriverNotificationService {
    
    private static final Logger log = LoggerFactory.getLogger(DriverNotificationService.class);
    
    @Autowired
    private ApplicationContext applicationContext;
    
    @Autowired
    private BookingService bookingService;
    
    /**
     * Send ride request to a specific driver
     */
    public void sendRideRequestToDriver(String driverId, Booking booking, double distance, double duration, double price) {
        try {
            log.info("🔄 Attempting to send ride request to driver {} for booking {}", driverId, booking.getId());
            
            var driverNotificationWebSocketHandler = applicationContext.getBean(com.taxi.booking.websocket.DriverNotificationWebSocketHandler.class);
            
            // Check if driver is connected
            if (!driverNotificationWebSocketHandler.isDriverConnected(driverId)) {
                log.warn("⚠️ Driver {} is not connected to WebSocket - notification will not be delivered", driverId);
                return;
            }
            
            // Send the ride request
            driverNotificationWebSocketHandler.sendRideRequestToDriver(driverId, booking, distance, duration, price);
            log.info("✅ Successfully sent ride request to driver {} for booking {}", driverId, booking.getId());
            
            // Set a timeout for driver response (30 seconds)
            CompletableFuture.runAsync(() -> {
                try {
                    TimeUnit.SECONDS.sleep(30);
                    
                    // Check if booking is still pending
                    var currentBooking = bookingService.getBookingById(booking.getId());
                    if (currentBooking.isPresent() && "REQUESTED".equals(currentBooking.get().getStatus())) {
                        log.info("⏰ Driver {} did not respond to booking {} within 30 seconds timeout", driverId, booking.getId());
                        // Could implement fallback logic here (e.g., try another driver)
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.warn("⏰ Timeout check interrupted for driver {} booking {}", driverId, booking.getId());
                }
            });
            
        } catch (Exception e) {
            log.error("❌ Error sending ride request to driver {} for booking {}", driverId, booking.getId(), e);
        }
    }
    
    /**
     * Send ride request to multiple drivers (for better matching)
     */
    public void sendRideRequestToMultipleDrivers(List<String> driverIds, Booking booking, double distance, double duration, double price) {
        log.info("🚀 Sending ride request to {} drivers for booking {}", driverIds.size(), booking.getId());
        
        for (String driverId : driverIds) {
            sendRideRequestToDriver(driverId, booking, distance, duration, price);
        }
        
        log.info("✅ Completed sending ride requests to {} drivers for booking {}", driverIds.size(), booking.getId());
    }
    
    /**
     * Check if a driver is online and available for notifications
     */
    public boolean isDriverAvailable(String driverId) {
        try {
            var driverNotificationWebSocketHandler = applicationContext.getBean(com.taxi.booking.websocket.DriverNotificationWebSocketHandler.class);
            boolean isConnected = driverNotificationWebSocketHandler.isDriverConnected(driverId);
            log.debug("🔍 Driver {} availability check: {}", driverId, isConnected ? "ONLINE" : "OFFLINE");
            return isConnected;
        } catch (Exception e) {
            log.error("❌ Error checking driver availability for {}", driverId, e);
            return false;
        }
    }
    
    /**
     * Get list of available drivers
     */
    public List<String> getAvailableDrivers() {
        try {
            var driverNotificationWebSocketHandler = applicationContext.getBean(com.taxi.booking.websocket.DriverNotificationWebSocketHandler.class);
            return driverNotificationWebSocketHandler.getConnectedDrivers();
        } catch (Exception e) {
            log.error("❌ Error getting available drivers", e);
            return List.of();
        }
    }
    
    /**
     * Send notification to rider
     */
    public void notifyRider(String riderId, Map<String, Object> message) {
        try {
            log.info("📱 Sending notification to rider {}: {}", riderId, message.get("type"));
            
            var riderNotificationWebSocketHandler = applicationContext.getBean(com.taxi.booking.websocket.RiderNotificationWebSocketHandler.class);
            
            // Check if rider is connected
            if (!riderNotificationWebSocketHandler.isRiderConnected(riderId)) {
                log.warn("⚠️ Rider {} is not connected to WebSocket - notification will not be delivered", riderId);
                return;
            }
            
            // Send the notification
            riderNotificationWebSocketHandler.notifyRider(riderId, message);
            log.info("✅ Successfully sent notification to rider {}: {}", riderId, message.get("type"));
            
        } catch (Exception e) {
            log.error("❌ Error sending notification to rider {}: {}", riderId, message.get("type"), e);
        }
    }
} 