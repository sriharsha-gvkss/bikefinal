import React, { useState, useEffect } from 'react';

const SimpleDriverMap = ({ 
  driverLocation, 
  pickupLocation, 
  destination, 
  rideStatus, 
  onLocationUpdate 
}) => {
  const [currentLocation, setCurrentLocation] = useState(driverLocation || { lat: 12.9716, lng: 77.5946 });
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    if (driverLocation) {
      setCurrentLocation(driverLocation);
    }
  }, [driverLocation]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(newLocation);
          setLocationError(null);
          if (onLocationUpdate) {
            onLocationUpdate(newLocation);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('Unable to get current location');
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser');
    }
  };

  const getStatusColor = () => {
    switch (rideStatus) {
      case 'IN_PROGRESS': return '#ff9800';
      case 'PICKUP': return '#2196f3';
      case 'RIDER_CONFIRMED': return '#4caf50';
      case 'IN_TRANSIT': return '#9c27b0';
      case 'COMPLETED': return '#4caf50';
      default: return '#666';
    }
  };

  const getStatusText = () => {
    switch (rideStatus) {
      case 'IN_PROGRESS': return '🚗 Navigate to Pickup';
      case 'PICKUP': return '📍 At Pickup Location';
      case 'RIDER_CONFIRMED': return '✅ Rider Confirmed';
      case 'IN_TRANSIT': return '🚀 Navigate to Destination';
      case 'COMPLETED': return '✅ Trip Completed';
      default: return '📍 Ready for rides';
    }
  };

  return (
    <div style={{ 
      background: 'white', 
      borderRadius: '16px', 
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)', 
      padding: '24px',
      marginBottom: '24px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px' 
      }}>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>
          🗺️ Driver Map (Simple View)
        </div>
        <button
          onClick={getCurrentLocation}
          style={{
            background: '#1976d2',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          📍 Update Location
        </button>
      </div>

      {/* Status Display */}
      <div style={{ 
        background: getStatusColor() + '20', 
        border: `1px solid ${getStatusColor()}`,
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <div style={{ 
          color: getStatusColor(), 
          fontWeight: '600', 
          fontSize: '16px' 
        }}>
          {getStatusText()}
        </div>
      </div>

      {/* Location Display */}
      <div style={{ 
        background: '#f8f9fa', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '20px' 
      }}>
        <div style={{ fontWeight: '600', marginBottom: '8px' }}>📍 Current Location</div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Latitude: {currentLocation.lat.toFixed(6)}
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Longitude: {currentLocation.lng.toFixed(6)}
        </div>
        {locationError && (
          <div style={{ color: '#f44336', fontSize: '12px', marginTop: '8px' }}>
            ⚠️ {locationError}
          </div>
        )}
      </div>

      {/* Route Information */}
      {pickupLocation && (
        <div style={{ 
          background: '#e3f2fd', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '20px' 
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>🚗 Pickup Location</div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {pickupLocation}
          </div>
        </div>
      )}

      {destination && (
        <div style={{ 
          background: '#f3e5f5', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '20px' 
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>🎯 Destination</div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {destination}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{ 
        background: '#fff3e0', 
        borderRadius: '8px', 
        padding: '16px' 
      }}>
        <div style={{ fontWeight: '600', marginBottom: '8px' }}>💡 Instructions</div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          {rideStatus === 'IN_PROGRESS' && 'Use your GPS navigation app to reach the pickup location'}
          {rideStatus === 'PICKUP' && 'You have arrived at pickup. Wait for rider confirmation'}
          {rideStatus === 'RIDER_CONFIRMED' && 'Rider has confirmed. You can start the trip'}
          {rideStatus === 'IN_TRANSIT' && 'Use your GPS navigation app to reach the destination'}
          {rideStatus === 'COMPLETED' && 'Trip completed successfully'}
          {!rideStatus && 'Go online to receive ride requests'}
        </div>
      </div>
    </div>
  );
};

export default SimpleDriverMap; 