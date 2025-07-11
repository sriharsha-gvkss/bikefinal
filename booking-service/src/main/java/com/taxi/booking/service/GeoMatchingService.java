package com.taxi.booking.service;

import com.taxi.booking.model.DriverLocation;
import com.taxi.booking.util.GeohashUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GeoMatchingService {
    
    private static final Logger log = LoggerFactory.getLogger(GeoMatchingService.class);
    
    // Grid-based storage: geohash -> list of drivers in that area
    private final Map<String, List<DriverLocation>> grid = new ConcurrentHashMap<>();
    
    // Driver ID -> current location for quick lookup
    private final Map<String, DriverLocation> driverLocations = new ConcurrentHashMap<>();
    
    public void updateDriverLocation(DriverLocation location) {
        String geohash = GeohashUtils.encode(location.getLat(), location.getLng(), 6);
        
        // Update driver's current location
        driverLocations.put(location.getDriverId(), location);
        
        // Add to grid
        grid.computeIfAbsent(geohash, k -> new ArrayList<>()).add(location);
        
        log.info("Updated driver {} location: lat={}, lng={}, geohash={}", 
                location.getDriverId(), location.getLat(), location.getLng(), geohash);
    }
    
    public List<DriverLocation> findNearbyDrivers(double lat, double lng, int maxDistance) {
        String geohash = GeohashUtils.encode(lat, lng, 6);
        List<DriverLocation> nearbyDrivers = new ArrayList<>();
        
        // Get drivers from the same geohash area
        List<DriverLocation> driversInArea = grid.getOrDefault(geohash, new ArrayList<>());
        
        for (DriverLocation driver : driversInArea) {
            double distance = GeohashUtils.distance(lat, lng, driver.getLat(), driver.getLng());
            if (distance <= maxDistance) {
                nearbyDrivers.add(driver);
            }
        }
        
        // Sort by distance
        nearbyDrivers.sort((d1, d2) -> {
            double dist1 = GeohashUtils.distance(lat, lng, d1.getLat(), d1.getLng());
            double dist2 = GeohashUtils.distance(lat, lng, d2.getLat(), d2.getLng());
            return Double.compare(dist1, dist2);
        });
        
        log.info("Found {} nearby drivers for location lat={}, lng={}", 
                nearbyDrivers.size(), lat, lng);
        
        return nearbyDrivers;
    }
    
    public Optional<DriverLocation> findNearestDriver(double lat, double lng) {
        List<DriverLocation> nearby = findNearbyDrivers(lat, lng, 10); // 10km radius
        return nearby.stream().findFirst();
    }
    
    public List<DriverLocation> getAllDrivers() {
        return new ArrayList<>(driverLocations.values());
    }
    
    public void removeDriver(String driverId) {
        driverLocations.remove(driverId);
        grid.values().forEach(drivers -> 
            drivers.removeIf(driver -> driver.getDriverId().equals(driverId)));
    }
    
    @PostConstruct
    public void initializeDemoDrivers() {
        log.info("Initializing demo drivers for testing...");
        
        // Add demo drivers in different locations around Hyderabad
        updateDriverLocation(new DriverLocation("demo-driver", 17.4915584, 78.381056)); // Kukatpally
        updateDriverLocation(new DriverLocation("driver1", 17.3457176, 78.5522296)); // L.B. Nagar
        updateDriverLocation(new DriverLocation("driver2", 17.3850, 78.4867)); // Secunderabad
        updateDriverLocation(new DriverLocation("driver3", 17.4065, 78.4772)); // Begumpet
        updateDriverLocation(new DriverLocation("D1", 17.3850, 78.4867)); // Main driver for simulator
        updateDriverLocation(new DriverLocation("venkat", 17.3604864, 78.4990208)); // Current driver location
        updateDriverLocation(new DriverLocation("srinivas", 17.3850, 78.4867)); // Another driver
        updateDriverLocation(new DriverLocation("rajesh", 17.4065, 78.4772)); // Another driver
        updateDriverLocation(new DriverLocation("kumar", 17.3457176, 78.5522296)); // Another driver
        
        log.info("Demo drivers initialized. Total drivers: {}", driverLocations.size());
    }
} 