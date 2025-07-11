package com.taxi.booking.util;

public class DistanceCalculator {
    
    private static final double EARTH_RADIUS = 6371; // Earth's radius in kilometers
    
    /**
     * Calculate distance between two GPS coordinates using Haversine formula
     * @param lat1 Latitude of first point
     * @param lng1 Longitude of first point
     * @param lat2 Latitude of second point
     * @param lng2 Longitude of second point
     * @return Distance in kilometers
     */
    public static double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
        // Check if coordinates are the same (or very close)
        if (Math.abs(lat1 - lat2) < 0.0001 && Math.abs(lng1 - lng2) < 0.0001) {
            return 0.5; // Return minimum distance of 0.5 km for same location
        }
        
        // Convert latitude and longitude from degrees to radians
        double lat1Rad = Math.toRadians(lat1);
        double lng1Rad = Math.toRadians(lng1);
        double lat2Rad = Math.toRadians(lat2);
        double lng2Rad = Math.toRadians(lng2);
        
        // Differences in coordinates
        double deltaLat = lat2Rad - lat1Rad;
        double deltaLng = lng2Rad - lng1Rad;
        
        // Haversine formula
        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                   Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                   Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        // Calculate distance
        double distance = EARTH_RADIUS * c;
        
        // Ensure minimum distance of 0.5 km for any ride
        distance = Math.max(0.5, distance);
        
        // Round to 2 decimal places
        return Math.round(distance * 100.0) / 100.0;
    }
    
    /**
     * Parse location string in "lat,lng" format and return coordinates
     * @param location Location string in "lat,lng" format
     * @return Array with [latitude, longitude] or null if invalid format
     */
    public static double[] parseLocation(String location) {
        if (location == null || location.trim().isEmpty()) {
            return null;
        }
        
        try {
            String[] parts = location.split(",");
            if (parts.length != 2) {
                return null;
            }
            
            double lat = Double.parseDouble(parts[0].trim());
            double lng = Double.parseDouble(parts[1].trim());
            
            return new double[]{lat, lng};
        } catch (NumberFormatException e) {
            return null;
        }
    }
} 