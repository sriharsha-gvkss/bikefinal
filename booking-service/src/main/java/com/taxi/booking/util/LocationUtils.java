package com.taxi.booking.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

@Component
public class LocationUtils {
    
    private static final Logger log = LoggerFactory.getLogger(LocationUtils.class);
    private static final RestTemplate restTemplate = new RestTemplate();
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    // Cache for reverse geocoding results to avoid repeated API calls
    private static final Map<String, String> LOCATION_CACHE = new HashMap<>();
    
    // Google Maps API Key (you can set this as environment variable)
    private static final String GOOGLE_MAPS_API_KEY = System.getenv("GOOGLE_MAPS_API_KEY");
    
    /**
     * Convert coordinates to a readable location name using reverse geocoding
     * @param coordinates Coordinates in "lat,lng" format
     * @return Location name or formatted coordinates if not found
     */
    public static String getLocationName(String coordinates) {
        if (coordinates == null || coordinates.trim().isEmpty()) {
            return "Unknown Location";
        }
        
        // Check cache first
        if (LOCATION_CACHE.containsKey(coordinates)) {
            return LOCATION_CACHE.get(coordinates);
        }
        
        try {
            String[] parts = coordinates.split(",");
            if (parts.length == 2) {
                double lat = Double.parseDouble(parts[0].trim());
                double lng = Double.parseDouble(parts[1].trim());
                
                // Try Google Maps reverse geocoding first (if API key is available)
                String locationName = reverseGeocodeWithGoogleMaps(lat, lng);
                if (locationName != null) {
                    LOCATION_CACHE.put(coordinates, locationName);
                    return locationName;
                }
                
                // Fallback to Nominatim (OpenStreetMap) - free service
                locationName = reverseGeocodeWithNominatim(lat, lng);
                if (locationName != null) {
                    LOCATION_CACHE.put(coordinates, locationName);
                    return locationName;
                }
            }
        } catch (NumberFormatException e) {
            log.warn("Invalid coordinate format: {}", coordinates);
        } catch (Exception e) {
            log.error("Error in reverse geocoding for coordinates: {}", coordinates, e);
        }
        
        // If all else fails, return formatted coordinates
        String formattedCoords = formatCoordinates(coordinates);
        LOCATION_CACHE.put(coordinates, formattedCoords);
        return formattedCoords;
    }
    
    /**
     * Reverse geocoding using Google Maps API
     */
    private static String reverseGeocodeWithGoogleMaps(double lat, double lng) {
        if (GOOGLE_MAPS_API_KEY == null || GOOGLE_MAPS_API_KEY.isEmpty()) {
            return null; // No API key available
        }
        
        try {
            String url = String.format(
                "https://maps.googleapis.com/maps/api/geocode/json?latlng=%.6f,%.6f&key=%s",
                lat, lng, GOOGLE_MAPS_API_KEY
            );
            
            String response = restTemplate.getForObject(url, String.class);
            if (response != null) {
                JsonNode root = objectMapper.readTree(response);
                
                if ("OK".equals(root.path("status").asText())) {
                    JsonNode results = root.path("results");
                    if (results.isArray() && results.size() > 0) {
                        JsonNode firstResult = results.get(0);
                        String formattedAddress = firstResult.path("formatted_address").asText();
                        
                        // Extract a shorter, more readable address
                        return extractReadableAddress(formattedAddress);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Google Maps reverse geocoding failed for lat={}, lng={}: {}", lat, lng, e.getMessage());
        }
        
        return null;
    }
    
    /**
     * Reverse geocoding using Nominatim (OpenStreetMap) - Free service
     */
    private static String reverseGeocodeWithNominatim(double lat, double lng) {
        try {
            // Add delay to respect Nominatim's usage policy (1 request per second)
            Thread.sleep(1000);
            
            String url = String.format(
                "https://nominatim.openstreetmap.org/reverse?format=json&lat=%.6f&lon=%.6f&zoom=16&addressdetails=1",
                lat, lng
            );
            
            String response = restTemplate.getForObject(url, String.class);
            if (response != null) {
                JsonNode root = objectMapper.readTree(response);
                
                // Try to get the most specific address components
                JsonNode address = root.path("address");
                if (!address.isMissingNode()) {
                    // Try different address components in order of preference
                    String[] addressComponents = {
                        "suburb", "neighbourhood", "city_district", "city", "town", "village"
                    };
                    
                    for (String component : addressComponents) {
                        String value = address.path(component).asText();
                        if (value != null && !value.isEmpty()) {
                            return value;
                        }
                    }
                    
                    // If no specific component found, use the display name
                    String displayName = root.path("display_name").asText();
                    if (displayName != null && !displayName.isEmpty()) {
                        return extractReadableAddress(displayName);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Nominatim reverse geocoding failed for lat={}, lng={}: {}", lat, lng, e.getMessage());
        }
        
        return null;
    }
    
    /**
     * Extract a readable address from a full address string
     */
    private static String extractReadableAddress(String fullAddress) {
        if (fullAddress == null || fullAddress.isEmpty()) {
            return "Unknown Location";
        }
        
        // Split by comma and take the first meaningful part
        String[] parts = fullAddress.split(",");
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty() && !trimmed.matches("\\d+") && trimmed.length() > 2) {
                return trimmed;
            }
        }
        
        // If no good part found, return the first non-empty part
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                return trimmed;
            }
        }
        
        return fullAddress;
    }
    
    /**
     * Format coordinates in a readable way
     */
    private static String formatCoordinates(String coordinates) {
        try {
            String[] parts = coordinates.split(",");
            if (parts.length == 2) {
                double lat = Double.parseDouble(parts[0].trim());
                double lng = Double.parseDouble(parts[1].trim());
                return String.format("Location (%.4f, %.4f)", lat, lng);
            }
        } catch (Exception e) {
            log.warn("Error formatting coordinates: {}", coordinates);
        }
        return coordinates;
    }
    
    /**
     * Clear the location cache (useful for testing or memory management)
     */
    public static void clearCache() {
        LOCATION_CACHE.clear();
    }
    
    /**
     * Get cache size for monitoring
     */
    public static int getCacheSize() {
        return LOCATION_CACHE.size();
    }
} 