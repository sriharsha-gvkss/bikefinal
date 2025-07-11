package com.taxi.matching.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DriverLocation {
    private String driverId;
    private double lat;
    private double lng;
    private long timestamp;
    
    public DriverLocation(String driverId, double lat, double lng) {
        this.driverId = driverId;
        this.lat = lat;
        this.lng = lng;
        this.timestamp = System.currentTimeMillis();
    }

    public String getDriverId() {
        return driverId;
    }

    public double getLat() {
        return lat;
    }

    public double getLng() {
        return lng;
    }
} 