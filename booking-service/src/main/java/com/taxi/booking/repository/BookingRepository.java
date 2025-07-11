package com.taxi.booking.repository;

import com.taxi.booking.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    
    List<Booking> findByRiderId(String riderId);
    
    List<Booking> findByStatus(String status);
    
    List<Booking> findByDriverId(String driverId);
    
    long countByStatus(String status);
    
    long countByCreatedAtAfter(LocalDateTime dateTime);
    
    @Query("SELECT SUM(b.price) FROM Booking b WHERE b.status = :status")
    Double sumPriceByStatus(@Param("status") String status);
} 