// Configuration for the Bike Taxi App
const config = {
  // Backend service URLs - can be overridden by environment variables
  bookingServiceUrl: process.env.REACT_APP_BOOKING_SERVICE_URL || 'http://localhost:8080',
  driverMatchingServiceUrl: process.env.REACT_APP_DRIVER_MATCHING_SERVICE_URL || 'http://localhost:8082',
  
  // WebSocket URLs
  bookingServiceWsUrl: process.env.REACT_APP_BOOKING_SERVICE_WS_URL || 'ws://localhost:8080',
  driverMatchingServiceWsUrl: process.env.REACT_APP_DRIVER_MATCHING_SERVICE_WS_URL || 'ws://localhost:8082',
  
  // Google Maps API Key
  googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg',
  
  // App settings
  appName: 'Bike Taxi App',
  version: '1.0.0',
  
  // Feature flags
  features: {
    realTimeTracking: true,
    locationServices: true,
    notifications: true,
    maps: true
  }
};

export default config; 