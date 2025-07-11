// Enhanced Location Service for Better Accuracy
class LocationService {
    constructor() {
        this.isWatching = false;
        this.watchId = null;
        this.lastPosition = null;
        this.accuracyThreshold = 50; // meters - increased threshold for better results
        this.maxAttempts = 5; // increased attempts
        this.attemptCount = 0;
        this.onLocationUpdate = null;
        this.onLocationError = null;
        this.onAccuracyImprovement = null;
        this.bestPosition = null; // track the best position we've seen
    }

    // Request location with high accuracy settings
    async getCurrentLocation(options = {}) {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            const defaultOptions = {
                enableHighAccuracy: true,
                timeout: 60000, // 60 seconds for better GPS acquisition
                maximumAge: 0, // Always get fresh position
                ...options
            };

            console.log('📍 Requesting location with options:', defaultOptions);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('✅ Location obtained:', {
                        accuracy: position.coords.accuracy,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        timestamp: new Date(position.timestamp).toLocaleString()
                    });
                    
                    // Check if accuracy is good enough
                    if (position.coords.accuracy > 100) {
                        console.warn('⚠️ Low accuracy location obtained:', position.coords.accuracy + 'm');
                    } else {
                        console.log('🎯 Good accuracy location:', position.coords.accuracy + 'm');
                    }
                    
                    resolve(position);
                },
                (error) => {
                    console.error('❌ Location error:', error);
                    reject(error);
                },
                defaultOptions
            );
        });
    }

    // Start watching location with continuous updates
    startWatching(options = {}) {
        if (this.isWatching) {
            console.log('📍 Already watching location');
            return;
        }

        if (!navigator.geolocation) {
            console.error('❌ Geolocation not supported');
            return;
        }

        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000, // Allow 5 second old positions
            ...options
        };

        console.log('📍 Starting location watch with options:', defaultOptions);

        this.isWatching = true;
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.handlePositionUpdate(position);
            },
            (error) => {
                this.handlePositionError(error);
            },
            defaultOptions
        );
    }

    // Stop watching location
    stopWatching() {
        if (this.watchId && navigator.geolocation) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.isWatching = false;
        console.log('📍 Stopped watching location');
    }

    // Handle position updates
    handlePositionUpdate(position) {
        console.log('📍 Position update:', {
            accuracy: position.coords.accuracy,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date(position.timestamp).toLocaleString()
        });

        // Check if this is a better position than the last one
        const isBetterPosition = !this.lastPosition || 
            position.coords.accuracy < this.lastPosition.coords.accuracy ||
            Math.abs(position.timestamp - this.lastPosition.timestamp) > 30000; // 30 seconds

        if (isBetterPosition) {
            this.lastPosition = position;
            
            // Call the update callback
            if (this.onLocationUpdate) {
                this.onLocationUpdate(position);
            }

            // Check if accuracy improved significantly
            if (this.lastPosition && position.coords.accuracy < this.accuracyThreshold) {
                console.log('🎯 High accuracy achieved:', position.coords.accuracy + 'm');
                if (this.onAccuracyImprovement) {
                    this.onAccuracyImprovement(position);
                }
            }
        }
    }

    // Handle position errors
    handlePositionError(error) {
        console.error('❌ Location watch error:', error);
        
        let errorMessage = 'Location error occurred';
        switch (error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = 'Location access denied. Please allow location access in your browser settings.';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable. Please check your GPS settings.';
                break;
            case error.TIMEOUT:
                errorMessage = 'Location request timed out. Please try again.';
                break;
        }

        if (this.onLocationError) {
            this.onLocationError(error, errorMessage);
        }
    }

    // Get location with retry logic
    async getLocationWithRetry(maxRetries = 5) {
        this.attemptCount = 0;
        this.bestPosition = null;
        
        while (this.attemptCount < maxRetries) {
            try {
                this.attemptCount++;
                console.log(`📍 Location attempt ${this.attemptCount}/${maxRetries}`);
                
                const position = await this.getCurrentLocation();
                
                // Track the best position we've seen
                if (!this.bestPosition || position.coords.accuracy < this.bestPosition.coords.accuracy) {
                    this.bestPosition = position;
                    console.log('🎯 New best position with accuracy:', position.coords.accuracy + 'm');
                }
                
                // If we got a good accuracy, return immediately
                if (position.coords.accuracy <= this.accuracyThreshold) {
                    console.log('🎯 Good accuracy achieved on attempt', this.attemptCount);
                    return position;
                }
                
                // If this is the last attempt, return the best position we found
                if (this.attemptCount >= maxRetries) {
                    console.log('⚠️ Using best position found with accuracy:', this.bestPosition.coords.accuracy + 'm');
                    return this.bestPosition;
                }
                
                // Wait before retrying (longer wait for better GPS)
                await new Promise(resolve => setTimeout(resolve, 8000));
                
            } catch (error) {
                console.error(`❌ Location attempt ${this.attemptCount} failed:`, error);
                
                if (this.attemptCount >= maxRetries) {
                    // Return best position if we have one, otherwise throw error
                    if (this.bestPosition) {
                        console.log('⚠️ Using best position after errors with accuracy:', this.bestPosition.coords.accuracy + 'm');
                        return this.bestPosition;
                    }
                    throw error;
                }
                
                // Wait before retrying (longer wait for better GPS)
                await new Promise(resolve => setTimeout(resolve, 8000));
            }
        }
    }

    // Get cached location from localStorage
    getCachedLocation() {
        try {
            const cached = localStorage.getItem('userLocation') || localStorage.getItem('driverLocation');
            if (cached) {
                const location = JSON.parse(cached);
                return {
                    coords: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        accuracy: location.accuracy || null
                    },
                    timestamp: location.timestamp || Date.now()
                };
            }
        } catch (error) {
            console.error('Error reading cached location:', error);
        }
        return null;
    }

    // Save location to localStorage
    saveLocation(position, type = 'user') {
        try {
            const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: Date.now()
            };
            
            const key = type === 'driver' ? 'driverLocation' : 'userLocation';
            localStorage.setItem(key, JSON.stringify(locationData));
            console.log('💾 Location saved to localStorage:', locationData);
        } catch (error) {
            console.error('Error saving location:', error);
        }
    }

    // Check if location permission is granted
    async checkPermission() {
        if (!navigator.permissions) {
            return 'unknown';
        }
        
        try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            return result.state;
        } catch (error) {
            console.error('Error checking permission:', error);
            return 'unknown';
        }
    }

    // Request permission explicitly
    async requestPermission() {
        try {
            const position = await this.getCurrentLocation({ timeout: 5000 });
            return 'granted';
        } catch (error) {
            if (error.code === error.PERMISSION_DENIED) {
                return 'denied';
            }
            return 'unknown';
        }
    }

    // Get location accuracy level description
    getAccuracyLevel(accuracy) {
        if (!accuracy || isNaN(accuracy)) return 'Unknown';
        if (accuracy <= 5) return 'Excellent';
        if (accuracy <= 10) return 'Good';
        if (accuracy <= 20) return 'Fair';
        if (accuracy <= 50) return 'Poor';
        return 'Very Poor';
    }

    // Get accuracy color for UI
    getAccuracyColor(accuracy) {
        if (!accuracy || isNaN(accuracy)) return '#6b7280';
        if (accuracy <= 5) return '#10b981'; // Green
        if (accuracy <= 10) return '#3b82f6'; // Blue
        if (accuracy <= 20) return '#f59e0b'; // Yellow
        if (accuracy <= 50) return '#f97316'; // Orange
        return '#ef4444'; // Red
    }
}

// Create global instance
window.locationService = new LocationService(); 