import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import Header from './Header';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import LocationService from '../services/LocationService';
import DriverTrackingMap from './DriverTrackingMap';
import SimpleDriverMap from './SimpleDriverMap';
import config from '../config';

const API_BASE = config.bookingServiceUrl;

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  marginBottom: '24px'
};

const DriverDashboard = () => {
  const { auth, logout } = useAuth();
  console.log('DriverDashboard auth:', auth); // Debug log
  const [rideRequests, setRideRequests] = useState([]);
  const [driverStatus, setDriverStatus] = useState('AVAILABLE');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentLocation, setCurrentLocation] = useState({ lat: 17.385, lng: 78.4867 });
  const [locationHistory, setLocationHistory] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [completedRides, setCompletedRides] = useState(0);
  const [activeRide, setActiveRide] = useState(null);
  const [rideStatus, setRideStatus] = useState('WAITING'); // WAITING, PICKUP, IN_TRANSIT, COMPLETED
  const [locationUpdateInterval, setLocationUpdateInterval] = useState(null);
  const [locationWatchId, setLocationWatchId] = useState(null);
  const [websocket, setWebsocket] = useState(null);
  const websocketRef = useRef(null);
  const [newRideNotification, setNewRideNotification] = useState(false);
  const [useSimpleMap, setUseSimpleMap] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [lastRideCount, setLastRideCount] = useState(0);

  useEffect(() => {
    fetchRideRequests();
    fetchDriverStatus();
    fetchEarnings();
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationHistory([{ lat: pos.coords.latitude, lng: pos.coords.longitude }]);
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }

    // Setup polling first (always works)
    setupPolling();

    // Setup WebSocket for real-time notifications (may fail if backend not running)
    setupWebSocket();

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  const setupWebSocket = () => {
    try {
      // Check if WebSocket is supported
      if (!window.WebSocket) {
        console.warn('⚠️ WebSocket not supported, using polling only');
        return;
      }

      const wsUrl = `ws://localhost:8080/ws/driver-notifications?driverId=${auth.username}`;
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected for driver notifications');
        setWebsocket(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data);
          
          if (data.type === 'NEW_RIDE_REQUEST') {
            console.log('🚗 New ride request received via WebSocket');
            setNewRideNotification(true);
            fetchRideRequests(); // Refresh the list
            // Clear notification after 5 seconds
            setTimeout(() => setNewRideNotification(false), 5000);
          } else if (data.type === 'RIDE_STATUS_UPDATE') {
            console.log('🔄 Ride status update received:', data.booking);
            if (activeRide && data.booking.id === activeRide.id) {
              setActiveRide(data.booking);
              setRideStatus(data.booking.status);
            }
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.log('⚠️ WebSocket connection failed, using polling fallback');
        // Don't show error to user, just log it
        setWebsocket(null);
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setWebsocket(null);
        // Try to reconnect after 5 seconds only if it wasn't a normal closure
        if (event.code !== 1000) {
          setTimeout(() => {
            if (websocketRef.current) {
              setupWebSocket();
            }
          }, 5000);
        }
      };
    } catch (error) {
      console.error('❌ Error setting up WebSocket:', error);
      // Don't show error to user, just log it
    }
  };

  const setupPolling = () => {
    try {
      // Poll for new ride requests every 10 seconds as fallback
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE}/bookings/available`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const currentCount = data.length;
            
            // If we have more ride requests than before, show notification
            if (currentCount > lastRideCount && lastRideCount > 0) {
              console.log('🚗 New ride request detected via polling');
              setNewRideNotification(true);
              setRideRequests(data);
              // Clear notification after 5 seconds
              setTimeout(() => setNewRideNotification(false), 5000);
            } else {
              setRideRequests(data);
            }
            
            setLastRideCount(currentCount);
          }
        } catch (error) {
          console.error('❌ Error polling for ride requests:', error);
        }
      }, 10000); // Poll every 10 seconds
      
      setPollingInterval(interval);
      console.log('🔄 Polling setup for ride requests every 10 seconds');
    } catch (error) {
      console.error('❌ Error setting up polling:', error);
    }
  };

  const fetchRideRequests = async () => {
    try {
      const response = await fetch(`${API_BASE}/bookings/available`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRideRequests(data);
      } else {
        setError('Failed to fetch ride requests');
      }
    } catch (err) {
      setError('Error fetching ride requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/drivers/status`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDriverStatus(data.status);
      }
    } catch (err) {
      console.error('Error fetching driver status:', err);
    }
  };

  const fetchEarnings = async () => {
    try {
      const response = await fetch(`${API_BASE}/drivers/earnings`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEarnings(data.totalEarnings || 0);
        setCompletedRides(data.completedRides || 0);
      }
    } catch (err) {
      console.error('Error fetching earnings:', err);
    }
  };

  const updateDriverStatus = async (newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/drivers/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        setDriverStatus(newStatus);
        console.log('Driver status updated to:', newStatus);
      } else {
        setError('Failed to update driver status');
      }
    } catch (err) {
      setError('Error updating driver status: ' + err.message);
    }
  };

  const acceptRideRequest = async (bookingId) => {
    try {
      const response = await fetch(`${API_BASE}/bookings/${bookingId}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const booking = await response.json();
        setActiveRide(booking);
        setRideStatus('PICKUP');
        setDriverStatus('BUSY');
        
        // Start location tracking for this ride
        startLocationTracking(bookingId);
        
        // Refresh ride requests
        fetchRideRequests();
        
        console.log('Ride accepted:', booking);
      } else {
        setError('Failed to accept ride request');
      }
    } catch (err) {
      setError('Error accepting ride request: ' + err.message);
    }
  };

  const startLocationTracking = (bookingId) => {
    // Start updating driver location every 10 seconds
    const interval = setInterval(async () => {
      try {
        await updateDriverLocation(currentLocation);
      } catch (error) {
        console.error('Error updating driver location:', error);
      }
    }, 10000);
    
    setLocationUpdateInterval(interval);
    
    // Start watching location changes
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(newLocation);
          setLocationHistory(prev => [...prev, newLocation]);
        },
        (error) => {
          console.error('Error watching location:', error);
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
      );
      setLocationWatchId(watchId);
    }
  };

  const updateDriverLocation = async (location) => {
    try {
      const response = await fetch(`${API_BASE}/drivers/location`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng
        })
      });
      
      if (response.ok) {
        console.log('Driver location updated:', location);
      }
    } catch (error) {
      console.error('Error updating driver location:', error);
    }
  };

  const updateRideStatus = async (status) => {
    if (!activeRide) return;
    
    try {
      const response = await fetch(`${API_BASE}/bookings/${activeRide.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        setRideStatus(status);
        
        if (status === 'COMPLETED') {
          // Stop location tracking
          if (locationUpdateInterval) {
            clearInterval(locationUpdateInterval);
            setLocationUpdateInterval(null);
          }
          if (locationWatchId) {
            navigator.geolocation.clearWatch(locationWatchId);
            setLocationWatchId(null);
          }
          
          // Reset driver status
          setDriverStatus('AVAILABLE');
          setActiveRide(null);
          
          // Refresh earnings
          fetchEarnings();
        }
        
        console.log('Ride status updated to:', status);
      } else {
        setError('Failed to update ride status');
      }
    } catch (err) {
      setError('Error updating ride status: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Header />
        <div className="dashboard-content">
          <div className="loading">Loading driver dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header />
      <div className="dashboard-content">
        <h2>Driver Dashboard</h2>
        
        {error && <div className="error">{error}</div>}
        
        {/* Driver Stats */}
        <div className="stats-grid">
          <div className="stats-card">
            <div className="stats-number">{earnings}</div>
            <div className="stats-label">Total Earnings (₹)</div>
          </div>
          <div className="stats-card">
            <div className="stats-number">{completedRides}</div>
            <div className="stats-label">Completed Rides</div>
          </div>
          <div className="stats-card">
            <div className="stats-number">{driverStatus}</div>
            <div className="stats-label">Current Status</div>
          </div>
          <div className="stats-card">
            <div className="stats-number">{rideRequests.length}</div>
            <div className="stats-label">Available Rides</div>
          </div>
        </div>

        {/* Driver Status Control */}
        <div className="card">
          <h3>Driver Status</h3>
          <div className="btn-group">
            <button 
              onClick={() => updateDriverStatus('AVAILABLE')}
              className={`btn ${driverStatus === 'AVAILABLE' ? 'btn-primary' : 'btn-outline'}`}
            >
              Available
            </button>
            <button 
              onClick={() => updateDriverStatus('BUSY')}
              className={`btn ${driverStatus === 'BUSY' ? 'btn-primary' : 'btn-outline'}`}
            >
              Busy
            </button>
            <button 
              onClick={() => updateDriverStatus('OFFLINE')}
              className={`btn ${driverStatus === 'OFFLINE' ? 'btn-primary' : 'btn-outline'}`}
            >
              Offline
            </button>
          </div>
        </div>

        {/* Active Ride */}
        {activeRide && (
          <div className="card">
            <h3>Active Ride</h3>
            <div className="grid grid-2">
              <div>
                <p><strong>Booking ID:</strong> {activeRide.id}</p>
                <p><strong>Pickup:</strong> {activeRide.pickupLocation}</p>
                <p><strong>Destination:</strong> {activeRide.destination}</p>
                <p><strong>Vehicle Type:</strong> {activeRide.vehicleType}</p>
                <p><strong>Estimated Price:</strong> ₹{activeRide.estimatedPrice}</p>
              </div>
              <div>
                <p><strong>Current Status:</strong> {rideStatus}</p>
                <div className="btn-group">
                  {rideStatus === 'PICKUP' && (
                    <button onClick={() => updateRideStatus('IN_TRANSIT')} className="btn btn-primary">
                      Start Trip
                    </button>
                  )}
                  {rideStatus === 'IN_TRANSIT' && (
                    <button onClick={() => updateRideStatus('COMPLETED')} className="btn btn-secondary">
                      Complete Trip
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="card">
          <h3>Current Location</h3>
          <div className="map-container">
            {useSimpleMap ? (
              <SimpleDriverMap 
                currentLocation={currentLocation}
                locationHistory={locationHistory}
              />
            ) : (
              <LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY">
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={currentLocation}
                  zoom={15}
                >
                  <Marker position={currentLocation} />
                </GoogleMap>
              </LoadScript>
            )}
          </div>
          <div className="btn-group">
            <button 
              onClick={() => setUseSimpleMap(!useSimpleMap)}
              className="btn btn-outline"
            >
              {useSimpleMap ? 'Use Google Maps' : 'Use Simple Map'}
            </button>
          </div>
        </div>

        {/* Available Ride Requests */}
        <div className="card">
          <h3>Available Ride Requests</h3>
          {newRideNotification && (
            <div className="success">
              🚗 New ride request available!
            </div>
          )}
          
          {rideRequests.length === 0 ? (
            <p>No ride requests available at the moment.</p>
          ) : (
            <div className="table-container">
              <table className="table table-responsive">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Pickup</th>
                    <th>Destination</th>
                    <th>Vehicle Type</th>
                    <th>Price</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rideRequests.map((request) => (
                    <tr key={request.id}>
                      <td data-label="Booking ID">{request.id}</td>
                      <td data-label="Pickup">{request.pickupLocation}</td>
                      <td data-label="Destination">{request.destination}</td>
                      <td data-label="Vehicle Type">{request.vehicleType}</td>
                      <td data-label="Price">₹{request.estimatedPrice}</td>
                      <td data-label="Action">
                        <button 
                          onClick={() => acceptRideRequest(request.id)}
                          className="btn btn-primary"
                          disabled={driverStatus !== 'AVAILABLE'}
                        >
                          Accept
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="card">
          <h3>Connection Status</h3>
          <div className="grid grid-2">
            <div>
              <p><strong>WebSocket:</strong> {websocket ? '✅ Connected' : '❌ Disconnected'}</p>
              <p><strong>Polling:</strong> ✅ Active</p>
            </div>
            <div>
              <p><strong>Location Tracking:</strong> {locationUpdateInterval ? '✅ Active' : '❌ Inactive'}</p>
              <p><strong>GPS Accuracy:</strong> High</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard; 