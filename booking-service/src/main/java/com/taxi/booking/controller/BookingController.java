package com.taxi.booking.controller;

import com.taxi.booking.model.Booking;
import com.taxi.booking.model.DriverLocation;
import com.taxi.booking.model.User;
import com.taxi.booking.repository.UserRepository;
import com.taxi.booking.service.BookingService;
import com.taxi.booking.service.DriverNotificationService;
import com.taxi.booking.service.PricingService;
import com.taxi.booking.util.DistanceCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {
    
    private static final Logger log = LoggerFactory.getLogger(BookingController.class);
    
    private final BookingService bookingService;
    private final PricingService pricingService;
    
    @Autowired
    private ApplicationContext applicationContext;
    
    @Autowired
    private UserRepository userRepository;
    
    public BookingController(BookingService bookingService, PricingService pricingService) {
        this.bookingService = bookingService;
        this.pricingService = pricingService;
    }
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "booking-service",
            "timestamp", System.currentTimeMillis()
        ));
    }
    
    @PostMapping
    public ResponseEntity<Booking> createBooking(@RequestBody Booking booking) {
        try {
            log.info("Received booking request: {}", booking);
            
            booking.setStatus("REQUESTED");
            booking.setDriverAssignmentStatus("PENDING");
            
            // Calculate distance and price if not provided
            if (booking.getDistance() == null || booking.getPrice() == null) {
                double[] pickupCoords = DistanceCalculator.parseLocation(booking.getPickupLocation());
                double[] destCoords = DistanceCalculator.parseLocation(booking.getDestination());
                
                if (pickupCoords != null && destCoords != null) {
                    double distance = DistanceCalculator.calculateDistance(
                        pickupCoords[0], pickupCoords[1], 
                        destCoords[0], destCoords[1]
                    );
                    booking.setDistance(distance);
                    
                    // Use BIKE_1_SEATER as default vehicle type if not specified
                    String vehicleType = booking.getVehicleType() != null ? booking.getVehicleType() : "BIKE_1_SEATER";
                    booking.setVehicleType(vehicleType);
                    
                    double price = pricingService.calculatePrice(distance, vehicleType);
                    booking.setPrice(price);
                }
            }
            
            Booking createdBooking = bookingService.createBooking(booking);
            return ResponseEntity.ok(createdBooking);
        } catch (Exception e) {
            log.error("Error creating booking", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PostMapping("/with-notification")
    public ResponseEntity<Booking> createBookingWithNotification(@RequestBody Map<String, Object> request) {
        try {
            log.info("Received booking request with notification: {}", request);
            
            Booking booking = new Booking();
            booking.setRiderId((String) request.get("riderId"));
            booking.setPickupLocation((String) request.get("pickupLocation"));
            booking.setDestination((String) request.get("destinationLocation"));
            
            // Handle numeric values properly (they might come as Integer or Double from JSON)
            Double distance = null;
            Double duration = null;
            Double price = null;
            
            Object distanceObj = request.get("distance");
            Object durationObj = request.get("duration");
            Object priceObj = request.get("price");
            
            if (distanceObj instanceof Number) {
                distance = ((Number) distanceObj).doubleValue();
            } else if (distanceObj instanceof String) {
                distance = Double.parseDouble((String) distanceObj);
            }
            
            if (durationObj instanceof Number) {
                duration = ((Number) durationObj).doubleValue();
            } else if (durationObj instanceof String) {
                duration = Double.parseDouble((String) durationObj);
            }
            
            if (priceObj instanceof Number) {
                price = ((Number) priceObj).doubleValue();
            } else if (priceObj instanceof String) {
                price = Double.parseDouble((String) priceObj);
            }
            
            String driverId = (String) request.get("driverId");
            
            log.info("Parsed booking data - distance: {}, duration: {}, price: {}, driverId: {}", 
                    distance, duration, price, driverId);
            
            Booking createdBooking;
            if (driverId != null && !driverId.isEmpty()) {
                // If specific driver is provided, use direct notification
                createdBooking = bookingService.createBookingWithNotification(
                    booking, distance, duration, price, driverId);
            } else {
                // If no specific driver, use auto-matching with GeoMatchingService
                createdBooking = bookingService.createBookingWithAutoMatching(
                    booking, distance, duration, price);
            }
            
            return ResponseEntity.ok(createdBooking);
            
        } catch (Exception e) {
            log.error("Error creating booking with notification", e);
            return ResponseEntity.status(500).build();
        }
    }
    
    @PostMapping("/auto-match")
    public ResponseEntity<Booking> createBookingWithAutoMatching(@RequestBody Map<String, Object> request) {
        try {
            log.info("Received booking request with auto-matching: {}", request);
            
            Booking booking = new Booking();
            booking.setRiderId((String) request.get("riderId"));
            booking.setPickupLocation((String) request.get("pickupLocation"));
            booking.setDestination((String) request.get("destinationLocation"));
            
            // Handle numeric values properly (they might come as Integer or Double from JSON)
            Double distance = null;
            Double duration = null;
            Double price = null;
            
            Object distanceObj = request.get("distance");
            Object durationObj = request.get("duration");
            Object priceObj = request.get("price");
            
            if (distanceObj instanceof Number) {
                distance = ((Number) distanceObj).doubleValue();
            } else if (distanceObj instanceof String) {
                distance = Double.parseDouble((String) distanceObj);
            }
            
            if (durationObj instanceof Number) {
                duration = ((Number) durationObj).doubleValue();
            } else if (durationObj instanceof String) {
                duration = Double.parseDouble((String) durationObj);
            }
            
            if (priceObj instanceof Number) {
                price = ((Number) priceObj).doubleValue();
            } else if (priceObj instanceof String) {
                price = Double.parseDouble((String) priceObj);
            }
            
            Booking createdBooking = bookingService.createBookingWithAutoMatching(
                booking, distance, duration, price);
            
            return ResponseEntity.ok(createdBooking);
            
        } catch (Exception e) {
            log.error("Error creating booking with auto-matching", e);
            return ResponseEntity.status(500).build();
        }
    }
    
    @GetMapping
    public ResponseEntity<List<Booking>> getAllBookings() {
        return ResponseEntity.ok(bookingService.getAllBookings());
    }
    
    @GetMapping("/connected-drivers")
    public ResponseEntity<List<String>> getConnectedDrivers() {
        try {
            var driverNotificationService = applicationContext.getBean(DriverNotificationService.class);
            List<String> connectedDrivers = driverNotificationService.getAvailableDrivers();
            return ResponseEntity.ok(connectedDrivers);
        } catch (Exception e) {
            log.error("Error getting connected drivers", e);
            return ResponseEntity.ok(List.of());
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Booking> getBooking(@PathVariable Long id) {
        return bookingService.getBookingById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/rider/{riderId}")
    public ResponseEntity<List<Booking>> getBookingsByRiderId(@PathVariable String riderId) {
        return ResponseEntity.ok(bookingService.getBookingsByRiderId(riderId));
    }
    
    @PutMapping("/{id}/status")
    public ResponseEntity<Booking> updateBookingStatus(@PathVariable Long id, @RequestParam String status) {
        Booking updatedBooking = bookingService.updateBookingStatus(id, status);
        if (updatedBooking != null) {
            return ResponseEntity.ok(updatedBooking);
        }
        return ResponseEntity.notFound().build();
    }
    
    @PutMapping("/{id}/assign-driver")
    public ResponseEntity<Booking> assignDriver(@PathVariable Long id, @RequestParam String driverId) {
        Booking updatedBooking = bookingService.assignDriver(id, driverId);
        if (updatedBooking != null) {
            return ResponseEntity.ok(updatedBooking);
        }
        return ResponseEntity.notFound().build();
    }
    
    @PostMapping("/{id}/driver-response")
    public ResponseEntity<Booking> driverResponse(
            @PathVariable Long id,
            @RequestBody Map<String, String> response) {
        
        String action = response.get("action"); // "accept" or "decline"
        String driverId = response.get("driverId");
        
        return bookingService.getBookingById(id)
                .map(booking -> {
                    log.info("Processing driver response for booking {}: action={}, driverId={}", id, action, driverId);
                    log.info("Current booking state: driverId={}, status={}, driverAssignmentStatus={}", 
                            booking.getDriverId(), booking.getStatus(), booking.getDriverAssignmentStatus());
                    
                    if ("accept".equalsIgnoreCase(action)) {
                        booking.setDriverId(driverId);
                        booking.setDriverAssignmentStatus("ACCEPTED");
                        booking.setStatus("IN_PROGRESS");
                        log.info("Updated booking {}: driverId={}, status={}, driverAssignmentStatus={}", 
                                id, booking.getDriverId(), booking.getStatus(), booking.getDriverAssignmentStatus());
                        
                        // Notify rider that driver accepted
                        try {
                            var driverNotificationService = applicationContext.getBean(DriverNotificationService.class);
                            driverNotificationService.notifyRider(booking.getRiderId(), Map.of(
                                "type", "DRIVER_ACCEPTED",
                                "bookingId", id,
                                "driverId", driverId,
                                "message", "Driver accepted your ride request!"
                            ));
                        } catch (Exception e) {
                            log.error("Error notifying rider about driver acceptance", e);
                        }
                        
                    } else if ("decline".equalsIgnoreCase(action)) {
                        booking.setDriverAssignmentStatus("DECLINED");
                        booking.setStatus("REQUESTED"); // Reset to find another driver
                        booking.setDriverId(null);
                        log.info("Driver {} declined booking {}", driverId, id);
                    }
                    
                    Booking updatedBooking = bookingService.updateBooking(booking);
                    return ResponseEntity.ok(updatedBooking);
                })
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/driver/{driverId}")
    public ResponseEntity<List<Booking>> getDriverBookings(@PathVariable String driverId) {
        List<Booking> bookings = bookingService.getBookingsByDriverId(driverId);
        return ResponseEntity.ok(bookings);
    }
    
    @GetMapping("/driver/status")
    public ResponseEntity<?> getDriverStatus(@RequestParam String username) {
        log.info("Received request to get status for driver: {}", username);
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty() || userOpt.get().getRole() != User.UserRole.DRIVER) {
            log.warn("Driver not found or user is not a driver: {}", username);
            return ResponseEntity.notFound().build();
        }
        log.info("Driver status retrieved successfully: {} - {}", username, userOpt.get().getStatus());
        return ResponseEntity.ok().body(
            Map.of("status", userOpt.get().getStatus())
        );
    }

    @PutMapping("/driver/status")
    public ResponseEntity<?> updateDriverStatus(@RequestParam String username, @RequestParam String status) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty() || userOpt.get().getRole() != User.UserRole.DRIVER) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        try {
            user.setStatus(User.Status.valueOf(status.toUpperCase()));
            userRepository.save(user);
            return ResponseEntity.ok().body(Map.of("status", user.getStatus()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status value"));
        }
    }
    
    @GetMapping("/available")
    public ResponseEntity<List<Booking>> getAvailableBookings() {
        try {
            // Get bookings that are in REQUESTED status (waiting for driver)
            List<Booking> availableBookings = bookingService.getBookingsByStatus("REQUESTED");
            return ResponseEntity.ok(availableBookings);
        } catch (Exception e) {
            log.error("Error getting available bookings", e);
            return ResponseEntity.ok(List.of());
        }
    }
    
    @GetMapping("/pricing")
    public ResponseEntity<Map<String, Object>> getPricingInfo() {
        try {
            Map<String, Object> pricingInfo = pricingService.getPricingInfo();
            return ResponseEntity.ok(pricingInfo);
        } catch (Exception e) {
            log.error("Error getting pricing info", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PostMapping("/calculate-price")
    public ResponseEntity<Map<String, Object>> calculatePrice(@RequestBody Map<String, Object> request) {
        try {
            String pickupLocation = (String) request.get("pickupLocation");
            String destination = (String) request.get("destination");
            String vehicleType = (String) request.get("vehicleType");
            
            if (pickupLocation == null || destination == null || vehicleType == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields"));
            }
            
            // Try to parse as coordinates first, if that fails, treat as address
            double[] pickupCoords = DistanceCalculator.parseLocation(pickupLocation);
            double[] destCoords = DistanceCalculator.parseLocation(destination);
            
            // If coordinates parsing failed, try to geocode the addresses
            if (pickupCoords == null) {
                pickupCoords = geocodeAddress(pickupLocation);
                if (pickupCoords == null) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Could not geocode pickup location: " + pickupLocation));
                }
            }
            
            if (destCoords == null) {
                destCoords = geocodeAddress(destination);
                if (destCoords == null) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Could not geocode destination: " + destination));
                }
            }
            
            // Calculate distance
            double distance = DistanceCalculator.calculateDistance(
                pickupCoords[0], pickupCoords[1], 
                destCoords[0], destCoords[1]
            );
            
            // Calculate duration based on vehicle type and distance
            double duration = calculateDurationForVehicle(distance, vehicleType);
            
            // Calculate price
            double price = pricingService.calculatePrice(distance, vehicleType);
            
            Map<String, Object> response = Map.of(
                "distance", distance,
                "duration", duration,
                "price", price,
                "vehicleType", vehicleType,
                "pickupLocation", pickupLocation,
                "destination", destination,
                "pickupCoords", Map.of("lat", pickupCoords[0], "lng", pickupCoords[1]),
                "destCoords", Map.of("lat", destCoords[0], "lng", destCoords[1])
            );
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error calculating price", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Error calculating price"));
        }
    }
    
    /**
     * Calculate duration for a vehicle type based on distance and traffic conditions
     */
    private double calculateDurationForVehicle(double distance, String vehicleType) {
        // Vehicle speeds in km/h (different speeds for different vehicle types)
        // These speeds account for traffic conditions in Hyderabad
        double speed;
        switch (vehicleType) {
            case "BIKE_1_SEATER":
                speed = 28.0; // Bike can navigate traffic better
                break;
            case "AUTO_3_SEATER":
                speed = 22.0; // Auto is slower due to traffic
                break;
            case "CAR_4_SEATER":
                speed = 25.0; // Car baseline speed in city traffic
                break;
            case "XUV_7_SEATER":
                speed = 23.0; // XUV is slightly slower due to size
                break;
            default:
                speed = 25.0; // Default speed
        }
        
        double timeInHours = distance / speed;
        double timeInMinutes = timeInHours * 60;
        
        // Ensure minimum time of 3 minutes for very short distances
        return Math.max(3.0, Math.round(timeInMinutes));
    }
    
    /**
     * Simple geocoding method for common Hyderabad locations
     * In a production environment, you would use Google Maps Geocoding API
     */
    private double[] geocodeAddress(String address) {
        try {
            if (address == null || address.trim().isEmpty()) {
                return null;
            }
            
            String lowerAddress = address.toLowerCase();
            
            // Map common Hyderabad locations to coordinates
            if (lowerAddress.contains("uppal")) {
                return new double[]{17.4058, 78.5597}; // Uppal coordinates
            } else if (lowerAddress.contains("l.b. nagar") || lowerAddress.contains("lb nagar")) {
                return new double[]{17.3676, 78.5577}; // L.B. Nagar coordinates
            } else if (lowerAddress.contains("secunderabad")) {
                return new double[]{17.4399, 78.4983}; // Secunderabad coordinates
            } else if (lowerAddress.contains("hitech city") || lowerAddress.contains("hitech")) {
                return new double[]{17.4454, 78.3772}; // Hitech City coordinates
            } else if (lowerAddress.contains("banjara hills")) {
                return new double[]{17.4065, 78.4772}; // Banjara Hills coordinates
            } else if (lowerAddress.contains("jubilee hills")) {
                return new double[]{17.4229, 78.4078}; // Jubilee Hills coordinates
            } else if (lowerAddress.contains("gachibowli")) {
                return new double[]{17.4401, 78.3489}; // Gachibowli coordinates
            } else if (lowerAddress.contains("kukatpally")) {
                return new double[]{17.4849, 78.4138}; // Kukatpally coordinates
            } else if (lowerAddress.contains("dilsukhnagar")) {
                return new double[]{17.3713, 78.5264}; // Dilsukhnagar coordinates
            } else if (lowerAddress.contains("malakpet")) {
                return new double[]{17.3841, 78.4864}; // Malakpet coordinates
            } else if (lowerAddress.contains("abids")) {
                return new double[]{17.3850, 78.4867}; // Abids (Hyderabad center) coordinates
            } else if (lowerAddress.contains("hyderabad")) {
                // If it's just "Hyderabad" or contains "Hyderabad", use center coordinates
                return new double[]{17.3850, 78.4867}; // Hyderabad center coordinates
            }
            
            // If no match found, return Hyderabad center as fallback
            log.warn("No specific coordinates found for: {}, using Hyderabad center", address);
            return new double[]{17.3850, 78.4867};
            
        } catch (Exception e) {
            log.error("Error geocoding address: {}", address, e);
            return new double[]{17.3850, 78.4867}; // Return Hyderabad center as fallback
        }
    }
    
    @PostMapping("/{id}/update-ride-status")
    public ResponseEntity<?> updateRideStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        
        String status = request.get("status"); // "PICKUP", "IN_TRANSIT", "COMPLETED"
        String driverId = request.get("driverId");
        
        return bookingService.getBookingById(id)
                .map(booking -> {
                    if (!driverId.equals(booking.getDriverId())) {
                        return ResponseEntity.badRequest().body(null);
                    }
                    
                    switch (status.toUpperCase()) {
                        case "PICKUP":
                            booking.setStatus("PICKUP");
                            log.info("Driver {} arrived at pickup for booking {}", driverId, id);
                            // Notify rider that driver has arrived
                            try {
                                var driverNotificationService = applicationContext.getBean(DriverNotificationService.class);
                                driverNotificationService.notifyRider(booking.getRiderId(), Map.of(
                                    "type", "DRIVER_ARRIVED",
                                    "status", "PICKUP",
                                    "message", "🚗 Driver has arrived at pickup location! Click 'Start Ride' to confirm.",
                                    "bookingId", id,
                                    "driverId", driverId
                                ));
                            } catch (Exception e) {
                                log.error("Error notifying rider about pickup", e);
                            }
                            break;
                        case "RIDER_CONFIRMED":
                            booking.setStatus("RIDER_CONFIRMED");
                            log.info("Rider confirmed pickup for booking {}", id);
                            // Notify driver that rider confirmed
                            try {
                                var driverNotificationService = applicationContext.getBean(DriverNotificationService.class);
                                driverNotificationService.notifyRider(booking.getRiderId(), Map.of(
                                    "type", "RIDER_CONFIRMED",
                                    "status", "RIDER_CONFIRMED",
                                    "message", "✅ Rider confirmed pickup. You can now start the trip.",
                                    "bookingId", id,
                                    "driverId", driverId
                                ));
                            } catch (Exception e) {
                                log.error("Error notifying driver about rider confirmation", e);
                            }
                            break;
                        case "IN_TRANSIT":
                            booking.setStatus("IN_TRANSIT");
                            log.info("Driver {} started trip for booking {}", driverId, id);
                            // Notify rider that trip has started
                            try {
                                var driverNotificationService = applicationContext.getBean(DriverNotificationService.class);
                                driverNotificationService.notifyRider(booking.getRiderId(), Map.of(
                                    "type", "TRIP_STARTED",
                                    "status", "IN_TRANSIT",
                                    "message", "🚀 Trip started! Heading to destination.",
                                    "bookingId", id,
                                    "driverId", driverId
                                ));
                            } catch (Exception e) {
                                log.error("Error notifying rider about trip start", e);
                            }
                            break;
                        case "COMPLETED":
                            booking.setStatus("COMPLETED");
                            log.info("Driver {} completed trip for booking {}", driverId, id);
                            // Notify rider
                            try {
                                var driverNotificationService = applicationContext.getBean(DriverNotificationService.class);
                                driverNotificationService.notifyRider(booking.getRiderId(), Map.of(
                                    "type", "RIDE_STATUS_UPDATE",
                                    "status", "COMPLETED",
                                    "message", "Trip completed successfully"
                                ));
                            } catch (Exception e) {
                                log.error("Error notifying rider about trip completion", e);
                            }
                            break;
                        default:
                            return ResponseEntity.badRequest().body(null);
                    }
                    
                    Booking updatedBooking = bookingService.updateBooking(booking);
                    return ResponseEntity.ok(updatedBooking);
                })
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping("/{id}/update-location")
    public ResponseEntity<String> updateDriverLocation(
            @PathVariable Long id,
            @RequestBody Map<String, Object> location) {
        
        String driverId = (String) location.get("driverId");
        Double lat = (Double) location.get("lat");
        Double lng = (Double) location.get("lng");
        
        if (driverId == null || lat == null || lng == null) {
            return ResponseEntity.badRequest().body("Missing required fields");
        }
        
        try {
            // Log the location update
            log.info("Driver {} location updated: lat={}, lng={}", driverId, lat, lng);
            
            // Notify rider about driver location update
            try {
                var driverNotificationService = applicationContext.getBean(DriverNotificationService.class);
                driverNotificationService.notifyRider(driverId, Map.of(
                    "type", "DRIVER_LOCATION_UPDATE",
                    "driverId", driverId,
                    "lat", lat,
                    "lng", lng
                ));
                
                // Also notify the rider of the booking
                var booking = bookingService.getBookingById(id);
                if (booking.isPresent()) {
                    driverNotificationService.notifyRider(booking.get().getRiderId(), Map.of(
                        "type", "DRIVER_LOCATION_UPDATE",
                        "driverId", driverId,
                        "lat", lat,
                        "lng", lng
                    ));
                }
            } catch (Exception e) {
                log.error("Error notifying rider about driver location update", e);
            }
            
            return ResponseEntity.ok("Location updated successfully");
        } catch (Exception e) {
            log.error("Error updating driver location", e);
            return ResponseEntity.internalServerError().body("Error updating location");
        }
    }
    
    @PostMapping("/{id}/rider-confirm")
    public ResponseEntity<?> riderConfirmPickup(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        
        String riderId = request.get("riderId");
        
        return bookingService.getBookingById(id)
                .map(booking -> {
                    if (!riderId.equals(booking.getRiderId())) {
                        return ResponseEntity.badRequest().body(null);
                    }
                    
                    if (!"PICKUP".equals(booking.getStatus())) {
                        return ResponseEntity.badRequest().body(Map.of(
                            "error", "Driver has not arrived at pickup yet"
                        ));
                    }
                    
                    booking.setStatus("RIDER_CONFIRMED");
                    log.info("Rider {} confirmed pickup for booking {}", riderId, id);
                    
                    // Notify driver that rider confirmed
                    try {
                        var driverNotificationService = applicationContext.getBean(DriverNotificationService.class);
                        driverNotificationService.notifyRider(booking.getDriverId(), Map.of(
                            "type", "RIDER_CONFIRMED",
                            "status", "RIDER_CONFIRMED",
                            "message", "✅ Rider confirmed pickup. You can now start the trip.",
                            "bookingId", id,
                            "riderId", riderId
                        ));
                    } catch (Exception e) {
                        log.error("Error notifying driver about rider confirmation", e);
                    }
                    
                    Booking updatedBooking = bookingService.updateBooking(booking);
                    return ResponseEntity.ok(updatedBooking);
                })
                .orElse(ResponseEntity.notFound().build());
    }
} 