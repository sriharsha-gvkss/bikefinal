import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px',
  border: '1px solid #e0e0e0'
};

const LiveTrackingMap = ({ 
  currentBooking, 
  driverLocation, 
  pickupLocation, 
  destinationLocation,
  onLocationUpdate 
}) => {
  const [mapCenter, setMapCenter] = useState(null);
  const [driverPath, setDriverPath] = useState([]);
  const [eta, setEta] = useState(null);
  const [distanceToPickup, setDistanceToPickup] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  
  const mapRef = useRef(null);
  const trackingIntervalRef = useRef(null);

  // Initialize map center
  useEffect(() => {
    if (pickupLocation && pickupLocation.lat) {
      setMapCenter({ lat: pickupLocation.lat, lng: pickupLocation.lng });
    }
  }, [pickupLocation]);

  // Start live tracking when booking is active
  useEffect(() => {
    if (currentBooking && 
        (currentBooking.status === 'IN_PROGRESS' || 
         currentBooking.status === 'PICKUP' || 
         currentBooking.status === 'IN_TRANSIT')) {
      startLiveTracking();
    } else {
      stopLiveTracking();
    }

    return () => stopLiveTracking();
  }, [currentBooking?.status]);

  // Update driver path when location changes
  useEffect(() => {
    if (driverLocation && driverLocation.lat) {
      setDriverPath(prev => [...prev, { lat: driverLocation.lat, lng: driverLocation.lng }]);
      
      // Keep only last 50 points to avoid memory issues
      if (driverPath.length > 50) {
        setDriverPath(prev => prev.slice(-50));
      }

      // Calculate ETA and distance
      calculateETA();
    }
  }, [driverLocation]);

  const startLiveTracking = () => {
    setIsTracking(true);
    console.log('🚗 Starting live tracking...');
    
    // Simulate driver movement for demo (in real app, this would come from WebSocket)
    trackingIntervalRef.current = setInterval(() => {
      if (driverLocation && pickupLocation) {
        simulateDriverMovement();
      }
    }, 3000); // Update every 3 seconds
  };

  const stopLiveTracking = () => {
    setIsTracking(false);
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    console.log('🛑 Stopped live tracking');
  };

  const simulateDriverMovement = () => {
    if (!driverLocation || !pickupLocation) return;

    // Simple simulation: move driver towards pickup location
    const latDiff = pickupLocation.lat - driverLocation.lat;
    const lngDiff = pickupLocation.lng - driverLocation.lng;
    
    // Move 1% of the distance towards pickup
    const newLat = driverLocation.lat + (latDiff * 0.01);
    const newLng = driverLocation.lng + (lngDiff * 0.01);
    
    const newLocation = { lat: newLat, lng: newLng };
    
    if (onLocationUpdate) {
      onLocationUpdate(newLocation);
    }
  };

  const calculateETA = () => {
    if (!driverLocation || !pickupLocation) return;

    // Calculate distance between driver and pickup
    const distance = getDistance(driverLocation, pickupLocation);
    setDistanceToPickup(distance);

    // Estimate ETA based on distance (assuming 30 km/h average speed)
    const speedKmh = 30;
    const etaMinutes = Math.round((distance / speedKmh) * 60);
    setEta(etaMinutes);
  };

  const getDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const onMapLoad = (map) => {
    mapRef.current = map;
  };

  const getStatusColor = () => {
    switch (currentBooking?.status) {
      case 'IN_PROGRESS': return '#ff9800'; // Orange
      case 'PICKUP': return '#4caf50'; // Green
      case 'IN_TRANSIT': return '#2196f3'; // Blue
      default: return '#9e9e9e'; // Grey
    }
  };

  const getStatusText = () => {
    switch (currentBooking?.status) {
      case 'IN_PROGRESS': return '🚗 Driver is on the way';
      case 'PICKUP': return '📍 Driver has arrived';
      case 'IN_TRANSIT': return '🚀 Trip in progress';
      default: return '⏳ Waiting for driver';
    }
  };

  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE'}>
      <div style={{ position: 'relative' }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter || { lat: 17.385, lng: 78.4867 }}
          zoom={15}
          onLoad={onMapLoad}
        >
          {/* Pickup Location Marker */}
          {pickupLocation && (
            <Marker
              position={pickupLocation}
              label={{ text: "A", color: "white" }}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                scaledSize: window.google && window.google.maps ? new window.google.maps.Size(32, 32) : undefined
              }}
            />
          )}

          {/* Destination Location Marker */}
          {destinationLocation && (
            <Marker
              position={destinationLocation}
              label={{ text: "B", color: "white" }}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: window.google && window.google.maps ? new window.google.maps.Size(32, 32) : undefined
              }}
            />
          )}

          {/* Driver Location Marker */}
          {driverLocation && (
            <Marker
              position={driverLocation}
              label={{ text: "🚗", color: "white" }}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: window.google && window.google.maps ? new window.google.maps.Size(32, 32) : undefined
              }}
            />
          )}

          {/* Driver Path */}
          {driverPath.length > 1 && (
            <Polyline
              path={driverPath}
              options={{
                strokeColor: '#1976d2',
                strokeWeight: 3,
                strokeOpacity: 0.7,
                zIndex: 1
              }}
            />
          )}

          {/* Route from Driver to Pickup */}
          {driverLocation && pickupLocation && currentBooking?.status === 'IN_PROGRESS' && (
            <Polyline
              path={[driverLocation, pickupLocation]}
              options={{
                strokeColor: '#ff9800',
                strokeWeight: 4,
                strokeOpacity: 0.8,
                zIndex: 2
              }}
            />
          )}

          {/* Route from Pickup to Destination */}
          {pickupLocation && destinationLocation && currentBooking?.status === 'IN_TRANSIT' && (
            <Polyline
              path={[pickupLocation, destinationLocation]}
              options={{
                strokeColor: '#4caf50',
                strokeWeight: 4,
                strokeOpacity: 0.8,
                zIndex: 2
              }}
            />
          )}
        </GoogleMap>

        {/* Live Tracking Info Panel */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          minWidth: '250px',
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
              {isTracking ? '🟢' : '🔴'}
            </span>
            {getStatusText()}
          </div>

          {driverLocation && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Driver Location</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
              </div>
            </div>
          )}

          {distanceToPickup !== null && currentBooking?.status === 'IN_PROGRESS' && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Distance to Pickup</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#ff9800' }}>
                {distanceToPickup.toFixed(2)} km
              </div>
            </div>
          )}

          {eta !== null && currentBooking?.status === 'IN_PROGRESS' && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Estimated Arrival</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#4caf50' }}>
                {eta} minutes
              </div>
            </div>
          )}

          {currentBooking?.driverId && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Driver</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                {currentBooking.driverId}
              </div>
            </div>
          )}

          <div style={{ fontSize: '10px', color: '#999', fontStyle: 'italic' }}>
            {isTracking ? 'Live tracking active' : 'Tracking paused'}
          </div>
        </div>

        {/* Tracking Controls */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          zIndex: 1000
        }}>
          <button
            onClick={isTracking ? stopLiveTracking : startLiveTracking}
            style={{
              background: isTracking ? '#f44336' : '#4caf50',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            {isTracking ? '🛑 Stop Tracking' : '🚗 Start Tracking'}
          </button>
        </div>
      </div>
    </LoadScript>
  );
};

export default LiveTrackingMap; 