// Bike Taxi Service Configuration
window.BikeTaxiConfig = {
    // Google Maps API Key
    GOOGLE_MAPS_API_KEY: 'AIzaSyB6-shv9yZ-TePQmbXUTiewlRUIe2Y-AAo',
    
    // Service URLs
    SERVICES: {
        BOOKING_SERVICE: 'http://localhost:8080',
        MATCHING_SERVICE: 'http://localhost:8080',
        RIDER_UI: 'http://localhost:5500',
        DRIVER_SIMULATOR: 'http://localhost:5500/driver-simulator'
    },
    
    // WebSocket URLs
    WEBSOCKETS: {
        DRIVER_LOCATION: 'ws://localhost:8080/ws/driver-location',
        DRIVER_NOTIFICATION: 'ws://localhost:8080/ws/driver-notifications'
    },
    
    // Map Configuration
    MAP: {
        DEFAULT_CENTER: { lat: 17.3850, lng: 78.4867 }, // Hyderabad
        DEFAULT_ZOOM: 12,
        MAX_ZOOM: 18,
        MIN_ZOOM: 8
    },
    
    // Booking Configuration
    BOOKING: {
        MAX_DISTANCE_KM: 50,
        SEARCH_RADIUS_KM: 10,
        ESTIMATED_PICKUP_TIME_MINUTES: 5
    }
};

// Helper function to get Google Maps API URL
window.getGoogleMapsApiUrl = function() {
    return `https://maps.googleapis.com/maps/api/js?key=${window.BikeTaxiConfig.GOOGLE_MAPS_API_KEY}&libraries=places`;
};

// Helper function to get service URL
window.getServiceUrl = function(serviceName) {
    return window.BikeTaxiConfig.SERVICES[serviceName] || '';
};

// Helper function to get WebSocket URL
window.getWebSocketUrl = function(wsName) {
    return window.BikeTaxiConfig.WEBSOCKETS[wsName] || '';
}; 