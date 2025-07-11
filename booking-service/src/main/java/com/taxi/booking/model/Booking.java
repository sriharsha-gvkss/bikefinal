package com.taxi.booking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Booking {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String riderId;
    
    @Column(nullable = false)
    private String pickupLocation; // "lat,lng" format
    
    @Column(nullable = false)
    private String destination; // "lat,lng" format
    
    @Column(nullable = false)
    private String status; // REQUESTED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED
    
    @Column
    private String vehicleType; // BIKE, AUTO, CAR
    
    @Column
    private Double distance; // in kilometers
    
    @Column
    private Double price; // calculated price in rupees
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    @Column
    private String driverId;
    
    @Column
    private String driverAssignmentStatus; // PENDING, ACCEPTED, DECLINED
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    // Manual getters and setters for JDK 24 compatibility
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getRiderId() {
        return riderId;
    }
    
    public void setRiderId(String riderId) {
        this.riderId = riderId;
    }
    
    public String getPickupLocation() {
        return pickupLocation;
    }
    
    public void setPickupLocation(String pickupLocation) {
        this.pickupLocation = pickupLocation;
    }
    
    public String getDestination() {
        return destination;
    }
    
    public void setDestination(String destination) {
        this.destination = destination;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public String getDriverId() {
        return driverId;
    }
    
    public void setDriverId(String driverId) {
        this.driverId = driverId;
    }
    
    public String getDriverAssignmentStatus() {
        return driverAssignmentStatus;
    }
    
    public void setDriverAssignmentStatus(String driverAssignmentStatus) {
        this.driverAssignmentStatus = driverAssignmentStatus;
    }
    
    public String getVehicleType() {
        return vehicleType;
    }
    
    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }
    
    public Double getDistance() {
        return distance;
    }
    
    public void setDistance(Double distance) {
        this.distance = distance;
    }
    
    public Double getPrice() {
        return price;
    }
    
    public void setPrice(Double price) {
        this.price = price;
    }
} 