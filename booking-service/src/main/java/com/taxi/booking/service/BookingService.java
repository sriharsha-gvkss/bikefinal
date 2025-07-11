package com.taxi.booking.service;

import com.taxi.booking.model.Booking;
import com.taxi.booking.producer.BookingProducer;
import com.taxi.booking.repository.BookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class BookingService {
    
    private static final Logger log = LoggerFactory.getLogger(BookingService.class);
    
    private final BookingRepository bookingRepository;
    private final BookingProducer bookingProducer;
    
    @Autowired
    private ApplicationContext applicationContext;
    
    @Autowired
    private GeoMatchingService geoMatchingService;
    
    public BookingService(BookingRepository bookingRepository, BookingProducer bookingProducer) {
        this.bookingRepository = bookingRepository;
        this.bookingProducer = bookingProducer;
    }
    
    @Transactional
    public Booking createBooking(Booking booking) {
        booking.setStatus("REQUESTED");
        Booking savedBooking = bookingRepository.save(booking);
        
        // Send to Kafka for driver matching
        bookingProducer.sendBookingEvent(savedBooking);
        
        log.info("Created booking: {}", savedBooking.getId());
        return savedBooking;
    }
    
    @Transactional
    public Booking createBookingWithDetails(Booking booking, double distance, double duration, double price) {
        booking.setStatus("REQUESTED");
        Booking savedBooking = bookingRepository.save(booking);
        
        // Create enhanced booking event with additional details
        bookingProducer.sendBookingEventWithDetails(savedBooking, distance, duration, price);
        
        log.info("Created booking with details: {} (distance: {}, duration: {}, price: {})", 
                savedBooking.getId(), distance, duration, price);
        return savedBooking;
    }
    
    @Transactional
    public Booking createBookingWithNotification(Booking booking, double distance, double duration, double price, String driverId) {
        booking.setStatus("REQUESTED");
        Booking savedBooking = bookingRepository.save(booking);
        
        // Send to Kafka for driver matching
        bookingProducer.sendBookingEvent(savedBooking);
        
        // Send notification to driver
        if (driverId != null) {
            try {
                var driverNotificationService = applicationContext.getBean(DriverNotificationService.class);
                driverNotificationService.sendRideRequestToDriver(driverId, savedBooking, distance, duration, price);
            } catch (Exception e) {
                log.error("Error sending notification to driver {}", driverId, e);
            }
        }
        
        log.info("Created booking with notification: {} for driver: {}", savedBooking.getId(), driverId);
        return savedBooking;
    }
    
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }
    
    public Optional<Booking> getBookingById(Long id) {
        return bookingRepository.findById(id);
    }
    
    public List<Booking> getBookingsByRiderId(String riderId) {
        return bookingRepository.findByRiderId(riderId);
    }
    
    @Transactional
    public Booking updateBookingStatus(Long bookingId, String status) {
        Optional<Booking> optionalBooking = bookingRepository.findById(bookingId);
        if (optionalBooking.isPresent()) {
            Booking booking = optionalBooking.get();
            booking.setStatus(status);
            return bookingRepository.save(booking);
        }
        return null;
    }
    
    @Transactional
    public Booking assignDriver(Long bookingId, String driverId) {
        Optional<Booking> optionalBooking = bookingRepository.findById(bookingId);
        if (optionalBooking.isPresent()) {
            Booking booking = optionalBooking.get();
            booking.setDriverId(driverId);
            booking.setStatus("ACCEPTED");
            return bookingRepository.save(booking);
        }
        return null;
    }
    
    @Transactional
    public Booking updateBooking(Booking booking) {
        return bookingRepository.save(booking);
    }
    
    public List<Booking> getBookingsByDriverId(String driverId) {
        return bookingRepository.findByDriverId(driverId);
    }
    
    public List<Booking> getBookingsByStatus(String status) {
        return bookingRepository.findByStatus(status);
    }
    
    @Transactional
    public Booking createBookingWithAutoMatching(Booking booking, double distance, double duration, double price) {
        booking.setStatus("REQUESTED");
        Booking savedBooking = bookingRepository.save(booking);
        
        // Send notifications to ALL connected drivers
        try {
            var driverNotificationService = applicationContext.getBean(DriverNotificationService.class);
            
            // Get all available drivers (connected to WebSocket)
            List<String> availableDrivers = driverNotificationService.getAvailableDrivers();
            
            if (!availableDrivers.isEmpty()) {
                log.info("Found {} connected drivers for booking {}", availableDrivers.size(), savedBooking.getId());
                
                // Send notification to ALL connected drivers
                driverNotificationService.sendRideRequestToMultipleDrivers(availableDrivers, savedBooking, distance, duration, price);
                
                log.info("Sent notifications to ALL {} connected drivers for booking {}", 
                        availableDrivers.size(), savedBooking.getId());
                
            } else {
                log.warn("No connected drivers available for booking {}. Will use Kafka-based matching.", savedBooking.getId());
                // Fallback to Kafka-based matching
                bookingProducer.sendBookingEventWithDetails(savedBooking, distance, duration, price);
            }
            
        } catch (Exception e) {
            log.error("Error sending notifications to drivers for booking {}", savedBooking.getId(), e);
            // Fallback to Kafka-based matching
            bookingProducer.sendBookingEventWithDetails(savedBooking, distance, duration, price);
        }
        
        log.info("Created booking with broadcast notification: {} (distance: {}, duration: {}, price: {})", 
                savedBooking.getId(), distance, duration, price);
        return savedBooking;
    }
} 