// Global variables - ensure they are properly declared in global scope
let map;
let pickupMarker = null;
let destinationMarker = null;
let driverMarkers = [];
let websocket;
let isLocationSelectionMode = false;
let currentLocationType = null;
let tempMarker = null;
let mapInitialized = false;
let geocoder = null;
let autocompleteService = null;
let placesService = null;
let currentBookingId = null; // Track current booking
let routePolyline = null; // Track the route line
let directionsService = null; // Google Directions service
let priceDisplay = null; // Price display element

// Authentication variables
let currentUser = null;
let sessionToken = null;
let authenticationChecked = false; // Prevent multiple auth checks

// Location services variables
let userLocation = null;
let locationPermissionGranted = false;
let nearbyPlacesService = null;
let currentLocationMarker = null;
let currentLocationAccuracyCircle = null;

// Add initialization guards to prevent multiple calls
let initializationInProgress = false;
let domReadyCalled = false;
let googleMapsReadyCalled = false;
let locationRequestInProgress = false;
let websocketInitialized = false;

// Debounce function to prevent excessive calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced versions of frequently called functions
const debouncedValidateForm = debounce(validateForm, 300);
const debouncedShowMessage = debounce(showMessage, 200);

// Simple, direct global functions that work immediately
window.setCurrentLocationAsPickup = function() {
    console.log('📍 Use Current Location button clicked');
    
    if (!navigator.geolocation) {
        alert('❌ Geolocation is not supported by your browser.');
        return;
    }
    
    if (!map) {
        alert('❌ Map is not ready. Please wait a moment and try again.');
        return;
    }
    
    // Show loading message
    alert('📍 Getting your location... Please wait.');
    
    let locationAttempts = 0;
    const maxAttempts = 3;
    
    function tryGetLocation() {
        locationAttempts++;
        console.log(`📍 Location attempt ${locationAttempts}/${maxAttempts}`);
        
        const options = {
            enableHighAccuracy: true,
            timeout: 20000, // Increased timeout
            maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                console.log('✅ Got current position:', position.coords);
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                
                // Validate coordinates
                if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                    console.error('❌ Invalid coordinates received');
                    if (locationAttempts < maxAttempts) {
                        alert('❌ Invalid location received. Retrying...');
                        setTimeout(tryGetLocation, 1000);
                    } else {
                        alert('❌ Unable to get valid location after multiple attempts. Please try again later.');
                    }
                    return;
                }
                
                // Center map on user location
                const userLatLng = new google.maps.LatLng(lat, lng);
                map.setCenter(userLatLng);
                map.setZoom(15);
                
                // Remove existing marker
                if (currentLocationMarker) {
                    currentLocationMarker.setMap(null);
                }
                
                // Add new marker
                currentLocationMarker = new google.maps.Marker({
                    position: userLatLng,
                    map: map,
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" fill="#4285F4" stroke="white" stroke-width="2"/>
                                <circle cx="12" cy="12" r="4" fill="white"/>
                            </svg>
                        `),
                        scaledSize: new google.maps.Size(24, 24),
                        anchor: new google.maps.Point(12, 12)
                    },
                    title: 'Your Current Location'
                });
                
                // Get the actual address name using reverse geocoding
                getAddressFromCoordinates(userLatLng)
                    .then(addressName => {
                        console.log('✅ Location address obtained:', addressName);
                        const pickupInput = document.getElementById('pickup');
                        if (pickupInput) {
                            pickupInput.value = addressName;
                        }
                    })
                    .catch(error => {
                        console.error('❌ Location geocoding failed:', error);
                        // Fallback to coordinates
                        const fallbackName = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                        const pickupInput = document.getElementById('pickup');
                        if (pickupInput) {
                            pickupInput.value = fallbackName;
                        }
                    });
                
                // Show accuracy circle
                if (currentLocationAccuracyCircle) {
                    currentLocationAccuracyCircle.setMap(null);
                }
                if (accuracy && !isNaN(accuracy) && accuracy > 0) {
                    currentLocationAccuracyCircle = new google.maps.Circle({
                        strokeColor: '#4285F4',
                        strokeOpacity: 0.3,
                        strokeWeight: 2,
                        fillColor: '#4285F4',
                        fillOpacity: 0.10,
                        map: map,
                        center: userLatLng,
                        radius: accuracy
                    });
                }
                
                // Show success message with quality indicator
                const accuracyText = accuracy ? `${Math.round(accuracy)}m` : 'unknown';
                let qualityMessage = '';
                if (accuracy <= 10) {
                    qualityMessage = 'Excellent accuracy!';
                } else if (accuracy <= 50) {
                    qualityMessage = 'Good accuracy!';
                } else if (accuracy <= 100) {
                    qualityMessage = 'Fair accuracy.';
                } else {
                    qualityMessage = 'Low accuracy. Consider moving to an open area.';
                }
                
                alert(`✅ Current location set as pickup point!\n\n${qualityMessage}\nAccuracy: ${accuracyText}\nCoordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                
                console.log('📍 Location set successfully. Accuracy:', accuracy, 'meters');
                
                // Save location for future use
                localStorage.setItem('lastKnownLocation', JSON.stringify({
                    lat: lat,
                    lng: lng,
                    accuracy: accuracy,
                    timestamp: Date.now()
                }));
            },
            function(error) {
                console.error('❌ Location error:', error);
                let errorMessage = '';
                let shouldRetry = false;
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = '❌ Location access denied. Please allow location access in your browser settings and try again.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = '❌ Location information unavailable.';
                        shouldRetry = true;
                        break;
                    case error.TIMEOUT:
                        errorMessage = '❌ Location request timed out.';
                        shouldRetry = true;
                        break;
                    default:
                        errorMessage = '❌ An unknown location error occurred.';
                        shouldRetry = true;
                }
                
                if (shouldRetry && locationAttempts < maxAttempts) {
                    alert(errorMessage + '\n\nRetrying...');
                    setTimeout(tryGetLocation, 2000);
                } else {
                    // Try to use last known location
                    const lastLocation = localStorage.getItem('lastKnownLocation');
                    if (lastLocation) {
                        try {
                            const locationData = JSON.parse(lastLocation);
                            const age = Date.now() - locationData.timestamp;
                            const ageMinutes = Math.round(age / 60000);
                            
                            if (ageMinutes < 30) { // Only use if less than 30 minutes old
                                if (confirm(`❌ ${errorMessage}\n\nWould you like to use your last known location from ${ageMinutes} minutes ago?`)) {
                                    const userLatLng = new google.maps.LatLng(locationData.lat, locationData.lng);
                                    map.setCenter(userLatLng);
                                    map.setZoom(15);
                                    
                                    if (currentLocationMarker) {
                                        currentLocationMarker.setMap(null);
                                    }
                                    
                                    currentLocationMarker = new google.maps.Marker({
                                        position: userLatLng,
                                        map: map,
                                        icon: {
                                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="12" cy="12" r="10" fill="#FFA500" stroke="white" stroke-width="2"/>
                                                    <circle cx="12" cy="12" r="4" fill="white"/>
                                                </svg>
                                            `),
                                            scaledSize: new google.maps.Size(24, 24),
                                            anchor: new google.maps.Point(12, 12)
                                        },
                                        title: 'Last Known Location'
                                    });
                                    
                                    const pickupInput = document.getElementById('pickup');
                                    if (pickupInput) {
                                        pickupInput.value = 'Last Known Location';
                                    }
                                    
                                    alert(`⚠️ Using last known location from ${ageMinutes} minutes ago.\nCoordinates: ${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}`);
                                    return;
                                }
                            }
                        } catch (e) {
                            console.error('Error parsing last location:', e);
                        }
                    }
                    
                    alert(errorMessage + '\n\nPlease try again or manually select your location on the map.');
                }
            },
            options
        );
    }
    
    // Start the location attempt
    tryGetLocation();
};

window.requestLocationPermission = function() {
    console.log('📍 Retry Location button clicked');
    
    if (!navigator.geolocation) {
        alert('❌ Geolocation is not supported by your browser.');
        return;
    }
    
    if (!map) {
        alert('❌ Map is not ready. Please wait a moment and try again.');
        return;
    }
    
    // Show loading message
    alert('📍 Getting fresh location... Please wait.');
    
    let locationAttempts = 0;
    const maxAttempts = 2;
    
    function tryGetLocation() {
        locationAttempts++;
        console.log(`📍 Retry location attempt ${locationAttempts}/${maxAttempts}`);
        
        const options = {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                console.log('✅ Got fresh position:', position.coords);
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                
                // Validate coordinates
                if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                    console.error('❌ Invalid coordinates received');
                    if (locationAttempts < maxAttempts) {
                        alert('❌ Invalid location received. Retrying...');
                        setTimeout(tryGetLocation, 1000);
                    } else {
                        alert('❌ Unable to get valid location. Please try again later.');
                    }
                    return;
                }
                
                // Center map on user location
                const userLatLng = new google.maps.LatLng(lat, lng);
                map.setCenter(userLatLng);
                map.setZoom(15);
                
                // Remove existing marker
                if (currentLocationMarker) {
                    currentLocationMarker.setMap(null);
                }
                
                // Add new marker
                currentLocationMarker = new google.maps.Marker({
                    position: userLatLng,
                    map: map,
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" fill="#4285F4" stroke="white" stroke-width="2"/>
                                <circle cx="12" cy="12" r="4" fill="white"/>
                            </svg>
                        `),
                        scaledSize: new google.maps.Size(24, 24),
                        anchor: new google.maps.Point(12, 12)
                    },
                    title: 'Your Current Location'
                });
                
                // Show accuracy circle
                if (currentLocationAccuracyCircle) {
                    currentLocationAccuracyCircle.setMap(null);
                }
                if (accuracy && !isNaN(accuracy) && accuracy > 0) {
                    currentLocationAccuracyCircle = new google.maps.Circle({
                        strokeColor: '#4285F4',
                        strokeOpacity: 0.3,
                        strokeWeight: 2,
                        fillColor: '#4285F4',
                        fillOpacity: 0.10,
                        map: map,
                        center: userLatLng,
                        radius: accuracy
                    });
                }
                
                // Show success message with quality indicator
                const accuracyText = accuracy ? `${Math.round(accuracy)}m` : 'unknown';
                let qualityMessage = '';
                if (accuracy <= 10) {
                    qualityMessage = 'Excellent accuracy!';
                } else if (accuracy <= 50) {
                    qualityMessage = 'Good accuracy!';
                } else if (accuracy <= 100) {
                    qualityMessage = 'Fair accuracy.';
                } else {
                    qualityMessage = 'Low accuracy. Consider moving to an open area.';
                }
                
                alert(`✅ Location updated successfully!\n\n${qualityMessage}\nAccuracy: ${accuracyText}\nCoordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                
                console.log('📍 Location updated successfully. Accuracy:', accuracy, 'meters');
                
                // Save location for future use
                localStorage.setItem('lastKnownLocation', JSON.stringify({
                    lat: lat,
                    lng: lng,
                    accuracy: accuracy,
                    timestamp: Date.now()
                }));
            },
            function(error) {
                console.error('❌ Location error:', error);
                let errorMessage = '';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = '❌ Location access denied. Please allow location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = '❌ Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = '❌ Location request timed out.';
                        break;
                    default:
                        errorMessage = '❌ An unknown location error occurred.';
                }
                
                if (locationAttempts < maxAttempts) {
                    alert(errorMessage + '\n\nRetrying...');
                    setTimeout(tryGetLocation, 2000);
                } else {
                    alert(errorMessage + '\n\nPlease try again or manually select your location on the map.');
                }
            },
            options
        );
    }
    
    // Start the location attempt
    tryGetLocation();
};

// New function for refreshing location with better reliability
window.refreshLocation = function() {
    console.log('📍 Refresh Location button clicked');
    
    if (!navigator.geolocation) {
        alert('❌ Geolocation is not supported by your browser.');
        return;
    }
    
    if (!map) {
        alert('❌ Map is not ready. Please wait a moment and try again.');
        return;
    }
    
    // Show loading message
    alert('📍 Refreshing your location... Please wait.');
    
    let locationAttempts = 0;
    const maxAttempts = 3;
    
    function tryGetLocation() {
        locationAttempts++;
        console.log(`📍 Refresh location attempt ${locationAttempts}/${maxAttempts}`);
        
        // Use different strategies for each attempt
        let options;
        if (locationAttempts === 1) {
            // First attempt: High accuracy, short timeout
            options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            };
        } else if (locationAttempts === 2) {
            // Second attempt: Lower accuracy, longer timeout
            options = {
                enableHighAccuracy: false,
                timeout: 25000,
                maximumAge: 60000 // Accept location up to 1 minute old
            };
        } else {
            // Third attempt: Any accuracy, very long timeout
            options = {
                enableHighAccuracy: false,
                timeout: 30000,
                maximumAge: 300000 // Accept location up to 5 minutes old
            };
        }
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                console.log('✅ Got refreshed position:', position.coords);
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                
                // Validate coordinates
                if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                    console.error('❌ Invalid coordinates received');
                    if (locationAttempts < maxAttempts) {
                        alert('❌ Invalid location received. Trying different method...');
                        setTimeout(tryGetLocation, 1000);
                    } else {
                        alert('❌ Unable to get valid location after multiple attempts. Please try again later.');
                    }
                    return;
                }
                
                // Center map on user location
                const userLatLng = new google.maps.LatLng(lat, lng);
                map.setCenter(userLatLng);
                map.setZoom(15);
                
                // Remove existing marker
                if (currentLocationMarker) {
                    currentLocationMarker.setMap(null);
                }
                
                // Add new marker with different color based on accuracy
                let markerColor = '#4285F4'; // Blue for good accuracy
                if (accuracy > 100) {
                    markerColor = '#FFA500'; // Orange for low accuracy
                } else if (accuracy > 50) {
                    markerColor = '#FFD700'; // Yellow for fair accuracy
                }
                
                currentLocationMarker = new google.maps.Marker({
                    position: userLatLng,
                    map: map,
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" fill="${markerColor}" stroke="white" stroke-width="2"/>
                                <circle cx="12" cy="12" r="4" fill="white"/>
                            </svg>
                        `),
                        scaledSize: new google.maps.Size(24, 24),
                        anchor: new google.maps.Point(12, 12)
                    },
                    title: 'Your Current Location'
                });
                
                // Show accuracy circle
                if (currentLocationAccuracyCircle) {
                    currentLocationAccuracyCircle.setMap(null);
                }
                if (accuracy && !isNaN(accuracy) && accuracy > 0) {
                    currentLocationAccuracyCircle = new google.maps.Circle({
                        strokeColor: markerColor,
                        strokeOpacity: 0.3,
                        strokeWeight: 2,
                        fillColor: markerColor,
                        fillOpacity: 0.10,
                        map: map,
                        center: userLatLng,
                        radius: accuracy
                    });
                }
                
                // Show success message with quality indicator
                const accuracyText = accuracy ? `${Math.round(accuracy)}m` : 'unknown';
                let qualityMessage = '';
                if (accuracy <= 10) {
                    qualityMessage = 'Excellent accuracy!';
                } else if (accuracy <= 50) {
                    qualityMessage = 'Good accuracy!';
                } else if (accuracy <= 100) {
                    qualityMessage = 'Fair accuracy.';
                } else {
                    qualityMessage = 'Low accuracy. Consider moving to an open area.';
                }
                
                alert(`✅ Location refreshed successfully!\n\n${qualityMessage}\nAccuracy: ${accuracyText}\nCoordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                
                console.log('📍 Location refreshed successfully. Accuracy:', accuracy, 'meters');
                
                // Save location for future use
                localStorage.setItem('lastKnownLocation', JSON.stringify({
                    lat: lat,
                    lng: lng,
                    accuracy: accuracy,
                    timestamp: Date.now()
                }));
            },
            function(error) {
                console.error('❌ Location error:', error);
                let errorMessage = '';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = '❌ Location access denied. Please allow location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = '❌ Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = '❌ Location request timed out.';
                        break;
                    default:
                        errorMessage = '❌ An unknown location error occurred.';
                }
                
                if (locationAttempts < maxAttempts) {
                    alert(errorMessage + '\n\nTrying different method...');
                    setTimeout(tryGetLocation, 2000);
                } else {
                    // Try to use last known location as fallback
                    const lastLocation = localStorage.getItem('lastKnownLocation');
                    if (lastLocation) {
                        try {
                            const locationData = JSON.parse(lastLocation);
                            const age = Date.now() - locationData.timestamp;
                            const ageMinutes = Math.round(age / 60000);
                            
                            if (ageMinutes < 60) { // Only use if less than 1 hour old
                                if (confirm(`❌ ${errorMessage}\n\nWould you like to use your last known location from ${ageMinutes} minutes ago?`)) {
                                    const userLatLng = new google.maps.LatLng(locationData.lat, locationData.lng);
                                    map.setCenter(userLatLng);
                                    map.setZoom(15);
                                    
                                    if (currentLocationMarker) {
                                        currentLocationMarker.setMap(null);
                                    }
                                    
                                    currentLocationMarker = new google.maps.Marker({
                                        position: userLatLng,
                                        map: map,
                                        icon: {
                                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="12" cy="12" r="10" fill="#FFA500" stroke="white" stroke-width="2"/>
                                                    <circle cx="12" cy="12" r="4" fill="white"/>
                                                </svg>
                                            `),
                                            scaledSize: new google.maps.Size(24, 24),
                                            anchor: new google.maps.Point(12, 12)
                                        },
                                        title: 'Last Known Location'
                                    });
                                    
                                    alert(`⚠️ Using last known location from ${ageMinutes} minutes ago.\nCoordinates: ${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}`);
                                    return;
                                }
                            }
                        } catch (e) {
                            console.error('Error parsing last location:', e);
                        }
                    }
                    
                    alert(errorMessage + '\n\nPlease try again or manually select your location on the map.');
                }
            },
            options
        );
    }
    
    // Start the location attempt
    tryGetLocation();
};

window.logout = function() {
    console.log('🚪 Logout button clicked');
    if (confirm('Are you sure you want to logout?')) {
        try {
            // Clear all storage
            sessionStorage.clear();
            localStorage.clear();
            console.log('✅ All storage cleared');
            
            // Show logout message
            alert('✅ Logged out successfully! Redirecting to login page...');
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        } catch (error) {
            console.error('❌ Error during logout:', error);
            alert('❌ Error during logout. Redirecting anyway...');
            window.location.href = 'login.html';
        }
    }
};

window.submitBooking = function() {
    console.log('📱 Book Ride button clicked');
    const pickupInput = document.getElementById('pickup');
    const destinationInput = document.getElementById('destination');
    
    if (!pickupInput || !destinationInput) {
        alert('❌ Please fill in both pickup and destination locations.');
        return;
    }
    
    const pickup = pickupInput.value.trim();
    const destination = destinationInput.value.trim();
    
    if (!pickup || !destination) {
        alert('❌ Please fill in both pickup and destination locations.');
        return;
    }
    
    alert('✅ Booking submitted! Looking for nearby drivers...');
    console.log('📱 Booking submitted:', { pickup, destination });
};

window.clearMarkers = function() {
    console.log('🗑️ Clear Markers button clicked');
    if (pickupMarker) {
        pickupMarker.setMap(null);
        pickupMarker = null;
    }
    if (destinationMarker) {
        destinationMarker.setMap(null);
        destinationMarker = null;
    }
    if (currentLocationMarker) {
        currentLocationMarker.setMap(null);
        currentLocationMarker = null;
    }
    if (currentLocationAccuracyCircle) {
        currentLocationAccuracyCircle.setMap(null);
        currentLocationAccuracyCircle = null;
    }
    alert('🗑️ All markers cleared!');
};

window.resetMap = function() {
    console.log('🔄 Reset Map button clicked');
    clearMarkers();
    if (map) {
        map.setZoom(10);
        map.setCenter({ lat: 20.5937, lng: 78.9629 }); // India center
    }
    alert('🔄 Map reset to default view!');
};

window.acceptRide = function() {
    console.log('✅ Accept Ride button clicked');
    alert('✅ Ride accepted! Driver is on the way.');
};

window.declineRide = function() {
    console.log('❌ Decline Ride button clicked');
    alert('❌ Ride declined.');
};

// Debug function to track mode changes
function setLocationSelectionMode(value, source) {
    console.log(`🔍 MODE CHANGE: isLocationSelectionMode = ${value} (called from: ${source})`);
    isLocationSelectionMode = value;
}

// Initialize the map (called when Google Maps API is ready)
function initMap() {
    console.log('=== INIT MAP CALLED ===');
    console.log('mapInitialized:', mapInitialized);
    console.log('initializationInProgress:', initializationInProgress);
    console.log('map:', map);
    
    if (mapInitialized || initializationInProgress) {
        console.log('Map already initialized or initialization in progress, skipping...');
        return;
    }
    
    if (map) {
        console.log('Map already exists, skipping...');
        mapInitialized = true;
        return;
    }
    
    initializationInProgress = true;
    
    console.log('Initializing map...');
    
    // Default to a central location (you can change this to your preferred default)
    const defaultLocation = { lat: 20.5937, lng: 78.9629 }; // India center
    
    // Create the map
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 10,
        center: defaultLocation,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ]
    });
    
    console.log('Map created:', map);
    
    // Initialize services
    geocoder = new google.maps.Geocoder();
    autocompleteService = new google.maps.places.AutocompleteService();
    placesService = new google.maps.places.PlacesService(map);
    nearbyPlacesService = new google.maps.places.PlacesService(map);
    directionsService = new google.maps.DirectionsService();
    
    console.log('Services initialized:', {
        geocoder: !!geocoder,
        autocompleteService: !!autocompleteService,
        placesService: !!placesService,
        nearbyPlacesService: !!nearbyPlacesService,
        directionsService: !!directionsService
    });
    
    // Add map click listener - CRITICAL: This must be added AFTER map creation
    console.log('Adding map click listener...');
    map.addListener('click', handleMapClick);
    
    console.log('Map click listener added successfully');
    
    // Initialize WebSocket connection
    initWebSocket();
    
    // Try to get user's location automatically after map loads
    setTimeout(() => {
        console.log('📍 Attempting to get user location automatically...');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    console.log('✅ Auto-detected user location:', position.coords);
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                        const userLatLng = new google.maps.LatLng(lat, lng);
                        map.setCenter(userLatLng);
                        map.setZoom(15);
                        
                        // Add marker for user location
                        if (currentLocationMarker) {
                            currentLocationMarker.setMap(null);
                        }
                        currentLocationMarker = new google.maps.Marker({
                            position: userLatLng,
                            map: map,
                            icon: {
                                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" fill="#4285F4" stroke="white" stroke-width="2"/>
                                        <circle cx="12" cy="12" r="4" fill="white"/>
                                    </svg>
                                `),
                                scaledSize: new google.maps.Size(24, 24),
                                anchor: new google.maps.Point(12, 12)
                            },
                            title: 'Your Current Location'
                        });
                        
                        // Get the actual address name using reverse geocoding
                        getAddressFromCoordinates(userLatLng)
                            .then(addressName => {
                                console.log('✅ Auto-location address obtained:', addressName);
                                const pickupInput = document.getElementById('pickup');
                                if (pickupInput) {
                                    pickupInput.value = addressName;
                                }
                                
                                // Create pickup marker for route calculation
                                console.log('🔄 Creating pickup marker for auto-location...');
                                placeMarker(userLatLng, 'pickup', addressName);
                            })
                            .catch(error => {
                                console.error('❌ Auto-location geocoding failed:', error);
                                // Fallback to coordinates
                                const fallbackName = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                                const pickupInput = document.getElementById('pickup');
                                if (pickupInput) {
                                    pickupInput.value = fallbackName;
                                }
                                
                                // Create pickup marker with coordinates
                                console.log('🔄 Creating pickup marker with coordinates...');
                                placeMarker(userLatLng, 'pickup', fallbackName);
                            });
                        
                        // Save location
                        localStorage.setItem('lastKnownLocation', JSON.stringify({
                            lat: lat,
                            lng: lng,
                            accuracy: position.coords.accuracy,
                            timestamp: Date.now()
                        }));
                        
                        console.log('📍 Auto-location set successfully');
                    }
                },
                function(error) {
                    console.log('⚠️ Auto-location failed:', error.message);
                    // Don't show alert for auto-location failure
                },
                {
                    enableHighAccuracy: false, // Use faster, less accurate location for auto-detection
                    timeout: 10000,
                    maximumAge: 300000 // Accept location up to 5 minutes old
                }
            );
        }
    }, 2000); // Wait 2 seconds after map loads
    
    // Request location permission and get user location - but only if the function is available
    if (typeof requestLocationPermission === 'function') {
        // Don't call requestLocationPermission immediately since we have auto-location
        console.log('requestLocationPermission available but skipping immediate call due to auto-location');
    } else {
        console.log('requestLocationPermission not available yet, will be called later');
        // Call it after a short delay when the function is available
        setTimeout(() => {
            if (typeof requestLocationPermission === 'function') {
                console.log('requestLocationPermission now available but skipping due to auto-location');
            }
        }, 500);
    }
    
    // Set up event listeners AFTER services are initialized and DOM is ready
    setTimeout(() => {
        console.log('Document ready state:', document.readyState);
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setupEventListeners();
        } else {
            // Wait for DOM to be fully loaded
            document.addEventListener('DOMContentLoaded', setupEventListeners);
        }
    }, 200);
    
    mapInitialized = true;
    initializationInProgress = false;
    console.log('Map initialization complete');
}

// Wait for Google Maps API to load and then initialize
function waitForGoogleMaps() {
    console.log('=== WAIT FOR GOOGLE MAPS CALLED ===');
    console.log('mapInitialized:', mapInitialized);
    console.log('googleMapsReadyCalled:', googleMapsReadyCalled);
    console.log('google.maps available:', !!(window.google && window.google.maps));
    console.log('google.maps.places available:', !!(window.google && window.google.maps && window.google.maps.places));
    
    if (mapInitialized || googleMapsReadyCalled) {
        console.log('Map already initialized or Google Maps ready already called, skipping wait...');
        return;
    }
    
    googleMapsReadyCalled = true;
    
    if (window.google && window.google.maps && window.google.maps.places) {
        console.log('Google Maps API and Places API loaded, initializing map...');
        initMap();
    } else {
        console.log('Waiting for Google Maps API and Places API...');
        setTimeout(waitForGoogleMaps, 100);
    }
}

// Make waitForGoogleMaps available globally
window.waitForGoogleMaps = waitForGoogleMaps;

// Initialize when DOM is loaded
let domLoaded = false;

document.addEventListener('DOMContentLoaded', function() {
    if (domLoaded || domReadyCalled) {
        console.log('DOM already loaded or ready called, skipping...');
        return;
    }
    
    domLoaded = true;
    domReadyCalled = true;
    console.log('DOM loaded, waiting for Google Maps API...');
    
    // Functions will be assigned to window after they are defined later in the file
    
    // Check authentication first (but don't redirect immediately)
    checkAuthentication();
    
    // Start the map initialization process
    waitForGoogleMaps();
    
    // Check services after a delay
    setTimeout(() => {
        checkServices();
    }, 3000);
    
    // Prevent any accidental form submissions
    preventFormSubmissions();
    
    // Handle page unload events
    handlePageUnload();
});

// Prevent accidental form submissions
function preventFormSubmissions() {
    // Prevent any form submissions that might cause page reloads
    document.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Form submission prevented to avoid page reload');
        return false;
    });
    
    // Prevent any button clicks that might cause navigation
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON' && e.target.type === 'submit') {
            e.preventDefault();
            console.log('Submit button click prevented');
            return false;
        }
    });
}

// Handle page unload events to prevent accidental navigation
function handlePageUnload() {
    // Prevent accidental page refresh with F5
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
            e.preventDefault();
            console.log('Page refresh prevented');
            showMessage('Use the reset button instead of refreshing the page.', 'info');
            return false;
        }
    });
    
    // Warn before leaving the page if there's an active booking
    window.addEventListener('beforeunload', function(e) {
        if (currentBookingId) {
            e.preventDefault();
            e.returnValue = 'You have an active booking. Are you sure you want to leave?';
            return e.returnValue;
        }
    });
}

// Request location permission and get user location
function requestLocationPermission() {
    console.log('Requesting location permission...');
    
    if (locationRequestInProgress) {
        console.log('Location request already in progress, skipping...');
        return;
    }
    
    locationRequestInProgress = true;
    
    // Show loading message
    debouncedShowMessage('Getting your location...', 'info');
    let gotFreshLocation = false;
    // Add Retry Location button
    let retryBtn = document.getElementById('retryLocationBtn');
    if (!retryBtn) {
        retryBtn = document.createElement('button');
        retryBtn.id = 'retryLocationBtn';
        retryBtn.textContent = 'Retry Location';
        retryBtn.style = 'margin: 10px 0; padding: 6px 16px; border-radius: 6px; background: #4285F4; color: #fff; border: none; font-weight: 600; cursor: pointer;';
        retryBtn.onclick = requestLocationPermission;
        document.body.prepend(retryBtn);
    }
    // Add a tip for desktop users
    if (!/Mobi|Android/i.test(navigator.userAgent)) {
        showMessage('Tip: For best accuracy, use a mobile device with GPS.', 'info');
    }
    if (!navigator.geolocation) {
        showMessage('Location services not supported by your browser.', 'info');
        return;
    }
    // Use watchPosition for live updates
    const geoSuccess = function(position) {
        gotFreshLocation = true;
        updateUserLocation(position);
    };
    const geoError = function(error) {
        handleLocationError(error);
    };
    navigator.geolocation.getCurrentPosition(geoSuccess, geoError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
    navigator.geolocation.watchPosition(geoSuccess, geoError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
    // Fallback to cached location after 5 seconds if no fresh location
    setTimeout(function() {
        if (!gotFreshLocation) {
            const savedLocation = localStorage.getItem('userLocation');
            if (savedLocation) {
                try {
                    const locationData = JSON.parse(savedLocation);
                    userLocation = {
                        lat: locationData.latitude,
                        lng: locationData.longitude,
                        accuracy: locationData.accuracy
                    };
                    const userLatLng = new google.maps.LatLng(userLocation.lat, userLocation.lng);
                    map.setCenter(userLatLng);
                    map.setZoom(15);
                    addCurrentLocationMarker(userLatLng, userLocation.accuracy);
                    getLandmarkName(userLatLng, 'current');
                    showMessage('Used last known location. Accuracy: ' + (userLocation.accuracy ? userLocation.accuracy + 'm' : 'unknown'), 'info');
                } catch (error) {
                    showMessage('Unable to get your location. Please allow location access.', 'error');
                }
            } else {
                showMessage('Unable to get your location. Please allow location access.', 'error');
            }
        }
    }, 5000);
}
function updateUserLocation(position) {
    locationPermissionGranted = true;
    locationRequestInProgress = false;
    userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
    };
    // Save to localStorage for future use
    localStorage.setItem('userLocation', JSON.stringify({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        accuracy: userLocation.accuracy,
        timestamp: Date.now()
    }));
    // Center map on user location
    const userLatLng = new google.maps.LatLng(userLocation.lat, userLocation.lng);
    map.setCenter(userLatLng);
    map.setZoom(15);
    // Add current location marker
    addCurrentLocationMarker(userLatLng, userLocation.accuracy);
    // Get landmark name for current location
    getLandmarkName(userLatLng, 'current');
    showMessage('Live location updated! Accuracy: ' + (userLocation.accuracy ? userLocation.accuracy + 'm' : 'unknown'), 'success');
}
function handleLocationError(error) {
    locationPermissionGranted = false;
    locationRequestInProgress = false;
    switch(error.code) {
        case error.PERMISSION_DENIED:
            showMessage('Location access denied. You can still use the map manually.', 'info');
            break;
        case error.POSITION_UNAVAILABLE:
            showMessage('Location information unavailable. Please try again.', 'info');
            break;
        case error.TIMEOUT:
            showMessage('Location request timed out. Please try again.', 'info');
            break;
        default:
            showMessage('Location error occurred. You can still use the map manually.', 'info');
            break;
    }
}
// Update addCurrentLocationMarker to show accuracy in marker title
function addCurrentLocationMarker(position, accuracy) {
    if (currentLocationMarker) {
        currentLocationMarker.setMap(null);
    }
    currentLocationMarker = new google.maps.Marker({
        position: position,
        map: map,
        icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#4285F4" stroke="white" stroke-width="2"/>
                    <circle cx="12" cy="12" r="4" fill="white"/>
                </svg>
            `),
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 12)
        },
        title: 'Your Current Location' + (accuracy ? ' (Accuracy: ' + accuracy + 'm)' : '')
    });
    // Draw/update accuracy circle
    if (currentLocationAccuracyCircle) {
        currentLocationAccuracyCircle.setMap(null);
    }
    if (accuracy && !isNaN(accuracy)) {
        currentLocationAccuracyCircle = new google.maps.Circle({
            strokeColor: '#4285F4',
            strokeOpacity: 0.3,
            strokeWeight: 2,
            fillColor: '#4285F4',
            fillOpacity: 0.10,
            map: map,
            center: position,
            radius: accuracy
        });
    }
}

// Get address name from coordinates using reverse geocoding
async function getAddressFromCoordinates(position) {
    return new Promise((resolve, reject) => {
        console.log('=== GET ADDRESS FROM COORDINATES ===');
        console.log('Position:', position.lat(), position.lng());
        console.log('Geocoder available:', !!geocoder);
        console.log('Google Maps available:', !!(window.google && window.google.maps));
        
        // Ensure geocoder is available
        if (!geocoder) {
            console.log('🔄 Geocoder not available - initializing...');
            if (window.google && window.google.maps) {
                geocoder = new google.maps.Geocoder();
                console.log('✅ Geocoder initialized');
            } else {
                console.error('❌ Google Maps not available');
                reject(new Error('Google Maps not available'));
                return;
            }
        }
        
        // Add a small delay to ensure geocoder is ready
        setTimeout(() => {
            console.log('🔄 Starting geocoding...');
            geocoder.geocode({ location: position }, function(results, status) {
                console.log('Geocoding callback - status:', status);
                console.log('Results:', results);
                
                if (status === 'OK' && results[0]) {
                    const result = results[0];
                    console.log('✅ Reverse geocoding successful:', result);
                    
                    // Extract a readable address name
                    let addressName = extractReadableAddress(result);
                    console.log('✅ Extracted address name:', addressName);
                    
                    resolve(addressName);
                } else {
                    console.error('❌ Reverse geocoding failed:', status);
                    console.error('Results:', results);
                    reject(new Error(`Geocoding failed: ${status}`));
                }
            });
        }, 100); // Small delay to ensure geocoder is ready
    });
}

// Get landmark name from coordinates using reverse geocoding
function getLandmarkName(position, type) {
    console.log(`Getting landmark name for ${type} location:`, position);
    
    if (!geocoder) {
        console.error('Geocoder not available');
        return;
    }
    
    geocoder.geocode({ location: position }, function(results, status) {
        if (status === 'OK' && results[0]) {
            const result = results[0];
            console.log('Reverse geocoding result:', result);
            
            // Extract landmark name from address components
            let landmarkName = extractLandmarkName(result);
            
            if (type === 'current') {
                console.log('Current location landmark:', landmarkName);
                // Store current location landmark
                userLocation.landmark = landmarkName;
            } else if (type === 'pickup' || type === 'destination') {
                console.log(`${type} location landmark:`, landmarkName);
                
                // Update input field with landmark name
                const inputField = type === 'pickup' ? 
                    document.getElementById('pickup') : 
                    document.getElementById('destination');
                
                if (inputField) {
                    inputField.value = landmarkName;
                    console.log(`Updated ${type} input field with:`, landmarkName);
                }
                
                // Update marker title
                const marker = type === 'pickup' ? pickupMarker : destinationMarker;
                if (marker) {
                    marker.setTitle(landmarkName);
                }
            }
            
            // Also search for nearby places for better landmark names
            searchNearbyPlaces(position, type);
            
        } else {
            console.error('Reverse geocoding failed:', status);
            // Fallback to coordinates
            const fallbackName = `${position.lat().toFixed(6)}, ${position.lng().toFixed(6)}`;
            
            if (type === 'pickup' || type === 'destination') {
                const inputField = type === 'pickup' ? 
                    document.getElementById('pickup') : 
                    document.getElementById('destination');
                
                if (inputField) {
                    inputField.value = fallbackName;
                }
            }
        }
    });
}

// Extract a readable address from geocoding result
function extractReadableAddress(result) {
    console.log('Extracting readable address from result:', result);
    
    // Try to build a nice, readable address
    let streetNumber = '';
    let route = '';
    let sublocality = '';
    let locality = '';
    let administrativeArea = '';
    
    // Extract address components
    for (let component of result.address_components) {
        if (component.types.includes('street_number')) {
            streetNumber = component.long_name;
        } else if (component.types.includes('route')) {
            route = component.long_name;
        } else if (component.types.includes('sublocality') || component.types.includes('sublocality_level_1')) {
            sublocality = component.long_name;
        } else if (component.types.includes('locality')) {
            locality = component.long_name;
        } else if (component.types.includes('administrative_area_level_1')) {
            administrativeArea = component.long_name;
        }
    }
    
    // Build the address in order of preference
    let addressParts = [];
    
    // 1. Street address (number + street)
    if (streetNumber && route) {
        addressParts.push(`${streetNumber} ${route}`);
    } else if (route) {
        addressParts.push(route);
    }
    
    // 2. Neighborhood/Area
    if (sublocality && !addressParts.includes(sublocality)) {
        addressParts.push(sublocality);
    }
    
    // 3. City
    if (locality && !addressParts.includes(locality)) {
        addressParts.push(locality);
    }
    
    // 4. State/Province (only if different from city)
    if (administrativeArea && !addressParts.includes(administrativeArea)) {
        addressParts.push(administrativeArea);
    }
    
    // If we have a good address, use it
    if (addressParts.length > 0) {
        let readableAddress = addressParts.join(', ');
        
        // Truncate if too long
        if (readableAddress.length > 80) {
            readableAddress = readableAddress.substring(0, 77) + '...';
        }
        
        console.log('Built readable address:', readableAddress);
        return readableAddress;
    }
    
    // Fallback to formatted address
    let fallbackAddress = result.formatted_address;
    
    // Truncate if too long
    if (fallbackAddress.length > 80) {
        fallbackAddress = fallbackAddress.substring(0, 77) + '...';
    }
    
    console.log('Using fallback address:', fallbackAddress);
    return fallbackAddress;
}

// Extract landmark name from geocoding result
function extractLandmarkName(result) {
    let landmarkName = '';
    
    // Try to find the most relevant landmark name
    for (let component of result.address_components) {
        if (component.types.includes('establishment') || 
            component.types.includes('point_of_interest') ||
            component.types.includes('premise')) {
            landmarkName = component.long_name;
            break;
        }
    }
    
    // If no landmark found, use street address
    if (!landmarkName) {
        const streetNumber = result.address_components.find(c => c.types.includes('street_number'));
        const route = result.address_components.find(c => c.types.includes('route'));
        const locality = result.address_components.find(c => c.types.includes('locality'));
        
        if (streetNumber && route) {
            landmarkName = `${streetNumber.long_name} ${route.long_name}`;
        } else if (route) {
            landmarkName = route.long_name;
        } else if (locality) {
            landmarkName = locality.long_name;
        }
    }
    
    // If still no name, use formatted address
    if (!landmarkName) {
        landmarkName = result.formatted_address;
    }
    
    return landmarkName;
}

// Search for nearby places to get better landmark names
function searchNearbyPlaces(position, type) {
    console.log(`Searching nearby places for ${type} location`);
    
    // Defensive checks
    if (!map) {
        console.warn('Map is not initialized. Cannot search nearby places.');
        return;
    }
    
    if (!nearbyPlacesService) {
        console.warn('Nearby Places Service not available.');
        return;
    }
    
    // Validate position - handle both LatLng objects and plain objects
    let latLng;
    if (position && typeof position.lat === 'function' && typeof position.lng === 'function') {
        // It's a Google Maps LatLng object
        latLng = position;
    } else if (position && typeof position.lat === 'number' && typeof position.lng === 'number') {
        // It's a plain object with lat/lng numbers
        latLng = new google.maps.LatLng(position.lat, position.lng);
    } else {
        console.warn('Invalid position for nearbySearch:', position);
        return;
    }
    
    // Validate coordinates
    if (isNaN(latLng.lat()) || isNaN(latLng.lng())) {
        console.warn('Invalid coordinates for nearbySearch:', latLng.lat(), latLng.lng());
        return;
    }
    
    console.log('Calling nearbySearch with:', {
        lat: latLng.lat(),
        lng: latLng.lng(),
        mapReady: !!map,
        serviceReady: !!nearbyPlacesService
    });
    
    try {
        // Create a proper request object
        const request = {
            location: latLng,
            radius: 500, // Increased radius for better results
            rankBy: google.maps.places.RankBy.PROMINENCE,
            type: ['point_of_interest', 'establishment']
        };
        
        nearbyPlacesService.nearbySearch(request, function(results, status) {
            console.log('nearbySearch callback - status:', status, 'results count:', results ? results.length : 0);
            
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                console.log('Nearby places found:', results.length, 'places');
                
                // Get the closest place
                const closestPlace = results[0];
                const placeName = closestPlace.name;
                
                console.log(`Closest place to ${type}:`, placeName);
                
                // Update input field with place name if it's better than the geocoded name
                const inputField = type === 'pickup' ? 
                    document.getElementById('pickup') : 
                    document.getElementById('destination');
                
                if (inputField && placeName) {
                    // Only update if the current value is coordinates or empty
                    const currentValue = inputField.value;
                    if (!currentValue || currentValue.includes(',') && currentValue.includes('.')) {
                        inputField.value = placeName;
                        console.log(`Updated ${type} with nearby place:`, placeName);
                    }
                }
            } else {
                console.log('No nearby places found or search failed. Status:', status);
                if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                    console.warn('Places API error status:', status);
                }
            }
        });
    } catch (err) {
        console.error('Error calling nearbySearch:', err);
        console.error('Error details:', {
            message: err.message,
            stack: err.stack,
            position: position,
            type: type
        });
    }
}

// Set current location as pickup
async function setCurrentLocationAsPickup() {
    console.log('=== SET CURRENT LOCATION AS PICKUP CALLED ===');
    
    try {
        // Show loading message
        showMessage('Getting your location with high accuracy...', 'info');
        
        // Use the improved location service
        const position = await window.locationService.getLocationWithRetry(3);
        
        console.log('✅ High accuracy location obtained:', {
            accuracy: position.coords.accuracy + 'm',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        });
        
        userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
        };
        
        // Save location using the service
        window.locationService.saveLocation(position, 'user');
        
        const pos = new google.maps.LatLng(userLocation.lat, userLocation.lng);
        
        // Get the actual address name using reverse geocoding
        console.log('🔄 Starting address extraction...');
        try {
            console.log('📍 Calling getAddressFromCoordinates...');
            const addressName = await getAddressFromCoordinates(pos);
            console.log('✅ Address name received:', addressName);
            
            userLocation.landmark = addressName;
            
            placeMarker(pos, 'pickup', addressName);
            
            const pickupInput = document.getElementById('pickup');
            if (pickupInput) {
                pickupInput.value = addressName;
                console.log('✅ Updated pickup input with:', addressName);
            } else {
                console.error('❌ Pickup input element not found!');
            }
            
            const accuracyLevel = window.locationService.getAccuracyLevel(position.coords.accuracy);
            showMessage(`Location set: ${addressName} (${accuracyLevel} accuracy)`, 'success');
            console.log('✅ Success message shown');
        } catch (geocodeError) {
            console.error('❌ Geocoding failed, using coordinates:', geocodeError);
            const fallbackName = `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`;
            placeMarker(pos, 'pickup', fallbackName);
            
            const pickupInput = document.getElementById('pickup');
            if (pickupInput) {
                pickupInput.value = fallbackName;
                console.log('✅ Updated pickup input with coordinates:', fallbackName);
            } else {
                console.error('❌ Pickup input element not found!');
            }
            
            const accuracyLevel = window.locationService.getAccuracyLevel(position.coords.accuracy);
            showMessage(`Location set with coordinates (${accuracyLevel} accuracy)`, 'success');
        }
        
        debouncedValidateForm();
        console.log('=== END SET CURRENT LOCATION AS PICKUP ===');
        
    } catch (error) {
        console.error('❌ Location error:', error);
        
        // Try to use cached location
        const cachedPosition = window.locationService.getCachedLocation();
        if (cachedPosition) {
            console.log('Using cached location as fallback');
            userLocation = {
                lat: cachedPosition.coords.latitude,
                lng: cachedPosition.coords.longitude,
                accuracy: cachedPosition.coords.accuracy
            };
            
            const pos = new google.maps.LatLng(userLocation.lat, userLocation.lng);
            
            // Try to get address name for cached location too
            try {
                const addressName = await getAddressFromCoordinates(pos);
                userLocation.landmark = addressName;
                
                placeMarker(pos, 'pickup', addressName);
                
                const pickupInput = document.getElementById('pickup');
                if (pickupInput) {
                    pickupInput.value = addressName;
                }
                
                showMessage(`Used last known location: ${addressName}`, 'info');
            } catch (geocodeError) {
                console.error('Geocoding failed for cached location:', geocodeError);
                const fallbackName = `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`;
                placeMarker(pos, 'pickup', fallbackName);
                
                const pickupInput = document.getElementById('pickup');
                if (pickupInput) {
                    pickupInput.value = fallbackName;
                }
                
                showMessage('Used last known location with coordinates', 'info');
            }
            
            debouncedValidateForm();
        } else {
            showMessage('Unable to get your location. Please check your GPS settings and try again.', 'error');
        }
    }
}

// Setup event listeners for input fields
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Add input field listeners with autocomplete
    const pickupInput = document.getElementById('pickup');
    const destinationInput = document.getElementById('destination');
    
    console.log('Found pickup input:', pickupInput);
    console.log('Found destination input:', destinationInput);
    
    // Check if elements exist before setting up
    if (!pickupInput) {
        console.error('Pickup input element not found!');
        // Retry after a short delay
        setTimeout(setupEventListeners, 200);
        return;
    }
    
    if (!destinationInput) {
        console.error('Destination input element not found!');
        // Retry after a short delay
        setTimeout(setupEventListeners, 200);
        return;
    }
    
    try {
    // Setup autocomplete for pickup location
    setupAutocomplete(pickupInput, 'pickup');
    
    // Setup autocomplete for destination location
    setupAutocomplete(destinationInput, 'destination');
    
    // Add form validation
    pickupInput.addEventListener('input', debouncedValidateForm);
    destinationInput.addEventListener('input', debouncedValidateForm);
    
    console.log('Event listeners setup complete');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Setup autocomplete for an input field
function setupAutocomplete(input, type) {
    console.log('Setting up autocomplete for:', type);
    
    if (!input) {
        console.error('Input element not found for type:', type);
        return;
    }
    
    console.log('Input element found for type:', type, input);
    
    let debounceTimer;
    let selectedIndex = -1;
    let predictions = [];
    
    // Add input event listener with debouncing
    input.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        console.log('Input event triggered:', query);
        
        // Validate form on input change
        debouncedValidateForm();
        
        // Clear previous timer
        clearTimeout(debounceTimer);
        
        // Hide dropdown if input is empty
        if (!query || query.length < 2) {
            hideAutocompleteDropdown(type);
            return;
        }
        
        // Set new timer for debouncing (reduced from 300ms to 200ms for better responsiveness)
        debounceTimer = setTimeout(() => {
            console.log('Debounced search for:', query);
            // Try direct geocoding first for better results
            geocodeInputDirectly(query, type);
        }, 300);
    });
    
    // Add focus event listener
    input.addEventListener('focus', function(e) {
        const query = e.target.value.trim();
        if (query && query.length >= 2) {
            console.log('Focus event - showing existing results for:', query);
            getPlacePredictions(query, type);
        }
    });
    
    // Add blur event listener
    input.addEventListener('blur', function(e) {
        // Delay hiding to allow for clicks on dropdown items
        setTimeout(() => {
            hideAutocompleteDropdown(type);
        }, 150);
    });
    
    // Add keyboard navigation
    input.addEventListener('keydown', function(e) {
        const dropdown = document.getElementById(`${type}Autocomplete`);
        if (!dropdown || dropdown.style.display === 'none') return;
        
        const items = dropdown.querySelectorAll('.autocomplete-item');
        if (items.length === 0) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                updateSelection(items, selectedIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection(items, selectedIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < window.currentPredictions.length) {
                    selectAutocompleteItem(window.currentPredictions[selectedIndex], type);
                }
                break;
            case 'Escape':
                hideAutocompleteDropdown(type);
                selectedIndex = -1;
                break;
        }
    });
}

// Get place predictions from Google Places API
function getPlacePredictions(input, type) {
    console.log('Getting place predictions for:', input, 'type:', type);
    
    if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error('Google Maps Places API not loaded');
        showMessage('Google Maps API not loaded. Please refresh the page.', 'error');
        return;
    }
    
    if (!input || input.trim().length < 2) {
        console.log('Input too short, hiding dropdown');
        hideAutocompleteDropdown(type);
        return;
    }
    
    try {
        const service = new google.maps.places.AutocompleteService();
        
        // Use a simpler approach that works better with current API restrictions
        service.getPlacePredictions({
            input: input,
            componentRestrictions: { country: 'in' }, // Restrict to India
            types: ['geocode'] // Use only geocode to avoid mixing issues
        }, function(predictions, status) {
            console.log('Predictions received:', predictions, 'Status:', status);
            
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
                displayAutocompleteResults(predictions, type);
            } else {
                console.log('No predictions found or error:', status);
                hideAutocompleteDropdown(type);
                
                // Show error popup for specific errors
                if (status === 'INVALID_REQUEST') {
                    showMessage('Location search error. Please try a different search term.', 'error');
                } else if (status === 'ZERO_RESULTS') {
                    showMessage('No locations found. Please try a different search term.', 'warning');
                } else if (status === 'OVER_QUERY_LIMIT') {
                    showMessage('Search limit reached. Please wait a moment and try again.', 'error');
                } else if (status === 'REQUEST_DENIED') {
                    showMessage('Search service unavailable. Please refresh the page.', 'error');
                } else {
                    // Try direct geocoding as fallback for longer inputs
                    if (input.trim().length >= 3) {
                        console.log('Trying direct geocoding as fallback for:', input);
                        geocodeInputDirectly(input, type);
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error getting place predictions:', error);
        hideAutocompleteDropdown(type);
        
        // Show error popup for unexpected errors
        showMessage('Unexpected error occurred while searching. Please try again.', 'error');
        
        // Try direct geocoding as fallback
        if (input.trim().length >= 3) {
            geocodeInputDirectly(input, type);
        }
    }
}

// Display autocomplete results in dropdown
function displayAutocompleteResults(predictions, type) {
    console.log('Displaying autocomplete results:', predictions.length, 'for type:', type);
    
    const dropdown = document.getElementById(`${type}Autocomplete`);
    if (!dropdown) {
        console.error('Dropdown element not found for type:', type);
        return;
    }
    
    // Store predictions globally for keyboard navigation
    window.currentPredictions = predictions;
    
    // Clear previous results
    dropdown.innerHTML = '';
    
    if (predictions.length === 0) {
        hideAutocompleteDropdown(type);
        return;
    }
    
    // Add each prediction to dropdown
    predictions.forEach((prediction, index) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.setAttribute('data-index', index);
        
        const icon = document.createElement('div');
        icon.className = 'location-icon';
        icon.textContent = '📍';
        
        const text = document.createElement('div');
        text.className = 'location-text';
        
        const main = document.createElement('div');
        main.className = 'location-main';
        main.textContent = prediction.structured_formatting.main_text;
        
        const secondary = document.createElement('div');
        secondary.className = 'location-secondary';
        secondary.textContent = prediction.structured_formatting.secondary_text || '';
        
        text.appendChild(main);
        text.appendChild(secondary);
        item.appendChild(icon);
        item.appendChild(text);
        
            // Add click event
    item.addEventListener('click', function() {
        console.log('Autocomplete item clicked:', prediction);
        selectAutocompleteItem(prediction, type);
    });
    
    // Add double-click event for manual override
    item.addEventListener('dblclick', function() {
        console.log('Autocomplete item double-clicked for manual override:', prediction);
        if (type === 'pickup') {
            // Override current location with selected location
            const location = prediction.geometry.location;
            console.log('🔧 Manually overriding pickup location to:', location.lat(), location.lng());
            placeMarker(location, 'pickup', fullAddress);
            showMessage('Pickup location manually set!', 'success');
        }
        selectAutocompleteItem(prediction, type);
    });
        
        // Add hover events
        item.addEventListener('mouseenter', function() {
            updateSelection(dropdown.querySelectorAll('.autocomplete-item'), index);
        });
        
        dropdown.appendChild(item);
    });
    
    // Show dropdown
    showAutocompleteDropdown(type);
}

// Select an autocomplete item
function selectAutocompleteItem(prediction, type) {
    console.log('selectAutocompleteItem called with:', prediction, 'type:', type);
    
    if (!prediction) {
        console.error('No prediction provided');
        return;
    }
    
    // Get the full address from the prediction
    const mainText = prediction.structured_formatting.main_text;
    const secondaryText = prediction.structured_formatting.secondary_text || '';
    const fullAddress = secondaryText ? `${mainText}, ${secondaryText}` : mainText;
    
    console.log('Full address:', fullAddress);
    
    // Update input field
    const input = document.getElementById(type === 'pickup' ? 'pickup' : 'destination');
    if (input) {
        input.value = fullAddress;
        console.log('Input field updated:', input.value);
        
        // Add accuracy indicator for pickup location
        if (type === 'pickup') {
            const accuracyIndicator = document.getElementById('locationAccuracy');
            if (accuracyIndicator) {
                accuracyIndicator.textContent = '📍 Manual Location';
                accuracyIndicator.style.color = '#28a745';
            }
        }
    }
    
    // Hide dropdown
    hideAutocompleteDropdown(type);
    
    // Check if this is a geocoded result (has geometry)
    if (prediction.geometry && prediction.geometry.location) {
        // Direct geocoded result - place marker directly
        const location = prediction.geometry.location;
        console.log(`Placing marker directly for ${type} at:`, location.lat(), location.lng());
        placeMarker(location, type, fullAddress);
    } else {
        // Regular prediction - geocode the address
    geocodeAddress(fullAddress, type);
    }
    
    console.log(`Selected ${type} location:`, fullAddress);
}

// Update selection in dropdown
function updateSelection(items, selectedIndex) {
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

// Show autocomplete dropdown
function showAutocompleteDropdown(type) {
    const dropdown = document.getElementById(type + 'Autocomplete');
    dropdown.style.display = 'block';
}

// Hide autocomplete dropdown
function hideAutocompleteDropdown(type) {
    const dropdown = document.getElementById(type + 'Autocomplete');
    if (dropdown) {
        dropdown.style.display = 'none';
        // Clear global predictions
        window.currentPredictions = [];
    }
}

// Geocode input text directly and show results
function geocodeInputDirectly(input, type) {
    console.log(`=== DIRECT GEOCODING FUNCTION CALLED ===`);
    console.log(`Input: "${input}"`);
    console.log(`Type: ${type}`);
    
    if (!input || input.trim() === '') {
        console.log('Input is empty, returning');
        return;
    }
    
    if (!geocoder) {
        console.error('Geocoder is not available!');
        return;
    }
    
    // Check for debug location first (from location debug tool)
    const debugLocation = localStorage.getItem('debugLocation');
    if (debugLocation) {
        console.log('🔧 Using debug location:', debugLocation);
        const [lat, lng] = debugLocation.split(',').map(Number);
        if (lat && lng) {
            const position = {
                coords: {
                    latitude: lat,
                    longitude: lng,
                    accuracy: 5
                },
                timestamp: Date.now()
            };
            console.log('✅ Using debug location with high accuracy');
            return position;
        }
    }
    
    // Get user's location for better context
    let userLocationContext = '';
    if (userLocation) {
        userLocationContext = ` near ${userLocation.lat.toFixed(2)},${userLocation.lng.toFixed(2)}`;
    }
    
    // Add "India" to the search to improve results
    const searchQuery = input.trim() + ', India' + userLocationContext;
    console.log(`Searching for: ${searchQuery}`);
    
    geocoder.geocode({ address: searchQuery }, function(results, status) {
        console.log(`Direct geocoding result:`, status, results);
        
        if (status === 'OK' && results && results.length > 0) {
            // Create a simple prediction-like structure for display
            const predictions = results.slice(0, 3).map((result, index) => ({
                place_id: `geocode_${index}`,
                structured_formatting: {
                    main_text: result.formatted_address.split(',')[0],
                    secondary_text: result.formatted_address
                },
                description: result.formatted_address,
                geometry: result.geometry
            }));
            
            displayAutocompleteResults(predictions, type);
        } else {
            console.log('Direct geocoding failed:', status);
            // Try without user location context
            const fallbackQuery = input.trim() + ', India';
            console.log(`Trying fallback search: ${fallbackQuery}`);
            
            geocoder.geocode({ address: fallbackQuery }, function(fallbackResults, fallbackStatus) {
                if (fallbackStatus === 'OK' && fallbackResults && fallbackResults.length > 0) {
                    const predictions = fallbackResults.slice(0, 3).map((result, index) => ({
                        place_id: `geocode_${index}`,
                        structured_formatting: {
                            main_text: result.formatted_address.split(',')[0],
                            secondary_text: result.formatted_address
                        },
                        description: result.formatted_address,
                        geometry: result.geometry
                    }));
                    
                    displayAutocompleteResults(predictions, type);
                } else {
                    console.log('Fallback geocoding also failed:', fallbackStatus);
                    hideAutocompleteDropdown(type);
                    
                    // Show error message for failed geocoding
                    switch (fallbackStatus) {
                        case 'ZERO_RESULTS':
                            showMessage(`📍 No locations found for "${input}". Please try a different search term.`, 'warning');
                            break;
                        case 'OVER_QUERY_LIMIT':
                            showMessage('⏰ Search limit reached. Please wait a moment and try again.', 'error');
                            break;
                        case 'REQUEST_DENIED':
                            showMessage('❌ Search service unavailable. Please refresh the page.', 'error');
                            break;
                        case 'INVALID_REQUEST':
                            showMessage('⚠️ Invalid search request. Please check your input.', 'error');
                            break;
                        default:
                            showMessage(`❌ Search failed: ${fallbackStatus}. Please try again.`, 'error');
                            break;
                    }
                }
            });
        }
    });
}

// Geocode address and place marker
function geocodeAddress(address, type) {
    console.log(`=== GEOCODING FUNCTION CALLED ===`);
    console.log(`Address: "${address}"`);
    console.log(`Type: ${type}`);
    console.log(`Geocoder available:`, geocoder ? 'Yes' : 'No');
    console.log(`Map available:`, map ? 'Yes' : 'No');
    
    if (!address || address.trim() === '') {
        console.log('Address is empty, returning');
        return;
    }
    
    if (!geocoder) {
        console.error('Geocoder is not available!');
        showMessage('Geocoding service not available. Please refresh the page.', 'error');
        return;
    }
    
    console.log(`Starting geocoding for ${type}:`, address);
    
    geocoder.geocode({ address: address }, function(results, status) {
        console.log(`Geocoding result for ${type}:`, status, results);
        
        if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            const formattedAddress = results[0].formatted_address;
            
            console.log(`${type} geocoded successfully:`, location.lat(), location.lng());
            console.log(`Formatted address:`, formattedAddress);
            
            // Place marker on map
            placeMarker(location, type, formattedAddress);
            
            // Center map on the new location
            map.setCenter(location);
            map.setZoom(15);
            
            // Update input field with formatted address
            const input = document.getElementById(type === 'pickup' ? 'pickup' : 'destination');
            input.value = formattedAddress;
            
            showMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} location set successfully!`, 'success');
        } else {
            console.error(`Geocoding failed for ${type}:`, status);
            
            // Show specific error messages for different geocoding failures
            switch (status) {
                case 'ZERO_RESULTS':
                    showMessage(`📍 Location "${address}" not found. Please check the spelling or try a different address.`, 'warning');
                    break;
                case 'OVER_QUERY_LIMIT':
                    showMessage('⏰ Location search limit reached. Please wait a moment and try again.', 'error');
                    break;
                case 'REQUEST_DENIED':
                    showMessage('❌ Location service unavailable. Please refresh the page and try again.', 'error');
                    break;
                case 'INVALID_REQUEST':
                    showMessage('⚠️ Invalid location request. Please check your address format.', 'error');
                    break;
                case 'UNKNOWN_ERROR':
                    showMessage('❓ Unknown error occurred while searching for location. Please try again.', 'error');
                    break;
                default:
                    showMessage(`❌ Location search failed: ${status}. Please try a different address.`, 'error');
                    break;
            }
        }
    });
}

// Place marker on map
function placeMarker(position, type, address) {
    console.log('=== PLACE MARKER CALLED ===');
    console.log('Type:', type);
    console.log('Position:', position.lat(), position.lng());
    console.log('Address:', address);
    console.log('Current pickupMarker:', pickupMarker);
    console.log('Current destinationMarker:', destinationMarker);
    
    // Remove existing marker of the same type
    if (type === 'pickup' && pickupMarker) {
        console.log('Removing existing pickup marker');
        pickupMarker.setMap(null);
    } else if (type === 'destination' && destinationMarker) {
        console.log('Removing existing destination marker');
        destinationMarker.setMap(null);
    }
    
    // Create new marker
    const marker = new google.maps.Marker({
        position: position,
        map: map,
        icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="15" cy="15" r="12" fill="${type === 'pickup' ? '#4CAF50' : '#FF5722'}" stroke="white" stroke-width="3"/>
                    <text x="15" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${type === 'pickup' ? 'P' : 'D'}</text>
                </svg>
            `),
            scaledSize: new google.maps.Size(30, 30),
            anchor: new google.maps.Point(15, 15)
        },
        title: type === 'pickup' ? 'Pickup Location' : 'Destination'
    });
    
    // Add info window with address
    const infoWindow = new google.maps.InfoWindow({
        content: `<div><strong>${type === 'pickup' ? 'Pickup' : 'Destination'}</strong><br>${address}</div>`
    });
    
    marker.addListener('click', function() {
        infoWindow.open(map, marker);
    });
    
    // Store marker reference
    if (type === 'pickup') {
        pickupMarker = marker;
        console.log('✅ pickupMarker set to:', pickupMarker);
    } else {
        destinationMarker = marker;
        console.log('✅ destinationMarker set to:', destinationMarker);
    }
    
    console.log(`${type} marker placed at:`, position.lat(), position.lng());
    console.log('After setting marker - pickupMarker:', pickupMarker, 'destinationMarker:', destinationMarker);
    
    // Calculate route and price if both locations are set
    if (pickupMarker && destinationMarker) {
        console.log('✅ Both markers set, calling calculateRouteAndPrice...');
        calculateRouteAndPrice();
    } else {
        console.log('⏳ Waiting for both markers. Pickup:', !!pickupMarker, 'Destination:', !!destinationMarker);
    }
}

// Handle map clicks
function handleMapClick(event) {
    console.log('=== MAP CLICK EVENT ===');
    console.log('Map clicked! isLocationSelectionMode:', isLocationSelectionMode, 'currentLocationType:', currentLocationType);
    console.log('Click coordinates:', event.latLng.lat(), event.latLng.lng());
    
    if (isLocationSelectionMode) {
        console.log('✅ Location selection mode is ACTIVE');
        console.log('Creating temp marker at:', event.latLng.lat(), event.latLng.lng());
        
        // Remove previous temp marker
        if (tempMarker) {
            console.log('🗑️ Removing previous temp marker');
            tempMarker.setMap(null);
        }
        
        try {
            // Create a temporary marker
            tempMarker = new google.maps.Marker({
                position: event.latLng,
                map: map,
                title: currentLocationType === 'pickup' ? 'Pickup Location' : 'Destination',
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="15" cy="15" r="12" fill="#FFD700" stroke="white" stroke-width="3"/>
                            <text x="15" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">T</text>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(30, 30),
                    anchor: new google.maps.Point(15, 15)
                }
            });
            
            console.log('✅ Temp marker created successfully:', tempMarker);
            console.log('Temp marker position:', tempMarker.getPosition());
            console.log('Global tempMarker after creation:', tempMarker);
            
            // Update popup message
            const popupMessage = document.getElementById('popupMessage');
            if (popupMessage) {
                popupMessage.textContent = 
                    `Location selected: ${event.latLng.lat().toFixed(6)}, ${event.latLng.lng().toFixed(6)}. Click "Confirm" to get landmark name and save.`;
            }
            
            showMessage(`Location selected! Click "Confirm" to get landmark name and save your ${currentLocationType} location.`, 'success');
                
        } catch (error) {
            console.error('❌ Error creating temp marker:', error);
            showMessage('Error creating marker. Please try again.', 'error');
        }
    } else {
        // Regular map click - show info
        console.log('ℹ️ Regular map click - not in location selection mode');
        showMessage('Click the "Select on Map" buttons to choose pickup and destination locations.', 'info');
    }
    
    console.log('=== END MAP CLICK EVENT ===');
}

// Initialize WebSocket connection
function initWebSocket() {
    console.log('Initializing WebSocket connection...');
    
    if (websocketInitialized || websocket) {
        console.log('WebSocket already initialized or exists, skipping...');
        return;
    }
    
    websocketInitialized = true;
    
    // Don't show connecting status immediately - wait for actual connection
    const statusIndicator = document.getElementById('statusIndicator');
    if (statusIndicator) {
        statusIndicator.textContent = 'Ready';
        statusIndicator.className = 'status-indicator';
    }
    
    try {
    const wsUrl = `ws://${window.location.hostname}:8080/ws/driver-location`;
    websocket = new WebSocket(wsUrl);
    
    websocket.onopen = function(event) {
        console.log('WebSocket connected');
        
        // Update status indicator
        const statusIndicator = document.getElementById('statusIndicator');
        if (statusIndicator) {
            statusIndicator.textContent = 'Connected';
            statusIndicator.className = 'status-indicator connected';
        }
    };
    
    websocket.onmessage = function(event) {
        console.log('WebSocket message received:', event.data);
        try {
            const driverData = JSON.parse(event.data);
            updateDriverLocation(driverData);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };
    
    websocket.onerror = function(event) {
        console.log('WebSocket error:', event);
        
        // Update status indicator to show backend not available
        const statusIndicator = document.getElementById('statusIndicator');
        if (statusIndicator) {
            statusIndicator.textContent = 'Backend Offline';
            statusIndicator.className = 'status-indicator disconnected';
        }
    };
    
    websocket.onclose = function(event) {
        console.log('WebSocket disconnected');
        
        // Update status indicator
        const statusIndicator = document.getElementById('statusIndicator');
        if (statusIndicator) {
            statusIndicator.textContent = 'Backend Offline';
            statusIndicator.className = 'status-indicator disconnected';
        }
        
        // Don't auto-reconnect - let user know backend is needed
        console.log('Backend service not available. Please start the backend services.');
    };
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        
        // Update status indicator
        const statusIndicator = document.getElementById('statusIndicator');
        if (statusIndicator) {
            statusIndicator.textContent = 'WebSocket Error';
            statusIndicator.className = 'status-indicator disconnected';
        }
    }
}

// Update driver location on map
function updateDriverLocation(driverData) {
    const driverId = driverData.driverId;
    const position = { lat: driverData.lat, lng: driverData.lng };
    
    // Remove existing marker for this driver
    const existingMarker = driverMarkers.find(marker => marker.driverId === driverId);
    if (existingMarker) {
        existingMarker.marker.setMap(null);
        const index = driverMarkers.indexOf(existingMarker);
        driverMarkers.splice(index, 1);
    }
    
    // Add new marker
    const marker = new google.maps.Marker({
        position: position,
        map: map,
        icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="8" fill="#4CAF50" stroke="white" stroke-width="2"/>
                    <text x="10" y="13" text-anchor="middle" fill="white" font-size="8" font-weight="bold">🚲</text>
                </svg>
            `),
            scaledSize: new google.maps.Size(20, 20),
            anchor: new google.maps.Point(10, 10)
        },
        title: `Driver ${driverId}`
    });
    
    driverMarkers.push({ marker: marker, driverId: driverId });
}

// Select location mode
function selectLocation(type) {
    console.log('=== SELECT LOCATION FUNCTION ===');
    console.log('selectLocation called with type:', type);
    
    // Set the mode and type - CRITICAL: These must be set in global scope
    currentLocationType = type;
    setLocationSelectionMode(true, 'selectLocation');
    
    console.log('✅ Location selection mode activated:', isLocationSelectionMode, 'Type:', currentLocationType);
    console.log('Global variables - isLocationSelectionMode:', isLocationSelectionMode, 'currentLocationType:', currentLocationType);
    console.log('Global tempMarker at start of selectLocation:', tempMarker);
    
    // Update popup content
    const popupTitle = document.getElementById('popupTitle');
    const popupMessage = document.getElementById('popupMessage');
    
    if (popupTitle) {
        popupTitle.textContent = type === 'pickup' ? 'Select Pickup Location' : 'Select Destination';
    }
    
    if (popupMessage) {
        popupMessage.textContent = 'Click on the map to select your location, then click "Confirm" to save it.';
    }
    
    // Show popup
    const popup = document.getElementById('locationPopup');
    console.log('Popup element:', popup);
    if (popup) {
        popup.style.display = 'flex';
        console.log('✅ Popup display set to flex');
    } else {
        console.error('❌ Popup element not found!');
    }
    
    // Change cursor
    if (map) {
        map.setOptions({ draggableCursor: 'crosshair' });
        console.log('✅ Map cursor changed to crosshair');
    } else {
        console.error('❌ Map not available!');
    }
    
    // Test map click listener
    console.log('🎯 Map click listener should be active now. Try clicking on the map.');
    console.log('🎯 Current global state - isLocationSelectionMode:', isLocationSelectionMode, 'currentLocationType:', currentLocationType);
    showMessage(`Click anywhere on the map to set your ${type} location`, 'info');
}

// Confirm location selection
function confirmLocation() {
    console.log('=== CONFIRM LOCATION FUNCTION ===');
    console.log('confirmLocation called');
    console.log('Global tempMarker:', tempMarker);
    console.log('Global currentLocationType:', currentLocationType);
    console.log('Global isLocationSelectionMode:', isLocationSelectionMode);
    
    if (!tempMarker) {
        console.log('❌ No temp marker found');
        console.log('❌ tempMarker is null or undefined');
        showMessage('Please select a location on the map first.', 'error');
        // DON'T reset the mode here - keep it active so user can try again
        return;
    }
    
    const position = tempMarker.getPosition();
    console.log('✅ Position from tempMarker:', position);
    
    // Show loading message
    showMessage('Getting landmark name for selected location...', 'info');
    
    // Get landmark name for the selected location
    getLandmarkName(position, currentLocationType);
    
    // Add permanent marker with temporary name (will be updated by getLandmarkName)
    if (currentLocationType === 'pickup') {
        if (pickupMarker) {
            pickupMarker.setMap(null);
        }
        pickupMarker = new google.maps.Marker({
            position: position,
            map: map,
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="15" cy="15" r="12" fill="#4CAF50" stroke="white" stroke-width="3"/>
                        <text x="15" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">P</text>
                    </svg>
                `),
                scaledSize: new google.maps.Size(30, 30),
                anchor: new google.maps.Point(15, 15)
            },
            title: 'Pickup Location'
        });
        console.log('✅ Pickup marker created');
    } else {
        if (destinationMarker) {
            destinationMarker.setMap(null);
        }
        destinationMarker = new google.maps.Marker({
            position: position,
            map: map,
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="15" cy="15" r="12" fill="#FF5722" stroke="white" stroke-width="3"/>
                        <text x="15" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">D</text>
                    </svg>
                `),
                scaledSize: new google.maps.Size(30, 30),
                anchor: new google.maps.Point(15, 15)
            },
            title: 'Destination'
        });
        console.log('✅ Destination marker created');
    }
    
    // Add permanent marker
    if (currentLocationType === 'pickup') {
        if (pickupMarker) {
            pickupMarker.setMap(null);
        }
        pickupMarker = new google.maps.Marker({
            position: position,
            map: map,
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="15" cy="15" r="12" fill="#4CAF50" stroke="white" stroke-width="3"/>
                        <text x="15" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">P</text>
                    </svg>
                `),
                scaledSize: new google.maps.Size(30, 30),
                anchor: new google.maps.Point(15, 15)
            },
            title: 'Pickup Location'
        });
        console.log('✅ Pickup marker created');
    } else {
        if (destinationMarker) {
            destinationMarker.setMap(null);
        }
        destinationMarker = new google.maps.Marker({
            position: position,
            map: map,
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="15" cy="15" r="12" fill="#FF5722" stroke="white" stroke-width="3"/>
                        <text x="15" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">D</text>
                    </svg>
                `),
                scaledSize: new google.maps.Size(30, 30),
                anchor: new google.maps.Point(15, 15)
            },
            title: 'Destination'
        });
        console.log('✅ Destination marker created');
    }
    
    // Clean up - ONLY reset mode when location is actually confirmed
    console.log('Cleaning up tempMarker...');
    tempMarker.setMap(null);
    tempMarker = null;
    setLocationSelectionMode(false, 'confirmLocation - success');
    currentLocationType = null;
    map.setOptions({ draggableCursor: null });
    
    // Hide popup
    const popup = document.getElementById('locationPopup');
    if (popup) {
        popup.style.display = 'none';
    }
    
    // Validate form
    debouncedValidateForm();
    
    // Calculate route and price if both locations are set
    if (pickupMarker && destinationMarker) {
        console.log('✅ Both markers set, calling calculateRouteAndPrice...');
        calculateRouteAndPrice();
    } else {
        console.log('⏳ Waiting for both markers. Pickup:', !!pickupMarker, 'Destination:', !!destinationMarker);
    }
    
    showMessage(`${currentLocationType === 'pickup' ? 'Pickup' : 'Destination'} location set successfully!`, 'success');
    console.log('✅ confirmLocation completed successfully');
    console.log('=== END CONFIRM LOCATION FUNCTION ===');
}

// Cancel location selection
function cancelLocation() {
    console.log('=== CANCEL LOCATION FUNCTION ===');
    console.log('cancelLocation called');
    console.log('Global tempMarker:', tempMarker);
    
    if (tempMarker) {
        tempMarker.setMap(null);
        tempMarker = null;
        console.log('✅ Temp marker removed');
    }
    
    setLocationSelectionMode(false, 'cancelLocation');
    currentLocationType = null;
    
    if (map) {
        map.setOptions({ draggableCursor: null });
        console.log('✅ Map cursor reset');
    }
    
    const popup = document.getElementById('locationPopup');
    if (popup) {
        popup.style.display = 'none';
        console.log('✅ Popup hidden');
    }
    
    console.log('✅ Location selection cancelled');
    console.log('=== END CANCEL LOCATION FUNCTION ===');
}

// Calculate route and price between pickup and destination
function calculateRouteAndPrice() {
    console.log('=== CALCULATE ROUTE AND PRICE ===');
    console.log('pickupMarker:', pickupMarker);
    console.log('destinationMarker:', destinationMarker);
    console.log('directionsService:', directionsService);
    console.log('google.maps available:', !!(window.google && window.google.maps));
    console.log('google.maps.DirectionsService available:', !!(window.google && window.google.maps && window.google.maps.DirectionsService));
    
    if (!pickupMarker || !destinationMarker) {
        console.log('❌ Both pickup and destination markers are required');
        return;
    }
    
    if (!directionsService) {
        console.log('Creating new DirectionsService...');
        directionsService = new google.maps.DirectionsService();
    }
    
    const pickup = pickupMarker.getPosition();
    const destination = destinationMarker.getPosition();
    
    console.log('Pickup position:', pickup.lat(), pickup.lng());
    console.log('Destination position:', destination.lat(), destination.lng());
    
    const request = {
        origin: pickup,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC
    };
    
    directionsService.route(request, function(result, status) {
        if (status === 'OK') {
            console.log('✅ Route calculated successfully');
            
            // Remove existing route
            if (routePolyline) {
                routePolyline.setMap(null);
            }
            
            // Draw new route
            const route = result.routes[0];
            const path = route.overview_path;
            
            routePolyline = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: '#2196F3',
                strokeOpacity: 0.8,
                strokeWeight: 4,
                map: map
            });
            
            // Calculate distance and duration
            const distance = route.legs[0].distance.value / 1000; // Convert to km
            const duration = route.legs[0].duration.value / 60; // Convert to minutes
            
            console.log('Distance:', distance, 'km');
            console.log('Duration:', duration, 'minutes');
            console.log('Selected vehicle:', selectedVehicle);
            
            // Display price (price will be calculated in displayPrice based on vehicle)
            displayPrice(0, distance, duration);
            
            // Fit map to show entire route
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(pickup);
            bounds.extend(destination);
            map.fitBounds(bounds);
            
        } else {
            console.error('❌ Route calculation failed:', status);
            
            // Show specific error messages for different failure types
            switch (status) {
                case 'ZERO_RESULTS':
                    showMessage('🚫 No route found between these locations. Please check your pickup and destination points.', 'warning');
                    break;
                case 'NOT_FOUND':
                    showMessage('📍 One or both locations could not be found. Please verify your pickup and destination addresses.', 'error');
                    break;
                case 'OVER_QUERY_LIMIT':
                    showMessage('⏰ Route service limit reached. Please wait a moment and try again.', 'error');
                    break;
                case 'REQUEST_DENIED':
                    showMessage('❌ Route service unavailable. Please refresh the page and try again.', 'error');
                    break;
                case 'INVALID_REQUEST':
                    showMessage('⚠️ Invalid route request. Please check your pickup and destination locations.', 'error');
                    break;
                case 'UNKNOWN_ERROR':
                    showMessage('❓ Unknown error occurred while calculating route. Please try again.', 'error');
                    break;
                default:
                    showMessage(`❌ Route calculation failed: ${status}. Please try again.`, 'error');
                    break;
            }
        }
    });
}

// Vehicle pricing configuration
const vehiclePricing = {
    bike: {
        rate: 6, icon: '🛵', name: 'Bike Taxi', color: '#FFD600', bg: '#FFF9C4',
        etaPerKm: 2.2, capacity: '1 passenger', note: 'Can bypass slow traffic'
    },
    auto: {
        rate: 12, icon: '🛺', name: 'Auto‑Rickshaw', color: '#00BFAE', bg: '#E0F7FA',
        etaPerKm: 3.2, capacity: '2–3 passengers', note: 'Moderate stop-and-go'
    },
    car: {
        rate: 15, icon: '🚗', name: 'Car (Mini)', color: '#1976D2', bg: '#E3F2FD',
        etaPerKm: 4, capacity: '4 passengers', note: 'Slower due to traffic lights and bulk'
    },
    suv: {
        rate: 22, icon: '🚙', name: 'Car (SUV)', color: '#8D6E63', bg: '#F3E5F5',
        etaPerKm: 4.5, capacity: '6 passengers', note: 'Large SUV, slowest in city traffic'
    }
};

// Global variable to track selected vehicle
let selectedVehicle = 'bike';

// Display price information with vehicle selection
function displayPrice(price, distance, duration) {
    console.log('=== DISPLAY PRICE ===');
    
    // Remove existing price display
    if (priceDisplay) {
        priceDisplay.remove();
    }
    
    // Calculate price based on selected vehicle
    const vehicle = vehiclePricing[selectedVehicle];
    const calculatedPrice = Math.round(distance * vehicle.rate);
    
    // Create price display element as a full-width bar
    priceDisplay = document.createElement('div');
    priceDisplay.id = 'priceDisplay';
    priceDisplay.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #2196F3, #1976D2);
        color: white;
        padding: 15px 20px;
        font-family: Arial, sans-serif;
        z-index: 1000;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
    `;
    
    priceDisplay.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1;">
            <div style="text-align: center; min-width: 80px;">
                <div style="font-size: 12px; opacity: 0.9; margin-bottom: 2px;">${vehicle.icon} Price</div>
                <div style="font-size: 18px; font-weight: bold;">₹${calculatedPrice}</div>
            </div>
            <div style="text-align: center; min-width: 70px;">
                <div style="font-size: 12px; opacity: 0.9; margin-bottom: 2px;">📏 ${distance.toFixed(1)}km</div>
                <div style="font-size: 12px; opacity: 0.9;">⏱️ ${formatDuration(Math.round(duration))}</div>
            </div>
            <div style="text-align: center; min-width: 80px;">
                <div style="font-size: 12px; opacity: 0.9; margin-bottom: 2px;">💰 ₹${vehicle.rate}/km</div>
                <div style="font-size: 12px; opacity: 0.9;">${vehicle.name}</div>
            </div>
            <div style="text-align: center; min-width: 100px;">
                <div style="font-size: 12px; opacity: 0.9; margin-bottom: 5px;">Change Vehicle:</div>
                <select id="vehicleSelect" onchange="changeVehicle(this.value)" style="
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.3);
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    cursor: pointer;
                    outline: none;
                    width: 90px;
                ">
                    <option value="bike" ${selectedVehicle === 'bike' ? 'selected' : ''}>🏍️ Bike</option>
                    <option value="auto" ${selectedVehicle === 'auto' ? 'selected' : ''}>🛺 Auto</option>
                    <option value="car" ${selectedVehicle === 'car' ? 'selected' : ''}>🚗 Car</option>
                </select>
            </div>
        </div>
        <button onclick="removePriceDisplay()" style="
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 6px 12px;
            border-radius: 15px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
            white-space: nowrap;
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">✕ Close</button>
    `;
    
    // Add to body
    document.body.appendChild(priceDisplay);
    
    // Add bottom margin to map container to prevent overlap
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
        mapContainer.style.marginBottom = '80px';
    }
    
    console.log('✅ Price display bar created with vehicle selection');
    console.log('Vehicle dropdown should be visible with options: Bike, Auto, Car');
}

// Test function to manually show route info (for debugging)
window.testRouteDisplay = function() {
    console.log('=== TESTING ROUTE DISPLAY ===');
    console.log('Selected vehicle:', selectedVehicle);
    console.log('Vehicle pricing:', vehiclePricing);
    
    // Test with sample data
    displayPrice(0, 35.8, 76);
    console.log('✅ Test route display should be visible at bottom of screen');
};

// Function to change vehicle and update price
function changeVehicle(vehicleType) {
    console.log('=== CHANGE VEHICLE ===');
    console.log('Changing vehicle to:', vehicleType);
    
    selectedVehicle = vehicleType;
    
    // Recalculate and update price display
    if (pickupMarker && destinationMarker) {
        const pickup = pickupMarker.getPosition();
        const destination = destinationMarker.getPosition();
        
        // Recalculate route to get updated distance and duration
        if (directionsService) {
            const request = {
                origin: pickup,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.METRIC
            };
            
            directionsService.route(request, function(result, status) {
                if (status === 'OK') {
                    const route = result.routes[0];
                    const distance = route.legs[0].distance.value / 1000; // Convert to km
                    const duration = route.legs[0].duration.value / 60; // Convert to minutes
                    
                    // Update price display with new vehicle
                    displayPrice(0, distance, duration); // Price will be calculated in displayPrice
                }
            });
        }
    }
}

// Remove price display
function removePriceDisplay() {
    if (priceDisplay) {
        priceDisplay.remove();
        priceDisplay = null;
        
        // Reset map container margin
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.style.marginBottom = '0';
        }
    }
}

// Make functions globally accessible
window.removePriceDisplay = removePriceDisplay;
window.changeVehicle = changeVehicle;

// Validate form and enable/disable book ride button
function validateForm() {
    const pickupInput = document.getElementById('pickup');
    const destinationInput = document.getElementById('destination');
    const bookRideBtn = document.getElementById('bookRideBtn');
    
    const hasPickup = pickupInput.value.trim() !== '';
    const hasDestination = destinationInput.value.trim() !== '';
    
    bookRideBtn.disabled = !(hasPickup && hasDestination);
    
    if (hasPickup && hasDestination) {
        bookRideBtn.textContent = '📱 Book Ride';
    } else {
        bookRideBtn.textContent = '📍 Set Both Locations First';
    }
}

// Submit booking
function submitBooking() {
    console.log('=== SUBMIT BOOKING FUNCTION ===');
    
    // Check authentication before proceeding
    if (!checkAuthentication()) {
        showMessage('Please log in to book a ride.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    const pickupInput = document.getElementById('pickup');
    const destinationInput = document.getElementById('destination');
    
    console.log('Pickup input value:', pickupInput.value);
    console.log('Destination input value:', destinationInput.value);
    console.log('Pickup marker:', pickupMarker);
    console.log('Destination marker:', destinationMarker);
    
    // Validate inputs
    if (!pickupInput.value.trim() || !destinationInput.value.trim()) {
        showMessage('Please enter both pickup and destination locations.', 'error');
        return;
    }
    
    let pickupCoords, destinationCoords;
    
    // First, try to get coordinates from markers
    if (pickupMarker && destinationMarker) {
        const pickupPos = pickupMarker.getPosition();
        const destPos = destinationMarker.getPosition();
        
        pickupCoords = {
            lat: pickupPos.lat(),
            lng: pickupPos.lng()
        };
        destinationCoords = {
            lat: destPos.lat(),
            lng: destPos.lng()
        };
        
        console.log('✅ Using marker positions for booking');
        console.log('Pickup coords:', pickupCoords);
        console.log('Destination coords:', destinationCoords);
        
        // Continue with booking using marker coordinates
        submitBookingWithCoords(pickupCoords, destinationCoords);
    } else {
        console.log('❌ Markers not found, trying to geocode addresses from input fields...');
        
        // If markers don't exist, try to geocode the addresses from input fields
        if (!pickupInput.value.trim() || !destinationInput.value.trim()) {
            showMessage('Please enter both pickup and destination locations.', 'error');
            return;
        }
        
        // Show loading message
        showMessage('Getting coordinates for your locations...', 'info');
        
        // Geocode both addresses
        Promise.all([
            geocodeAddressPromise(pickupInput.value.trim(), 'pickup'),
            geocodeAddressPromise(destinationInput.value.trim(), 'destination')
        ]).then(([pickupResult, destinationResult]) => {
            if (pickupResult && destinationResult) {
                    pickupCoords = pickupResult;
                destinationCoords = destinationResult;
                
                console.log('✅ Geocoded coordinates for booking');
                console.log('Pickup coords:', pickupCoords);
                console.log('Destination coords:', destinationCoords);
                
                // Continue with booking
                submitBookingWithCoords(pickupCoords, destinationCoords);
            } else {
                showMessage('Could not find coordinates for one or both locations. Please try selecting from the suggestions.', 'error');
            }
        }).catch(error => {
            console.error('Geocoding error:', error);
            showMessage('Error getting location coordinates. Please try selecting from the suggestions.', 'error');
        });
        
        return; // Exit early, booking will continue in the Promise
    }
    
}

// Helper function to geocode address and return a promise
function geocodeAddressPromise(address, type) {
    return new Promise((resolve, reject) => {
        if (!geocoder) {
            reject(new Error('Geocoder not available'));
        return;
    }
    
        // Get user's location for better context
        let userLocationContext = '';
        if (userLocation) {
            userLocationContext = ` near ${userLocation.lat.toFixed(2)},${userLocation.lng.toFixed(2)}`;
        }
        
        // Add "India" to improve results
        const searchQuery = address + ', India' + userLocationContext;
        console.log(`Geocoding ${type}: ${searchQuery}`);
        
        geocoder.geocode({ address: searchQuery }, function(results, status) {
            if (status === 'OK' && results[0]) {
                const location = results[0].geometry.location;
                console.log(`${type} geocoded successfully:`, location.lat(), location.lng());
                resolve({
                    lat: location.lat(),
                    lng: location.lng()
                });
            } else {
                console.log(`Geocoding failed for ${type}: ${status}, trying fallback...`);
                
                // Try without user location context as fallback
                const fallbackQuery = address + ', India';
                geocoder.geocode({ address: fallbackQuery }, function(fallbackResults, fallbackStatus) {
                    if (fallbackStatus === 'OK' && fallbackResults[0]) {
                        const location = fallbackResults[0].geometry.location;
                        console.log(`${type} geocoded successfully (fallback):`, location.lat(), location.lng());
                        resolve({
                            lat: location.lat(),
                            lng: location.lng()
                        });
                    } else {
                        reject(new Error(`Geocoding failed for ${type}: ${status} (fallback: ${fallbackStatus})`));
                    }
                });
            }
        });
    });
}

// Submit booking with coordinates
function submitBookingWithCoords(pickupCoords, destinationCoords) {
    // Get authenticated user info
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const riderId = currentUser.username || 'gvkss'; // Use authenticated user or fallback
    
    const booking = {
        riderId: riderId,
        pickupLocation: `${pickupCoords.lat},${pickupCoords.lng}`,
        destinationLocation: `${destinationCoords.lat},${destinationCoords.lng}`,
        status: 'REQUESTED'
    };
    
    console.log('Submitting booking:', booking);
    console.log('Current user:', currentUser);
    
    // Disable button and show loading
    const bookRideBtn = document.getElementById('bookRideBtn');
    bookRideBtn.disabled = true;
    bookRideBtn.textContent = '🔍 Finding Driver...';
    
    // Calculate price based on selected vehicle
    const selectedVehicleData = vehiclePricing[selectedVehicle];
    const calculatedPrice = Math.round(distance * selectedVehicleData.rate);
    
    // Send booking to backend with auto-matching
    fetch('http://localhost:8080/api/bookings/auto-match', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (localStorage.getItem('sessionToken') || '')
        },
        body: JSON.stringify({
            riderId: riderId,
            pickupLocation: booking.pickupLocation,
            destinationLocation: booking.destinationLocation,
            distance: distance,
            duration: duration,
            price: calculatedPrice
        })
    })
    .then(response => {
        console.log('Booking response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Booking response:', data);
        currentBookingId = data.id; // Store the booking ID
        showMessage('Booking submitted successfully! Looking for nearby drivers...', 'success');
        
        // Start polling for driver assignment
        pollForDriverAssignment(data.id);
    })
    .catch(error => {
        console.error('Error submitting booking:', error);
        showMessage('Failed to submit booking. Please try again.', 'error');
        
        // Re-enable button
        bookRideBtn.disabled = false;
        bookRideBtn.textContent = '📱 Book Ride';
    });
}

// Poll for driver assignment
function pollForDriverAssignment(bookingId) {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    const pollInterval = setInterval(() => {
        attempts++;
        
        fetch(`http://localhost:8080/api/bookings/${bookingId}`)
            .then(response => response.json())
            .then(booking => {
                console.log('Polling booking:', booking);
                
                if (booking.driverId && booking.status === 'ASSIGNED') {
                    clearInterval(pollInterval);
                    showDriverAssignmentNotification(booking);
                    showMessage(`Driver ${booking.driverId} assigned to your ride! Please accept or decline.`, 'success');
                } else if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    showMessage('No drivers available at the moment. Please try again later.', 'error');
                    
                    // Re-enable button
                    const bookRideBtn = document.getElementById('bookRideBtn');
                    bookRideBtn.disabled = false;
                    bookRideBtn.textContent = '📱 Book Ride';
                }
            })
            .catch(error => {
                console.error('Error polling booking:', error);
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    showMessage('Error checking booking status. Please try again.', 'error');
                    
                    // Re-enable button
                    const bookRideBtn = document.getElementById('bookRideBtn');
                    bookRideBtn.disabled = false;
                    bookRideBtn.textContent = '📱 Book Ride';
                }
            });
    }, 1000); // Poll every second
}

// Show driver assignment notification
function showDriverAssignmentNotification(booking) {
    const notification = document.getElementById('driverAssignmentNotification');
    const details = document.getElementById('driverAssignmentDetails');
    
    details.textContent = `Driver ${booking.driverId} is assigned to your ride. ETA: 2 minutes.`;
    notification.style.display = 'block';
    
    // Hide the book ride button
    const bookRideBtn = document.getElementById('bookRideBtn');
    bookRideBtn.style.display = 'none';
}

// Accept ride function
function acceptRide() {
    if (!currentBookingId) {
        showMessage('No active booking found.', 'error');
        return;
    }
    
    fetch(`http://localhost:8080/api/bookings/${currentBookingId}/driver-response`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'accept',
            driverId: 'D1' // This should come from the booking
        })
    })
    .then(response => response.json())
    .then(booking => {
        console.log('Ride accepted:', booking);
        showMessage('Ride accepted! Your driver is on the way.', 'success');
        
        // Hide the notification
        document.getElementById('driverAssignmentNotification').style.display = 'none';
        
        // Show ride in progress
        showRideInProgress(booking);
    })
    .catch(error => {
        console.error('Error accepting ride:', error);
        showMessage('Error accepting ride. Please try again.', 'error');
    });
}

// Decline ride function
function declineRide() {
    if (!currentBookingId) {
        showMessage('No active booking found.', 'error');
        return;
    }
    
    fetch(`http://localhost:8080/api/bookings/${currentBookingId}/driver-response`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'decline',
            driverId: 'D1' // This should come from the booking
        })
    })
    .then(response => response.json())
    .then(booking => {
        console.log('Ride declined:', booking);
        showMessage('Ride declined. Looking for another driver...', 'info');
        
        // Hide the notification
        document.getElementById('driverAssignmentNotification').style.display = 'none';
        
        // Re-enable book ride button
        const bookRideBtn = document.getElementById('bookRideBtn');
        bookRideBtn.style.display = 'block';
        bookRideBtn.disabled = false;
        bookRideBtn.textContent = '📱 Book Ride';
        
        // Continue polling for new driver
        pollForDriverAssignment(currentBookingId);
    })
    .catch(error => {
        console.error('Error declining ride:', error);
        showMessage('Error declining ride. Please try again.', 'error');
    });
}

// Show ride in progress
function showRideInProgress(booking) {
    const bookRideBtn = document.getElementById('bookRideBtn');
    bookRideBtn.style.display = 'block';
    bookRideBtn.disabled = true;
    bookRideBtn.textContent = '🚗 Ride in Progress';
    
    showMessage(`Ride with Driver ${booking.driverId} is in progress!`, 'success');
}

// Clear all markers
function clearMarkers() {
    if (pickupMarker) {
        pickupMarker.setMap(null);
        pickupMarker = null;
    }
    if (destinationMarker) {
        destinationMarker.setMap(null);
        destinationMarker = null;
    }
    
    driverMarkers.forEach(driver => {
        driver.marker.setMap(null);
    });
    driverMarkers = [];
    
    // Clear route line
    if (routePolyline) {
        routePolyline.setMap(null);
        routePolyline = null;
    }
    
    // Remove price display
    removePriceDisplay();
    
            // Clear input fields
        document.getElementById('pickup').value = '';
        document.getElementById('destination').value = '';
        
        // Hide messages
        document.getElementById('driverInfo').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('successMessage').style.display = 'none';
        
        debouncedValidateForm();
}

// Reset map
function resetMap() {
    clearMarkers();
    
    // Reset map to default view
    const defaultLocation = { lat: 20.5937, lng: 78.9629 };
    map.setCenter(defaultLocation);
    map.setZoom(12);
}

// Show message
function showMessage(message, type) {
    const successElement = document.getElementById('successMessage');
    const errorElement = document.getElementById('errorMessage');
    const infoElement = document.getElementById('infoMessage');
    
    // Hide all messages first
    if (successElement) successElement.style.display = 'none';
    if (errorElement) errorElement.style.display = 'none';
    if (infoElement) infoElement.style.display = 'none';
    
    let targetElement = null;
    
    if (type === 'error') {
        targetElement = errorElement;
    } else if (type === 'success') {
        targetElement = successElement;
    } else if (type === 'info') {
        targetElement = infoElement;
    }
    
    if (targetElement) {
        targetElement.textContent = message;
        targetElement.style.display = 'block';
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                targetElement.style.display = 'none';
            }, 5000);
        }
    } else {
        // Fallback to console if elements don't exist
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Save the real showMessage function to window for global functions to use
window.realShowMessage = showMessage;

// Quick location setting function (bypasses map clicks)
window.setQuickLocation = function(type, lat, lng) {
    console.log('=== SET QUICK LOCATION ===');
    console.log('setQuickLocation called:', type, lat, lng);
    
    if (!map) {
        console.log('ERROR: Map is not initialized!');
        showMessage('Map is not ready. Please wait a moment and try again.', 'error');
        return;
    }
    
    try {
        // Set the current location type
        currentLocationType = type;
        isLocationSelectionMode = true;
        
        console.log('Location type set:', currentLocationType);
        console.log('Location selection mode:', isLocationSelectionMode);
        
        // Create position object
        const position = { lat: lat, lng: lng };
        console.log('Position object created:', position);
        
        // Remove previous temp marker
        if (tempMarker) {
            console.log('Removing previous temp marker');
            tempMarker.setMap(null);
        }
        
        // Create temp marker
        tempMarker = new google.maps.Marker({
            position: position,
            map: map,
            title: type === 'pickup' ? 'Pickup Location' : 'Destination'
        });
        
        console.log('Quick location temp marker created:', tempMarker);
        
        // Update input field
        const inputField = type === 'pickup' ? 
            document.getElementById('pickup') : 
            document.getElementById('destination');
        
        if (!inputField) {
            console.log('ERROR: Input field not found!');
            showMessage('Input field not found. Please refresh the page.', 'error');
            return;
        }
        
        inputField.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        console.log('Input field updated:', inputField.value);
        
        // Add permanent marker
        if (type === 'pickup') {
            if (pickupMarker) {
                pickupMarker.setMap(null);
            }
            pickupMarker = new google.maps.Marker({
                position: position,
                map: map,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="15" cy="15" r="12" fill="#4CAF50" stroke="white" stroke-width="3"/>
                            <text x="15" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">P</text>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(30, 30),
                    anchor: new google.maps.Point(15, 15)
                },
                title: 'Pickup Location'
            });
            console.log('Pickup marker created');
        } else {
            if (destinationMarker) {
                destinationMarker.setMap(null);
            }
            destinationMarker = new google.maps.Marker({
                position: position,
                map: map,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="15" cy="15" r="12" fill="#FF5722" stroke="white" stroke-width="3"/>
                            <text x="15" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">D</text>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(30, 30),
                    anchor: new google.maps.Point(15, 15)
                },
                title: 'Destination'
            });
            console.log('Destination marker created');
        }
        
        // Clean up
        tempMarker.setMap(null);
        tempMarker = null;
        setLocationSelectionMode(false, 'setQuickLocation');
        
        // Validate form
        debouncedValidateForm();
        
        showMessage(`${type === 'pickup' ? 'Pickup' : 'Destination'} location set successfully!`, 'success');
        console.log('Quick location set successfully');
        
    } catch (error) {
        console.error('Error in setQuickLocation:', error);
        showMessage('Error setting location. Please try again.', 'error');
    }
};

// Manual location setting function (uses input fields)
window.setManualLocation = function(type) {
    console.log('=== SET MANUAL LOCATION ===');
    console.log('setManualLocation called:', type);
    
    // Get coordinates from input fields
    const latInput = document.getElementById('manualLat');
    const lngInput = document.getElementById('manualLng');
    
    if (!latInput || !lngInput) {
        console.log('ERROR: Manual input fields not found!');
        showMessage('Manual input fields not found. Please refresh the page.', 'error');
        return;
    }
    
    // Check if fields are empty
    if (!latInput.value.trim() || !lngInput.value.trim()) {
        console.log('ERROR: Coordinates are empty!');
        showMessage('Please enter both latitude and longitude coordinates.', 'error');
        return;
    }
    
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    
    console.log('Manual coordinates:', lat, lng);
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
        console.log('ERROR: Invalid coordinates!');
        showMessage('Please enter valid numeric coordinates.', 'error');
        return;
    }
    
    if (lat < -90 || lat > 90) {
        console.log('ERROR: Invalid latitude!');
        showMessage('Latitude must be between -90 and 90.', 'error');
        return;
    }
    
    if (lng < -180 || lng > 180) {
        console.log('ERROR: Invalid longitude!');
        showMessage('Longitude must be between -180 and 180.', 'error');
        return;
    }
    
    // Call the quick location function with manual coordinates
    setQuickLocation(type, lat, lng);
    
    // Clear the manual input fields
    latInput.value = '';
    lngInput.value = '';
    
    console.log('Manual location set successfully');
};

// Comprehensive test function to demonstrate all features
window.testAllFeatures = function() {
    console.log('=== TESTING ALL FEATURES ===');
    
    // Test 1: Manual location input
    console.log('Test 1: Setting manual pickup location...');
    const latInput = document.getElementById('manualLat');
    const lngInput = document.getElementById('manualLng');
    
    if (latInput && lngInput) {
        latInput.value = '12.9716';
        lngInput.value = '77.5946';
        setManualLocation('pickup');
        
        // Clear the inputs
        setTimeout(() => {
            latInput.value = '12.9789';
            lngInput.value = '77.5917';
            setManualLocation('destination');
        }, 1000);
    }
    
    // Test 2: Map click functionality
    console.log('Test 2: Testing map click functionality...');
    setTimeout(() => {
        selectLocation('pickup');
        showMessage('Click on the map to test location selection, then click "Confirm"', 'info');
    }, 3000);
    
    // Test 3: WebSocket connection
    console.log('Test 3: Checking WebSocket connection...');
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        showMessage('✅ WebSocket connected successfully!', 'success');
    } else {
        showMessage('❌ WebSocket not connected. Check if Driver Simulator is running.', 'error');
    }
    
    // Test 4: Form validation
    console.log('Test 4: Testing form validation...');
    setTimeout(() => {
        debouncedValidateForm();
        showMessage('Form validation completed. Check if "Book Ride" button is enabled.', 'info');
    }, 5000);
    
    console.log('All tests completed! Check the console and messages for results.');
};

// Check authentication on page load
function checkAuthentication() {
    console.log('=== CHECKING AUTHENTICATION ===');
    
    if (authenticationChecked) {
        console.log('Authentication already checked, skipping...');
        return true;
    }
    
    authenticationChecked = true;
    console.log('Checking authentication...');
    
    // Try sessionStorage first (for current session)
    let user = sessionStorage.getItem('user');
    let token = sessionStorage.getItem('token');
    
    console.log('SessionStorage user:', user);
    console.log('SessionStorage token:', token);
    
    // If not in sessionStorage, try localStorage (for persistent login)
    if (!user || !token) {
        user = localStorage.getItem('currentUser');
        token = localStorage.getItem('sessionToken');
        
        console.log('localStorage user:', user);
        console.log('localStorage token:', token);
        
        if (user && token) {
            // Move from localStorage to sessionStorage for current session
            sessionStorage.setItem('user', user);
            sessionStorage.setItem('token', token);
            console.log('Moved authentication from localStorage to sessionStorage');
        }
    }
    
    if (user && token) {
        try {
            currentUser = JSON.parse(user);
            sessionToken = token;
            console.log('User authenticated:', currentUser);
            showUserInfo();
            
            // Request location permission after successful authentication
            if (map && !userLocation) {
                console.log('Requesting location permission after login...');
                setTimeout(() => {
                    requestLocationPermission();
                }, 500);
            }
            
            authenticationChecked = true;
            return true;
        } catch (e) {
            console.error('Error parsing user data:', e);
            // Don't logout immediately, just clear corrupted data
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('sessionToken');
            currentUser = null;
            sessionToken = null;
        }
    }
    
    // If we get here, no valid authentication found
    console.log('No valid authentication found');
    
    // Don't redirect immediately - let the user continue with limited functionality
    // Only redirect if they try to perform an action that requires authentication
    authenticationChecked = true;
        return false;
}

function showUserInfo() {
    const userInfo = document.getElementById('userInfo');
    const userDisplay = document.getElementById('userDisplay');
    const userRole = document.getElementById('userRole');
    
    if (currentUser && userInfo) {
        userDisplay.textContent = currentUser.username || currentUser.email || 'User';
        userRole.textContent = `(${currentUser.role || 'Rider'})`;
        userInfo.style.display = 'flex';
        console.log('User info displayed:', currentUser);
        
        // Show welcome message
        showMessage(`Welcome back, ${currentUser.username || 'User'}!`, 'success');
    } else {
        // Hide user info if no user
        if (userInfo) {
            userInfo.style.display = 'none';
        }
    }
}

function logout() {
    console.log('Logout called');
    
    // Clear session data
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionToken');
    currentUser = null;
    sessionToken = null;
    authenticationChecked = false;
    
    // Hide user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.style.display = 'none';
    }
    
    // Show logout message
    showMessage('Logged out successfully. Please log in to continue.', 'info');
    
    // Redirect to login page after a short delay
    setTimeout(() => {
    window.location.href = 'login.html';
    }, 1500);
}

function redirectToLogin() {
    // Only redirect if not already on login page
    if (!window.location.href.includes('login.html')) {
    window.location.href = 'login.html';
    }
}

// Make functions globally available - but don't override the working global functions
window.initMap = initMap;
window.submitBooking = submitBooking;
window.clearMarkers = clearMarkers;
window.resetMap = resetMap;
window.selectLocation = selectLocation;
window.confirmLocation = confirmLocation;
window.cancelLocation = cancelLocation;
window.testAllFeatures = testAllFeatures;
// Don't override logout - let the global function handle it
// window.logout = logout;
window.acceptRide = acceptRide;
window.declineRide = declineRide;
// Don't override these - let the global functions handle them
// window.setCurrentLocationAsPickup = setCurrentLocationAsPickup;
// window.requestLocationPermission = requestLocationPermission;
window.geocodeInputDirectly = geocodeInputDirectly;

// Global functions are already available and working
console.log('All global functions are ready');

// Don't override the global functions - they already work properly
console.log('Global functions are already available and working');

// Test function for geocoding (can be called from browser console)
window.testGeocoding = function(address, type) {
    console.log('=== TESTING GEOCODING ===');
    console.log('Address:', address);
    console.log('Type:', type);
    console.log('Geocoder:', geocoder);
    console.log('Map:', map);
    
    if (!geocoder) {
        console.error('Geocoder not available!');
        return;
    }
    
    geocodeAddress(address, type);
};

// Test function for manual geocoding
window.manualGeocode = function(address, type) {
    console.log('=== MANUAL GEOCODING TEST ===');
    
    if (!geocoder) {
        console.error('Geocoder not available!');
        return;
    }
    
    geocoder.geocode({ address: address }, function(results, status) {
        console.log('Manual geocoding result:');
        console.log('Status:', status);
        console.log('Results:', results);
        
        if (status === 'OK') {
            const location = results[0].geometry.location;
            console.log('Location:', location.lat(), location.lng());
            console.log('Formatted address:', results[0].formatted_address);
            
            // Place marker
            placeMarker(location, type, results[0].formatted_address);
            showMessage(`Manual geocoding successful for ${type}!`, 'success');
        } else {
            console.error('Manual geocoding failed:', status);
            showMessage(`Manual geocoding failed: ${status}`, 'error');
        }
    });
};

// Test functions for debugging autocomplete
window.testAutocomplete = function() {
    console.log('=== TESTING AUTOCOMPLETE ===');
    console.log('Autocomplete service:', autocompleteService);
    console.log('Places service:', placesService);
    console.log('Geocoder:', geocoder);
    console.log('Map:', map);
    
    if (autocompleteService) {
        console.log('✅ Autocomplete service is available');
        // Test with a simple query
        autocompleteService.getPlacePredictions({
            input: 'Mumbai',
            componentRestrictions: { country: 'IN' },
            types: ['geocode']
        }, function(predictions, status) {
            console.log('Test autocomplete result:', status, predictions);
            
            if (status === 'OK' && predictions && predictions.length > 0) {
                console.log('✅ Autocomplete test successful');
                showMessage('Autocomplete test successful!', 'success');
            } else {
                console.error('❌ Autocomplete test failed:', status);
                
                // Show specific error messages
                switch (status) {
                    case 'INVALID_REQUEST':
                        showMessage('❌ Autocomplete test failed: Invalid request. Check API configuration.', 'error');
                        break;
                    case 'ZERO_RESULTS':
                        showMessage('⚠️ Autocomplete test: No results found for "Mumbai".', 'warning');
                        break;
                    case 'OVER_QUERY_LIMIT':
                        showMessage('⏰ Autocomplete test failed: Query limit reached.', 'error');
                        break;
                    case 'REQUEST_DENIED':
                        showMessage('❌ Autocomplete test failed: Request denied. Check API key.', 'error');
                        break;
                    default:
                        showMessage(`❌ Autocomplete test failed: ${status}`, 'error');
                        break;
                }
            }
        });
    } else {
        console.error('❌ Autocomplete service is not available');
    }
};

// Test function to check if services are loaded
window.checkServices = function() {
    console.log('=== CHECKING SERVICES ===');
    console.log('Google Maps API loaded:', typeof google !== 'undefined');
    console.log('Google Maps object:', google);
    console.log('Google Maps Maps:', google?.maps);
    console.log('Google Maps Places:', google?.maps?.places);
    console.log('AutocompleteService:', google?.maps?.places?.AutocompleteService);
    console.log('PlacesService:', google?.maps?.places?.PlacesService);
    console.log('Geocoder:', google?.maps?.Geocoder);
    
    if (google?.maps?.places) {
        console.log('✅ Places API is available');
    } else {
        console.error('❌ Places API is not available');
    }
};

// Test function to simulate authentication (for testing when backend is not running)
window.testAuth = function() {
    console.log('=== TESTING AUTHENTICATION ===');
    
    // Simulate a logged-in user
    const testUser = {
        id: 1,
        username: 'TestRider',
        email: 'rider@test.com',
        role: 'RIDER'
    };
    
    const testToken = 'test-token-123';
    
    // Store in session storage
    sessionStorage.setItem('user', JSON.stringify(testUser));
    sessionStorage.setItem('token', testToken);
    
    // Update global variables
    currentUser = testUser;
    sessionToken = testToken;
    
    // Show user info
    showUserInfo();
    
    console.log('Test authentication set:', testUser);
    showMessage('Test authentication set successfully!', 'success');
};

// Test function to clear authentication
window.clearAuth = function() {
    console.log('=== CLEARING AUTHENTICATION ===');
    logout();
    showMessage('Authentication cleared!', 'info');
};

// Test function to manually show logout button
window.showLogoutButton = function() {
    console.log('=== MANUALLY SHOWING LOGOUT BUTTON ===');
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.style.display = 'flex';
        console.log('Logout button should now be visible');
        
        // Also update the user display
        const userDisplay = document.getElementById('userDisplay');
        const userRole = document.getElementById('userRole');
        
        if (userDisplay) userDisplay.textContent = 'Logged In User';
        if (userRole) userRole.textContent = '(Rider)';
        
        showMessage('Logout button is now visible!', 'success');
    } else {
        console.error('User info element not found');
    }
};

// Force authentication check and show user info
window.forceAuthCheck = function() {
    console.log('=== FORCING AUTHENTICATION CHECK ===');
    authenticationChecked = false;
    checkAuthentication();
};

// Test function to check authentication status
window.checkAuthStatus = function() {
    console.log('=== AUTHENTICATION STATUS ===');
    console.log('currentUser:', currentUser);
    console.log('sessionToken:', sessionToken);
    console.log('authenticationChecked:', authenticationChecked);
    
    const userInfo = document.getElementById('userInfo');
    console.log('userInfo element:', userInfo);
    console.log('userInfo display style:', userInfo ? userInfo.style.display : 'not found');
    
    // Try to show user info
    showUserInfo();
    
    // Check localStorage and sessionStorage
    console.log('localStorage currentUser:', localStorage.getItem('currentUser'));
    console.log('localStorage sessionToken:', localStorage.getItem('sessionToken'));
    console.log('sessionStorage user:', sessionStorage.getItem('user'));
    console.log('sessionStorage token:', sessionStorage.getItem('token'));
};

// Test function to check DOM elements
window.checkDOMElements = function() {
    console.log('=== CHECKING DOM ELEMENTS ===');
    console.log('pickup input:', document.getElementById('pickup'));
    console.log('destination input:', document.getElementById('destination'));
    console.log('userInfo:', document.getElementById('userInfo'));
    console.log('map:', document.getElementById('map'));
    console.log('Document ready state:', document.readyState);
};

// Debug function - call this from browser console to test
function debugMapClick() {
    console.log('=== DEBUG MAP CLICK FUNCTION ===');
    console.log('Global variables:');
    console.log('- map:', map);
    console.log('- tempMarker:', tempMarker);
    console.log('- isLocationSelectionMode:', isLocationSelectionMode);
    console.log('- currentLocationType:', currentLocationType);
    console.log('- mapInitialized:', mapInitialized);
    
    if (map) {
        console.log('✅ Map is available');
        console.log('Map center:', map.getCenter());
        console.log('Map zoom:', map.getZoom());
    } else {
        console.log('❌ Map is not available');
    }
    
    console.log('=== END DEBUG ===');
}

// Test function to simulate location selection
function testLocationSelection(type) {
    console.log('=== TEST LOCATION SELECTION ===');
    console.log('Testing location selection for type:', type);
    
    // Set global variables
    currentLocationType = type;
    isLocationSelectionMode = true;
    
    console.log('✅ Set currentLocationType to:', currentLocationType);
    console.log('✅ Set isLocationSelectionMode to:', isLocationSelectionMode);
    
    // Show popup
    const popup = document.getElementById('locationPopup');
    if (popup) {
        popup.style.display = 'flex';
        console.log('✅ Popup shown');
    }
    
    console.log('🎯 Now click on the map to test marker creation');
    console.log('=== END TEST ===');
}

// Simple map click test - call this from console to test
function testMapClick() {
    console.log('=== TESTING MAP CLICK ===');
    console.log('Click anywhere on the map to test if clicks are detected');
    console.log('You should see "🔍 TEST: Map click detected" in console');
    console.log('=== END TEST ===');
}

// Helper function to convert minutes to readable format (e.g., 73 -> "1hr 13mins")
function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes}min`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `${hours}hr`;
        } else {
            return `${hours}hr ${remainingMinutes}min`;
        }
    }
}

// Make test functions available globally
window.testAutocomplete = testAutocomplete;
window.testLocationSelection = testLocationSelection;
window.debugMapClick = debugMapClick;
window.testMapClick = testMapClick;

// Don't override the global functions - they already work
console.log('✅ All functions are available and working'); 

function displayVehiclePanel(distance, duration) {
    let panel = document.getElementById('vehiclePanel');
    if (panel) panel.remove();
    if (priceDisplay) { priceDisplay.remove(); priceDisplay = null; }

    const vehicles = Object.keys(vehiclePricing).map(key => {
        const v = vehiclePricing[key];
        // Dynamic ETA based on distance
        const estTime = Math.round(distance * v.etaPerKm);
        return {
            ...v,
            key,
            price: Math.round(distance * v.rate),
            eta: estTime,
            drop: new Date(Date.now() + estTime * 60000)
        };
    });
    vehicles.sort((a, b) => a.price - b.price);
    const fastestEta = Math.min(...vehicles.map(v => v.eta));

    panel = document.createElement('div');
    panel.id = 'vehiclePanel';
    panel.style.cssText = `
        position: fixed;
        left: 0; right: 0; bottom: 80px; z-index: 1001;
        background: #fff; box-shadow: 0 -2px 16px rgba(0,0,0,0.10);
        border-radius: 18px 18px 0 0; padding: 12px 8px 8px 8px;
        display: flex; flex-direction: column; align-items: stretch; gap: 8px;
        max-width: 480px; margin: 0 auto;
    `;
    panel.innerHTML = `
      <div style="display: flex; gap: 10px; justify-content: space-around;">
        ${vehicles.map(v => `
          <div class="vehicle-card${selectedVehicle === v.key ? ' selected' : ''}" data-vehicle="${v.key}" style="
            flex: 1 1 0; min-width: 110px; max-width: 150px; background: ${v.bg}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 2px solid ${selectedVehicle === v.key ? v.color : 'transparent'}; cursor: pointer; padding: 10px 6px; display: flex; flex-direction: column; align-items: center; position: relative;">
            <div style="font-size: 28px;">${v.icon}</div>
            <div style="font-weight: bold; color: ${v.color}; font-size: 15px; margin: 2px 0 0 0;">${v.name}</div>
            <div style="font-size: 13px; color: #333; margin: 2px 0;">₹${v.price}</div>
            <div style="font-size: 11px; color: #666;">${formatDuration(v.eta)} • Drop ${v.drop.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
            <div style="font-size: 11px; color: #444; margin: 2px 0 0 0;">👥 ${v.capacity}</div>
            <div style="font-size: 10px; color: #888; margin-bottom: 2px;">${v.note}</div>
            ${v.eta === fastestEta ? '<div style=\'position:absolute;top:6px;right:6px;background:#00BFAE;color:#fff;font-size:10px;padding:2px 6px;border-radius:8px;letter-spacing:1px;\'>FASTEST</div>' : ''}
          </div>
        `).join('')}
      </div>
    `;
    const bookBtn = document.getElementById('bookRideBtn');
    if (bookBtn && bookBtn.parentNode) {
        bookBtn.parentNode.insertBefore(panel, bookBtn);
    } else {
        document.body.appendChild(panel);
    }
    Array.from(panel.querySelectorAll('.vehicle-card')).forEach(card => {
        card.onclick = function() {
            selectedVehicle = card.getAttribute('data-vehicle');
            displayVehiclePanel(distance, duration);
            updateBookButton();
        };
    });
    updateBookButton();
}

function updateBookButton() {
    const bookBtn = document.getElementById('bookRideBtn');
    if (bookBtn) {
        const v = vehiclePricing[selectedVehicle];
        bookBtn.textContent = `Book ${v.name}`;
        bookBtn.style.background = v.color;
        bookBtn.style.color = '#222';
    }
}

function displayPrice(price, distance, duration) {
    displayVehiclePanel(distance, duration);
}