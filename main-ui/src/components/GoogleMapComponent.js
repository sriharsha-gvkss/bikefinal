import React, { useRef, useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Autocomplete, DirectionsRenderer, Marker, Polyline } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  marginBottom: '24px'
};

const defaultCenter = {
  lat: 17.385, // Hyderabad default
  lng: 78.4867
};

const libraries = ['places'];

// Custom directions renderer options for better route display
const directionsRendererOptions = {
  suppressMarkers: false, // Keep the default markers
  polylineOptions: {
    strokeColor: '#1976d2', // Blue color for the route line
    strokeWeight: 4, // Thicker line
    strokeOpacity: 0.8, // Slightly transparent
    zIndex: 1 // Ensure route is above other elements
  },
  markerOptions: {
    // Custom marker options if needed
  }
};

// Predefined locations for testing without API key
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
  'abids': { lat: 17.3850, lng: 78.4867, name: 'Abids' }
};

const GoogleMapComponent = ({ onLocationsChange }) => {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [directions, setDirections] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [routePath, setRoutePath] = useState([]);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);

  const pickupRef = useRef();
  const destinationRef = useRef();
  const mapRef = useRef();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(location);
          setMapCenter(location);
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Check if Google Maps API is available
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (!window.google || !window.google.maps || !window.google.maps.Size) {
        console.log('Google Maps not fully available, using fallback mode');
        setUseFallback(true);
      } else {
        console.log('Google Maps API is ready');
        setGoogleMapsReady(true);
      }
    };
    
    // Check after a short delay to allow Google Maps to load
    const timer = setTimeout(checkGoogleMaps, 2000);
    return () => clearTimeout(timer);
  }, []);

  const findPredefinedLocation = (input) => {
    const lowerInput = input.toLowerCase();
    for (const [key, location] of Object.entries(predefinedLocations)) {
      if (lowerInput.includes(key) || key.includes(lowerInput)) {
        return location;
      }
    }
    return null;
  };

  const calculateRoute = async (pickupCoords, destinationCoords) => {
    if (!pickupCoords || !destinationCoords) {
      setDirections(null);
      setRoutePath([]);
      return;
    }

    setIsLoadingRoute(true);
    
    try {
      if (useFallback || !window.google) {
        // Fallback: create a simple polyline between points
        console.log('Using fallback route calculation');
        const fallbackDirections = {
          routes: [{
            legs: [{
              distance: { text: 'Calculating...', value: 0 },
              duration: { text: 'Calculating...', value: 0 }
            }],
            overview_polyline: {
              points: `${pickupCoords.lat},${pickupCoords.lng}|${destinationCoords.lat},${destinationCoords.lng}`
            }
          }]
        };
        setDirections(fallbackDirections);
        
        // Create a simple route path for fallback mode
        setRoutePath([
          { lat: pickupCoords.lat, lng: pickupCoords.lng },
          { lat: destinationCoords.lat, lng: destinationCoords.lng }
        ]);
        
        // Center map to show both points
        if (mapRef.current && window.google && window.google.maps) {
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(pickupCoords);
          bounds.extend(destinationCoords);
          mapRef.current.fitBounds(bounds);
        }
      } else {
        const directionsService = new window.google.maps.DirectionsService();
        
        const request = {
          origin: pickupCoords,
          destination: destinationCoords,
          travelMode: window.google.maps.TravelMode.DRIVING,
          unitSystem: window.google.maps.UnitSystem.METRIC
        };

        console.log('Calculating route from:', pickupCoords, 'to:', destinationCoords);

        const result = await new Promise((resolve, reject) => {
          directionsService.route(request, (result, status) => {
            if (status === 'OK') {
              resolve(result);
            } else {
              reject(new Error(`Directions request failed: ${status}`));
            }
          });
        });

        setDirections(result);
        setRoutePath([]); // Clear fallback route
        
        // Center map to show the entire route
        if (mapRef.current && result.routes[0]) {
          const bounds = new window.google.maps.LatLngBounds();
          result.routes[0].legs[0].steps.forEach(step => {
            bounds.extend(step.start_location);
            bounds.extend(step.end_location);
          });
          mapRef.current.fitBounds(bounds);
        }

        console.log('Route calculated successfully:', result);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      setDirections(null);
      setRoutePath([]);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handlePlaceChanged = async (type) => {
    let place, value, coordinates;
    
    if (type === 'pickup') {
      if (useFallback) {
        // Use predefined locations for fallback
        const predefined = findPredefinedLocation(pickup);
        if (predefined) {
          value = predefined.name;
          coordinates = { lat: predefined.lat, lng: predefined.lng };
        } else {
          value = pickup;
          coordinates = null;
        }
      } else {
        place = pickupRef.current?.getPlace();
        value = place?.formatted_address || pickup;
        coordinates = place?.geometry?.location ? {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        } : null;
      }
      setPickup(value);
      setPickupCoords(coordinates);
    } else {
      if (useFallback) {
        // Use predefined locations for fallback
        const predefined = findPredefinedLocation(destination);
        if (predefined) {
          value = predefined.name;
          coordinates = { lat: predefined.lat, lng: predefined.lng };
        } else {
          value = destination;
          coordinates = null;
        }
      } else {
        place = destinationRef.current?.getPlace();
        value = place?.formatted_address || destination;
        coordinates = place?.geometry?.location ? {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        } : null;
      }
      setDestination(value);
      setDestinationCoords(coordinates);
    }
    
    // Get current state values
    const currentPickup = type === 'pickup' ? coordinates : pickupCoords;
    const currentDestination = type === 'destination' ? coordinates : destinationCoords;
    
    // Always store coordinates in state for both pickup and destination
    const updatedLocations = {
      pickup: currentPickup,
      destination: currentDestination
    };
    
    console.log('Pickup coordinates:', updatedLocations.pickup);
    console.log('Destination coordinates:', updatedLocations.destination);
    
    if (onLocationsChange) {
      onLocationsChange(updatedLocations);
    }
    
    // If both locations are set as coordinates, calculate route
    if (updatedLocations.pickup && updatedLocations.destination && 
        typeof updatedLocations.pickup === 'object' && updatedLocations.pickup.lat && 
        typeof updatedLocations.destination === 'object' && updatedLocations.destination.lat) {
      
      await calculateRoute(updatedLocations.pickup, updatedLocations.destination);
    } else {
      setDirections(null);
    }
  };

  const handleInputChange = (type, value) => {
    if (type === 'pickup') {
      setPickup(value);
    } else {
      setDestination(value);
    }
  };

  const handleInputBlur = (type) => {
    // Trigger place change when input loses focus
    setTimeout(() => handlePlaceChanged(type), 100);
  };

  const onMapLoad = (map) => {
    mapRef.current = map;
    setGoogleMapsReady(true);
  };

  try {
    return (
      <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE'} libraries={libraries}> 
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {useFallback ? (
          <>
            <input
              type="text"
              placeholder="Pickup Location (e.g., Uppal, Hitech City)"
              value={pickup}
              onChange={e => handleInputChange('pickup', e.target.value)}
              onBlur={() => handleInputBlur('pickup')}
              style={{ 
                flex: 1, 
                padding: 12, 
                borderRadius: 6, 
                border: '1px solid #ccc',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
            <input
              type="text"
              placeholder="Destination (e.g., Banjara Hills, Jubilee Hills)"
              value={destination}
              onChange={e => handleInputChange('destination', e.target.value)}
              onBlur={() => handleInputBlur('destination')}
              style={{ 
                flex: 1, 
                padding: 12, 
                borderRadius: 6, 
                border: '1px solid #ccc',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </>
        ) : (
          <>
            <Autocomplete onLoad={ref => (pickupRef.current = ref)} onPlaceChanged={() => handlePlaceChanged('pickup')}>
              <input
                type="text"
                placeholder="Pickup Location"
                value={pickup}
                onChange={e => handleInputChange('pickup', e.target.value)}
                style={{ 
                  flex: 1, 
                  padding: 12, 
                  borderRadius: 6, 
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </Autocomplete>
            <Autocomplete onLoad={ref => (destinationRef.current = ref)} onPlaceChanged={() => handlePlaceChanged('destination')}>
              <input
                type="text"
                placeholder="Destination"
                value={destination}
                onChange={e => handleInputChange('destination', e.target.value)}
                style={{ 
                  flex: 1, 
                  padding: 12, 
                  borderRadius: 6, 
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </Autocomplete>
          </>
        )}
      </div>
      
      {useFallback && (
        <div style={{ 
          background: '#fff3cd', 
          padding: 8, 
          borderRadius: 4, 
          marginBottom: 12,
          fontSize: '12px',
          color: '#856404'
        }}>
          💡 <strong>Demo Mode:</strong> Try locations like "Uppal", "Hitech City", "Banjara Hills", "Jubilee Hills"
        </div>
      )}
      
      <div style={{ position: 'relative' }}>
        <GoogleMap 
          mapContainerStyle={containerStyle} 
          center={mapCenter} 
          zoom={13}
          onLoad={onMapLoad}
        >
          {userLocation && (
            <Marker 
              position={userLocation} 
              label={{ text: "You", color: "white" }}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: googleMapsReady && window.google && window.google.maps && window.google.maps.Size ? new window.google.maps.Size(32, 32) : undefined
              }}
            />
          )}
          
          {pickupCoords && (
            <Marker 
              position={pickupCoords} 
              label={{ text: "A", color: "white" }}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                scaledSize: googleMapsReady && window.google && window.google.maps && window.google.maps.Size ? new window.google.maps.Size(32, 32) : undefined
              }}
            />
          )}
          
          {destinationCoords && (
            <Marker 
              position={destinationCoords} 
              label={{ text: "B", color: "white" }}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: googleMapsReady && window.google && window.google.maps && window.google.maps.Size ? new window.google.maps.Size(32, 32) : undefined
              }}
            />
          )}
          
          {directions && !useFallback && (
            <DirectionsRenderer 
              directions={directions} 
              options={directionsRendererOptions}
            />
          )}
          
          {/* Fallback route line */}
          {useFallback && routePath.length > 1 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#1976d2',
                strokeWeight: 4,
                strokeOpacity: 0.8,
                zIndex: 1
              }}
            />
          )}
        </GoogleMap>
        
        {isLoadingRoute && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 16px',
            borderRadius: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}>
            Calculating route...
          </div>
        )}
        
        {directions && !isLoadingRoute && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}>
            {useFallback ? (
              <div>
                Route: {pickup} → {destination}
                <br />
                <small>Demo mode - add API key for real routing</small>
              </div>
            ) : (
              <div>
                Route: {directions.routes[0]?.legs[0]?.distance?.text} • {directions.routes[0]?.legs[0]?.duration?.text}
              </div>
            )}
          </div>
        )}
      </div>
    </LoadScript>
    );
  } catch (error) {
    console.error('GoogleMapComponent error:', error);
    return (
      <div style={{ 
        width: '100%', 
        height: '400px', 
        background: '#f5f5f5', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
            🗺️ Map Error
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>
            {error.message}
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: '#1976d2',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
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
};

export default GoogleMapComponent; 