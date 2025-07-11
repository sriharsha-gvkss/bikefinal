package com.taxi.booking.service;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.HashMap;

@Service
public class PricingService {
    
    // Pricing per km for different vehicle types (based on real-world rates)
    private static final Map<String, Double> PRICING_PER_KM = new HashMap<>();
    
    static {
        PRICING_PER_KM.put("BIKE_1_SEATER", 5.5); // ₹5.5/km for bike 1 seater (Rapido-style)
        PRICING_PER_KM.put("AUTO_3_SEATER", 11.0); // ₹11/km for auto 3 seater (Ola/Uber-style)
        PRICING_PER_KM.put("CAR_4_SEATER", 14.0); // ₹14/km for car 4 seater (Sedan)
        PRICING_PER_KM.put("XUV_7_SEATER", 17.5); // ₹17.5/km for XUV 7 seater (SUV/XUV)
    }
    
    // Base fare for different vehicle types (based on real-world rates)
    private static final Map<String, Double> BASE_FARE = new HashMap<>();
    
    static {
        BASE_FARE.put("BIKE_1_SEATER", 20.0); // ₹20 base fare for bike 1 seater
        BASE_FARE.put("AUTO_3_SEATER", 35.0); // ₹35 base fare for auto 3 seater
        BASE_FARE.put("CAR_4_SEATER", 65.0); // ₹65 base fare for car 4 seater
        BASE_FARE.put("XUV_7_SEATER", 90.0); // ₹90 base fare for XUV 7 seater
    }
    
    /**
     * Calculate the total price for a ride based on distance and vehicle type
     * @param distance Distance in kilometers
     * @param vehicleType Type of vehicle (BIKE, AUTO, CAR)
     * @return Total price in rupees
     */
    public double calculatePrice(double distance, String vehicleType) {
        if (distance <= 0 || vehicleType == null) {
            return 0.0;
        }
        
        Double pricePerKm = PRICING_PER_KM.get(vehicleType.toUpperCase());
        Double baseFare = BASE_FARE.get(vehicleType.toUpperCase());
        
        if (pricePerKm == null || baseFare == null) {
            return 0.0;
        }
        
        // Calculate: Base fare + (Distance × Price per km)
        double totalPrice = baseFare + (distance * pricePerKm);
        
        // Round to 2 decimal places
        return Math.round(totalPrice * 100.0) / 100.0;
    }
    
    /**
     * Get pricing information for all vehicle types
     * @return Map with vehicle types and their pricing details
     */
    public Map<String, Object> getPricingInfo() {
        Map<String, Object> pricingInfo = new HashMap<>();
        
        for (String vehicleType : PRICING_PER_KM.keySet()) {
            Map<String, Object> vehicleInfo = new HashMap<>();
            vehicleInfo.put("pricePerKm", PRICING_PER_KM.get(vehicleType));
            vehicleInfo.put("baseFare", BASE_FARE.get(vehicleType));
            vehicleInfo.put("description", getVehicleDescription(vehicleType));
            pricingInfo.put(vehicleType, vehicleInfo);
        }
        
        return pricingInfo;
    }
    
    private String getVehicleDescription(String vehicleType) {
        switch (vehicleType.toUpperCase()) {
            case "BIKE_1_SEATER":
                return "Bike 1 Seater - Fast and economical";
            case "AUTO_3_SEATER":
                return "Auto 3 Seater - Comfortable and affordable";
            case "CAR_4_SEATER":
                return "Car 4 Seater - Premium ride experience";
            case "XUV_7_SEATER":
                return "XUV 7 Seater - Luxury and spacious";
            default:
                return "Unknown vehicle type";
        }
    }
} 