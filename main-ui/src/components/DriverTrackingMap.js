import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, LoadScript, Marker, Polyline, DirectionsRenderer } from '@react-google-maps/api';

// Error Boundary Component
class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Map Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '8px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>Map Error</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Something went wrong with the map</div>
            <button 
              onClick={() => this.setState({ hasError: false })}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px',
  border: '1px solid #e0e0e0'
};

const DriverTrackingMap = ({ 
  activeRide, 
  currentLocation, 
  rideStatus,
  onLocationUpdate 
}) => {
  // All hooks must be called unconditionally at the top level
  const [hasError, setHasError] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [directions, setDirections] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [directionsRendererReady, setDirectionsRendererReady] = useState(false);
  const mapRef = useRef(null);
  const directionsServiceRef = useRef(null);

  // Parse location strings to coordinates
  const parseLocation = (locationString) => {
    if (!locationString) return null;
    
    console.log('📍 Parsing location:', locationString);
    
    // Handle coordinate strings like "17.2944532,78.5665236"
    if (locationString.includes(',')) {
      const [lat, lng] = locationString.split(',').map(coord => parseFloat(coord.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        console.log('✅ Parsed coordinates:', { lat, lng });
        return { lat, lng };
      }
    }
    
    // Handle predefined locations (fallback)
    const predefinedLocations = {
      'uppal': { lat: 17.4058, lng: 78.5597, name: 'Uppal' },
      'lb nagar': { lat: 17.3676, lng: 78.5577, name: 'L.B. Nagar' },
      'secunderabad': { lat: 17.4399, lng: 78.4983, name: 'Secunderabad' },
      'hitech city': { lat: 17.4454, lng: 78.3772, name: 'Hitech City' },
      'banjara hills': { lat: 17.4065, lng: 78.4772, name: 'Banjara Hills' },
      'jubilee hills': { lat: 17.4229, lng: 78.4078, name: 'Jubilee Hills' },
      'gachibowli': { lat: 17.4401, lng: 78.3489, name: 'Gachibowli' },
      'kukatpally': { lat: 17.4849, lng: 78.4138, name: 'Kukatpally' },
      'dilsukhnagar': { lat: 17.3713, lng: 78.5264, name: 'Dilsukhnagar' },
      'malakpet': { lat: 17.3841, lng: 78.4864, name: 'Malakpet' },
      'abids': { lat: 17.3850, lng: 78.4867, name: 'Abids' },
      'hyderabad': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad' },
      'begumpet': { lat: 17.4432, lng: 78.4732, name: 'Begumpet' },
      'ameerpet': { lat: 17.4375, lng: 78.4482, name: 'Ameerpet' },
      'paradise': { lat: 17.4065, lng: 78.4772, name: 'Paradise' }
    };

    const lowerLocation = locationString.toLowerCase();
    for (const [key, location] of Object.entries(predefinedLocations)) {
      if (lowerLocation.includes(key) || key.includes(lowerLocation)) {
        console.log('✅ Found predefined location:', location.name, location);
        return { lat: location.lat, lng: location.lng };
      }
    }
    
    console.log('❌ Could not parse location:', locationString);
    return null;
  };

  // Initialize locations when active ride changes
  useEffect(() => {
    if (activeRide) {
      const pickup = parseLocation(activeRide.pickupLocation);
      const destination = parseLocation(activeRide.destination);
      
      console.log('🎯 Setting ride locations:', {
        pickup: pickup,
        destination: destination,
        pickupString: activeRide.pickupLocation,
        destinationString: activeRide.destination
      });
      
      setPickupLocation(pickup);
      setDestinationLocation(destination);
      
      // Set initial map center to pickup location
      if (pickup) {
        setMapCenter(pickup);
      }
    }
  }, [activeRide]);

  // Calculate route based on ride status
  useEffect(() => {
    if (!activeRide || !currentLocation) return;

    const calculateRoute = async () => {
      let origin, destination;
      
      if (rideStatus === 'IN_PROGRESS') {
        // Route from driver to pickup
        origin = currentLocation;
        destination = pickupLocation;
        setIsNavigating(true);
        console.log('🚗 Calculating route to pickup:', { origin, destination });
      } else if (rideStatus === 'IN_TRANSIT') {
        // Route from pickup to destination
        origin = pickupLocation;
        destination = destinationLocation;
        setIsNavigating(true);
        console.log('🚀 Calculating route to destination:', { origin, destination });
      } else {
        // No navigation needed
        setIsNavigating(false);
        setDirections(null);
        return;
      }

      // Wait a bit for locations to be set
      if (!origin || !destination) {
        console.log('⏳ Waiting for locations to be set...');
        setTimeout(() => calculateRoute(), 1000);
        return;
      }

      if (!origin || !destination) {
        console.log('❌ Missing origin or destination:', { 
          origin, 
          destination, 
          currentLocation, 
          pickupLocation, 
          destinationLocation,
          rideStatus 
        });
        return;
      }

      // Only show route for specific ride statuses
      if (rideStatus === 'IN_PROGRESS' || rideStatus === 'IN_TRANSIT') {
        // Try Google Maps Directions API first
        if (window.google && window.google.maps && window.google.maps.DirectionsService && googleMapsLoaded && !googleMapsError) {
          try {
            if (!directionsServiceRef.current) {
              directionsServiceRef.current = new window.google.maps.DirectionsService();
            }

            const request = {
              origin: origin,
              destination: destination,
              travelMode: window.google.maps.TravelMode.DRIVING,
              unitSystem: window.google.maps.UnitSystem.METRIC
            };

            console.log('🗺️ Requesting Google Maps directions...', { origin, destination, rideStatus });
            const result = await new Promise((resolve, reject) => {
              directionsServiceRef.current.route(request, (result, status) => {
                console.log('🗺️ Google Maps response status:', status);
                if (status === 'OK') {
                  resolve(result);
                } else {
                  reject(new Error(`Directions request failed: ${status}`));
                }
              });
            });

            // Validate the result before setting directions
            if (result && 
                result.routes && 
                result.routes.length > 0 && 
                result.routes[0].legs && 
                result.routes[0].legs.length > 0 &&
                result.routes[0].legs[0].distance &&
                result.routes[0].legs[0].duration) {
              setDirections(result);
              
              // Calculate ETA and distance
              const leg = result.routes[0].legs[0];
              setDistance(leg.distance.text);
              setEta(leg.duration.text);
              console.log('✅ Route calculated:', { distance: leg.distance.text, eta: leg.duration.text });
            } else {
              console.warn('⚠️ Invalid directions result, using fallback');
              throw new Error('Invalid directions result');
            }

            // Center map to show the entire route
            if (mapRef.current && result.routes[0]) {
              const bounds = new window.google.maps.LatLngBounds();
              result.routes[0].legs[0].steps.forEach(step => {
                bounds.extend(step.start_location);
                bounds.extend(step.end_location);
              });
              mapRef.current.fitBounds(bounds);
            }

            console.log('🚗 Google Maps route calculated successfully');
            return;
          } catch (error) {
            console.error('❌ Google Maps directions failed:', error);
            // Fall back to simple polyline
          }
        } else if (window.google && window.google.maps && !googleMapsLoaded && retryCount < 5) {
          // Google Maps API is loaded but map not ready yet, retry in 1 second
          console.log('⏳ Google Maps API loaded but map not ready, retrying...', retryCount + 1);
          setRetryCount(retryCount + 1);
          setTimeout(() => calculateRoute(), 1000);
          return;
        } else if (window.google && window.google.maps && !window.google.maps.DirectionsService && retryCount < 5) {
          // Google Maps API is loaded but DirectionsService not ready yet, retry in 2 seconds
          console.log('⏳ Google Maps API loaded but DirectionsService not ready, retrying...', retryCount + 1);
          setRetryCount(retryCount + 1);
          setTimeout(() => calculateRoute(), 2000);
          return;
        } else {
          // Google Maps not available or max retries reached, use fallback
          console.log('⚠️ Google Maps not available or max retries reached, using fallback polyline');
          setGoogleMapsError(true);
        }

        // Fallback: Create simple polyline route
        console.log('🔄 Using fallback polyline route');
        const fallbackRoute = {
          routes: [{
            legs: [{
              distance: { text: 'Calculating...' },
              duration: { text: 'Calculating...' },
              start_location: origin,
              end_location: destination,
              steps: [{
                start_location: origin,
                end_location: destination,
                polyline: { points: `${origin.lat},${origin.lng} ${destination.lat},${destination.lng}` }
              }]
            }],
            overview_path: [origin, destination],
            overview_polyline: { points: `${origin.lat},${origin.lng} ${destination.lat},${destination.lng}` }
          }]
        };
        
        setDirections(fallbackRoute);
        setDistance('Calculating...');
        setEta('Calculating...');
      } else {
        // Clear directions for other statuses
        setDirections(null);
        setDistance(null);
        setEta(null);
        console.log('📍 No route needed for status:', rideStatus);
      }
    };

    calculateRoute();
  }, [activeRide, currentLocation, pickupLocation, destinationLocation, rideStatus, googleMapsLoaded, googleMapsError, retryCount]);

  // Reset directions renderer when there are errors
  useEffect(() => {
    if (googleMapsError) {
      setDirectionsRendererReady(false);
      setDirections(null);
    }
  }, [googleMapsError]);

  const onMapLoad = (map) => {
    mapRef.current = map;
    setGoogleMapsLoaded(true);
    setDirectionsRendererReady(true);
    console.log('✅ Google Maps loaded and ready');
  };

  const getStatusText = () => {
    switch (rideStatus) {
      case 'IN_PROGRESS': return '🚗 Navigate to Pickup';
      case 'PICKUP': return '📍 At Pickup Location';
      case 'RIDER_CONFIRMED': return '✅ Rider Confirmed';
      case 'IN_TRANSIT': return '🚀 Navigate to Destination';
      case 'COMPLETED': return '✅ Trip Completed';
      default: return '⏳ Waiting for ride';
    }
  };

  const getStatusColor = () => {
    switch (rideStatus) {
      case 'IN_PROGRESS': return '#ff9800'; // Orange
      case 'PICKUP': return '#4caf50'; // Green
      case 'RIDER_CONFIRMED': return '#2196f3'; // Blue
      case 'IN_TRANSIT': return '#9c27b0'; // Purple
      default: return '#9e9e9e'; // Grey
    }
  };

  const getRouteColor = () => {
    switch (rideStatus) {
      case 'IN_PROGRESS': return '#ff9800'; // Orange for pickup route
      case 'IN_TRANSIT': return '#4caf50'; // Green for destination route
      default: return '#1976d2'; // Blue default
    }
  };

  // Use a default API key for development if none is provided
  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg';

  // Don't render if there's an error
  if (hasError) {
    return (
      <div style={{
        width: '100%',
        height: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🗺️</div>
          <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>Map Unavailable</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Google Maps failed to load</div>
        </div>
      </div>
    );
  }

  return (
    <MapErrorBoundary>
      <LoadScript 
        googleMapsApiKey={googleMapsApiKey}
        onLoad={() => {
          console.log('✅ Google Maps API loaded successfully');
          setGoogleMapsLoaded(true);
        }}
        onError={(error) => {
          console.error('❌ Google Maps API failed to load:', error);
          setHasError(true);
          setGoogleMapsError(true);
        }}
        onUnmount={() => {
          console.log('🗺️ Google Maps API unmounted');
          setGoogleMapsLoaded(false);
        }}
      >
      <div style={{ position: 'relative' }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter || currentLocation || { lat: 17.385, lng: 78.4867 }}
          zoom={15}
          onLoad={onMapLoad}
          onError={(error) => {
            console.error('Google Maps error:', error);
            setHasError(true);
          }}
        >
        {/* Driver Location Marker */}
        {currentLocation && (
          <Marker
            position={currentLocation}
            label={{ text: "🚗", color: "white" }}
          />
        )}

        {/* Pickup Location Marker */}
        {pickupLocation && (
          <Marker
            position={pickupLocation}
            label={{ text: "A", color: "white" }}
          />
        )}

        {/* Destination Location Marker */}
        {destinationLocation && (
          <Marker
            position={destinationLocation}
            label={{ text: "B", color: "white" }}
          />
        )}

        {/* Directions Route */}
        {directions && 
         window.google && 
         window.google.maps && 
         window.google.maps.DirectionsRenderer &&
         window.google.maps.DirectionsService &&
         googleMapsLoaded &&
         directionsRendererReady &&
         !googleMapsError &&
         directions.routes && 
         directions.routes.length > 0 && 
         directions.routes[0].legs && 
         directions.routes[0].legs.length > 0 &&
         directions.routes[0].legs[0].distance &&
         directions.routes[0].legs[0].duration && (
          (() => {
            try {
              return (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    suppressMarkers: false,
                    polylineOptions: {
                      strokeColor: getRouteColor(),
                      strokeWeight: 5,
                      strokeOpacity: 0.8,
                      zIndex: 2
                    }
                  }}
                  onError={(error) => {
                    console.error('DirectionsRenderer error:', error);
                    setDirections(null);
                  }}
                />
              );
            } catch (error) {
              console.error('Error rendering DirectionsRenderer:', error);
              return null;
            }
          })()
        )}

        {/* Fallback Polyline Route */}
        {(!directions || googleMapsError || !directionsRendererReady) && (rideStatus === 'IN_PROGRESS' || rideStatus === 'IN_TRANSIT') && (
          <>
            {/* Route to pickup */}
            {rideStatus === 'IN_PROGRESS' && currentLocation && pickupLocation && (
              <Polyline
                path={[currentLocation, pickupLocation]}
                options={{
                  strokeColor: '#ff9800',
                  strokeWeight: 5,
                  strokeOpacity: 0.8,
                  zIndex: 2
                }}
              />
            )}
            
            {/* Route to destination */}
            {rideStatus === 'IN_TRANSIT' && pickupLocation && destinationLocation && (
              <Polyline
                path={[pickupLocation, destinationLocation]}
                options={{
                  strokeColor: '#4caf50',
                  strokeWeight: 5,
                  strokeOpacity: 0.8,
                  zIndex: 2
                }}
              />
            )}
          </>
        )}

        {/* Test Route - Always show a route line for testing */}
        {process.env.NODE_ENV === 'development' && currentLocation && (
          <Polyline
            path={[
              currentLocation,
              { lat: currentLocation.lat + 0.01, lng: currentLocation.lng + 0.01 }
            ]}
            options={{
              strokeColor: '#ff0000',
              strokeWeight: 3,
              strokeOpacity: 0.6,
              zIndex: 1
            }}
          />
        )}
        </GoogleMap>

        {/* Navigation Info Panel */}
        {isNavigating && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            minWidth: '280px',
            zIndex: 1000
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '12px',
              color: getStatusColor(),
              fontWeight: '600'
            }}>
              <span style={{ fontSize: '20px', marginRight: '8px' }}>
                {rideStatus === 'IN_PROGRESS' ? '🚗' : 
                 rideStatus === 'PICKUP' ? '📍' : 
                 rideStatus === 'IN_TRANSIT' ? '🚀' : 
                 rideStatus === 'COMPLETED' ? '✅' : '⏳'}
              </span>
              {getStatusText()}
            </div>
            {rideStatus === 'IN_PROGRESS' && (
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                Route: Driver → Pickup Location
              </div>
            )}
            {rideStatus === 'IN_TRANSIT' && (
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                Route: Pickup → Destination
              </div>
            )}

            {distance && eta && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {rideStatus === 'IN_PROGRESS' ? 'To Pickup' : 'To Destination'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#1976d2' }}>
                  {distance} • {eta}
                </div>
              </div>
            )}

            {activeRide && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Ride Details</div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                  Vehicle: {activeRide.vehicleType || 'BIKE_1_SEATER'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                  Price: ₹{activeRide.price}
                </div>
              </div>
            )}

            {currentLocation && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Your Location</div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                  {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                </div>
              </div>
            )}

            <div style={{ fontSize: '10px', color: '#999', fontStyle: 'italic' }}>
              {isNavigating ? 'Navigation active' : 'No active navigation'}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          zIndex: 1000
        }}>
          {rideStatus === 'IN_PROGRESS' && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '8px 12px',
              borderRadius: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              fontSize: '12px',
              fontWeight: '500',
              color: '#ff9800'
            }}>
              🚗 Navigate to Pickup
            </div>
          )}
          {rideStatus === 'IN_TRANSIT' && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '8px 12px',
              borderRadius: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              fontSize: '12px',
              fontWeight: '500',
              color: '#4caf50'
            }}>
              🚀 Navigate to Destination
            </div>
          )}
        </div>

        {/* Debug Panel - Remove this in production */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '10px',
            fontFamily: 'monospace',
            zIndex: 1000,
            maxWidth: '250px'
          }}>
            <div>Status: {rideStatus}</div>
            <div>Navigating: {isNavigating ? 'Yes' : 'No'}</div>
            <div>Directions: {directions ? 'Loaded' : 'None'}</div>
            <div>Google Maps: {window.google ? 'Available' : 'Not Available'}</div>
            <div>API Key: {process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? 'Set' : 'Missing'}</div>
            <div>Pickup: {pickupLocation ? 'Set' : 'None'}</div>
            <div>Destination: {destinationLocation ? 'Set' : 'None'}</div>
            <div>Current: {currentLocation ? 'Set' : 'None'}</div>
            <button 
              onClick={() => {
                console.log('🧪 Test button clicked');
                console.log('Current state:', {
                  rideStatus,
                  isNavigating,
                  directions,
                  pickupLocation,
                  destinationLocation,
                  currentLocation
                });
                
                // Force route calculation
                if (currentLocation && pickupLocation) {
                  console.log('🧪 Forcing route calculation...');
                  const testRoute = {
                    routes: [{
                      legs: [{
                        distance: { text: 'Test Route' },
                        duration: { text: 'Test Time' }
                      }],
                      overview_path: [currentLocation, pickupLocation]
                    }]
                  };
                  setDirections(testRoute);
                  setDistance('Test Route');
                  setEta('Test Time');
                }
              }}
              style={{
                background: '#4caf50',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: 'pointer',
                marginTop: '4px'
              }}
            >
              Test Route
            </button>
          </div>
        )}
      </div>
      </LoadScript>
    </MapErrorBoundary>
  );
};

export default DriverTrackingMap; 