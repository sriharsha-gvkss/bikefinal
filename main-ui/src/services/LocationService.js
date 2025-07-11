class LocationService {
  constructor() {
    this.watchId = null;
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) return;
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      return;
    }

    this.isInitialized = true;
  }

  // Get current real location
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  // Watch real location changes
  watchLocation(callback) {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        callback({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        console.error('Location watch error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  // Simulate movement based on current location and speed
  simulateMovement(currentLocation, speedKmh) {
    // Convert speed from km/h to degrees per second (approximate)
    // 1 degree of latitude ≈ 111 km
    // 1 degree of longitude ≈ 111 * cos(latitude) km
    const speedDegreesPerSecond = speedKmh / (111 * 1000 * 3600); // Convert to degrees per second
    
    // Random direction change (0 to 2π radians)
    const direction = Math.random() * 2 * Math.PI;
    
    // Calculate new position
    const latChange = speedDegreesPerSecond * Math.cos(direction);
    const lngChange = speedDegreesPerSecond * Math.sin(direction) / Math.cos(currentLocation.lat * Math.PI / 180);
    
    // Add some randomness to make movement more realistic
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    
    const newLat = currentLocation.lat + (latChange * randomFactor);
    const newLng = currentLocation.lng + (lngChange * randomFactor);
    
    return {
      lat: newLat,
      lng: newLng,
      speed: speedKmh,
      direction: direction * 180 / Math.PI // Convert to degrees
    };
  }

  // Calculate distance between two points in kilometers
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Generate a route between two points
  generateRoute(startLocation, endLocation, numPoints = 10) {
    const route = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const lat = startLocation.lat + (endLocation.lat - startLocation.lat) * t;
      const lng = startLocation.lng + (endLocation.lng - startLocation.lng) * t;
      route.push({ lat, lng });
    }
    return route;
  }

  // Stop watching location
  stopWatching() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // Cleanup
  cleanup() {
    this.stopWatching();
    this.isInitialized = false;
  }
}

export default LocationService; 