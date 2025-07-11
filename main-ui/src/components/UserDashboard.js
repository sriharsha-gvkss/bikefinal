import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Header from './Header';
import GoogleMapComponent from './GoogleMapComponent';
import LiveTrackingMap from './LiveTrackingMap';

const API_BASE = '/api';

const UserDashboard = () => {
  const { auth } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState({ pickup: '', destination: '' });
  const [baseEstimate, setBaseEstimate] = useState(null);
  const [selectedVehicleType, setSelectedVehicleType] = useState('BIKE_1_SEATER');
  const [pricingInfo, setPricingInfo] = useState({});
  const [isBookingRide, setIsBookingRide] = useState(false);
  const [bookingStatus, setBookingStatus] = useState('');
  const [currentBooking, setCurrentBooking] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [rideNotifications, setRideNotifications] = useState([]);
  const [showLiveTracking, setShowLiveTracking] = useState(false);
  const [websocket, setWebsocket] = useState(null);

  useEffect(() => {
    fetchUserBookings();
    fetchPricingInfo();
  }, []);

  // Continuous polling for active booking status updates
  useEffect(() => {
    let statusPollInterval;
    
    if (currentBooking && currentBooking.id) {
      statusPollInterval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE}/bookings/${currentBooking.id}`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const booking = await response.json();
            if (booking.status !== currentBooking.status) {
              console.log('Booking status changed from', currentBooking.status, 'to', booking.status);
              setCurrentBooking(booking);
              
              // Update booking status message based on new status
              if (booking.status === 'PICKUP') {
                setBookingStatus('🚗 Driver has arrived at pickup location! Click "Start Ride" to confirm.');
              } else if (booking.status === 'RIDER_CONFIRMED') {
                setBookingStatus('✅ Pickup confirmed! Driver will start the trip.');
              } else if (booking.status === 'IN_TRANSIT') {
                setBookingStatus('🚀 Trip in progress! Heading to destination.');
              } else if (booking.status === 'COMPLETED') {
                setBookingStatus('✅ Ride completed!');
                setCurrentBooking(null);
                fetchUserBookings();
              } else if (booking.status === 'CANCELLED') {
                setBookingStatus('❌ Ride was cancelled.');
                setCurrentBooking(null);
                fetchUserBookings();
              }
            }
          }
        } catch (err) {
          console.error('Error polling booking status:', err);
        }
      }, 3000); // Poll every 3 seconds
    }
    
    return () => {
      if (statusPollInterval) {
        clearInterval(statusPollInterval);
      }
    };
  }, [currentBooking?.id, auth.token]);

  // Fetch pricing information
  const fetchPricingInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/bookings/pricing`);
      if (response.ok) {
        const data = await response.json();
        setPricingInfo(data);
      }
    } catch (err) {
      console.error('Error fetching pricing info:', err);
    }
  };

  // Calculate price when locations change
  useEffect(() => {
    if (locations.pickup && locations.destination) {
      calculatePrice();
    } else {
      setBaseEstimate(null);
    }
  }, [locations.pickup, locations.destination]);

  const formatLocation = (loc) => {
    if (!loc) return "";
    
    // If it's already a coordinate object with lat/lng, format it first
    if (typeof loc === "object" && loc.lat !== undefined && loc.lng !== undefined) {
      return `${loc.lat},${loc.lng}`;
    }
    
    if (typeof loc === "string") {
      // If it's already a coordinate string, return as is
      if (loc.includes(',') && !isNaN(parseFloat(loc.split(',')[0]))) {
        return loc;
      }
      // For address strings, return coordinates that match the backend geocoding
      // In a real app, you would geocode the address here
      if (loc.toLowerCase().includes('uppal')) {
        return "17.4058,78.5597"; // Uppal coordinates (matches backend)
      } else if (loc.toLowerCase().includes('l. b. nagar') || loc.toLowerCase().includes('lb nagar')) {
        return "17.3676,78.5577"; // L.B. Nagar coordinates (matches backend)
      } else if (loc.toLowerCase().includes('secunderabad')) {
        return "17.4399,78.4983"; // Secunderabad coordinates (matches backend)
      } else if (loc.toLowerCase().includes('hitech city') || loc.toLowerCase().includes('hitech')) {
        return "17.4454,78.3772"; // Hitech City coordinates (matches backend)
      } else if (loc.toLowerCase().includes('banjara hills')) {
        return "17.4065,78.4772"; // Banjara Hills coordinates (matches backend)
      } else if (loc.toLowerCase().includes('jubilee hills')) {
        return "17.4229,78.4078"; // Jubilee Hills coordinates (matches backend)
      } else if (loc.toLowerCase().includes('gachibowli')) {
        return "17.4401,78.3489"; // Gachibowli coordinates (matches backend)
      } else if (loc.toLowerCase().includes('kukatpally')) {
        return "17.4849,78.4138"; // Kukatpally coordinates (matches backend)
      } else if (loc.toLowerCase().includes('dilsukhnagar')) {
        return "17.3713,78.5264"; // Dilsukhnagar coordinates (matches backend)
      } else if (loc.toLowerCase().includes('malakpet')) {
        return "17.3841,78.4864"; // Malakpet coordinates (matches backend)
      } else if (loc.toLowerCase().includes('abids')) {
        return "17.3850,78.4867"; // Abids coordinates (matches backend)
      } else {
        return "17.3850,78.4867"; // Default to Hyderabad center (matches backend)
      }
    }
    
    return "";
  };

  const calculatePrice = async () => {
    try {
      console.log('calculatePrice called with locations:', locations);
      const pickupLocation = formatLocation(locations.pickup);
      const destination = formatLocation(locations.destination);
      console.log('Formatted locations - pickup:', pickupLocation, 'destination:', destination);
      
      let googleMapsData = null;
      try {
        googleMapsData = await calculateRouteWithGoogleMaps(pickupLocation, destination);
        console.log('Google Maps calculation successful:', googleMapsData);
      } catch (error) {
        console.log('Google Maps calculation failed, using backend calculation:', error);
      }
      if (googleMapsData) {
        setBaseEstimate(googleMapsData);
      } else {
        // fallback: use backend calculation (simulate minimal info)
        setBaseEstimate({
          distance: 1,
          duration: 10,
          trafficLevel: 'unknown',
          trafficRatio: 1,
          routePolyline: null
        });
      }
    } catch (err) {
      console.error('Error calculating price:', err);
    }
  };

  const getSelectedVehiclePrice = () => {
    if (!baseEstimate) return 0;
    
    const distance = baseEstimate.distance;
    const duration = baseEstimate.duration || calculateTimeForVehicle(distance, selectedVehicleType);
    const trafficLevel = baseEstimate.trafficLevel;
    
    // Calculate base fare + distance fare + time fare
    let price = 0;
    switch (selectedVehicleType) {
      case 'BIKE_1_SEATER':
        price = 20 + (distance * 5.5) + (duration * 0.5); // ₹20 base + ₹5.5/km + ₹0.5/min
        break;
      case 'AUTO_3_SEATER':
        price = 35 + (distance * 11) + (duration * 0.8); // ₹35 base + ₹11/km + ₹0.8/min
        break;
      case 'CAR_4_SEATER':
        price = 65 + (distance * 14) + (duration * 1.2); // ₹65 base + ₹14/km + ₹1.2/min
        break;
      case 'XUV_7_SEATER':
        price = 90 + (distance * 17.5) + (duration * 1.5); // ₹90 base + ₹17.5/km + ₹1.5/min
        break;
      default:
        price = 20 + (distance * 5.5) + (duration * 0.5);
    }
    
    // Apply traffic-based pricing adjustments
    if (trafficLevel && trafficLevel !== 'unknown') {
      const trafficMultipliers = {
        'light': 1.0,      // No additional charge for light traffic
        'moderate': 1.05,  // 5% additional for moderate traffic
        'heavy': 1.1       // 10% additional for heavy traffic
      };
      price *= trafficMultipliers[trafficLevel] || 1.0;
    }
    
    // Ensure minimum fare based on vehicle type
    const minFares = {
      'BIKE_1_SEATER': 25,
      'AUTO_3_SEATER': 45,
      'CAR_4_SEATER': 80,
      'XUV_7_SEATER': 110
    };
    
    const minFare = minFares[selectedVehicleType] || 25;
    return Math.round(Math.max(minFare, price));
  };

  const calculateTimeForVehicle = (distance, vehicleType) => {
    // Vehicle speeds in km/h (different speeds for different vehicle types)
    // These speeds account for traffic conditions in Hyderabad
    const speeds = {
      'BIKE_1_SEATER': 28,    // Bike can navigate traffic better
      'AUTO_3_SEATER': 22,    // Auto is slower due to traffic
      'CAR_4_SEATER': 25,     // Car baseline speed in city traffic
      'XUV_7_SEATER': 23      // XUV is slightly slower due to size
    };
    
    const speed = speeds[vehicleType] || 25; // Default to 25 km/h
    const timeInHours = distance / speed;
    const timeInMinutes = Math.round(timeInHours * 60);
    
    // Ensure minimum time of 3 minutes for very short distances
    return Math.max(3, timeInMinutes);
  };

  // Function to calculate route using Google Maps Directions API with traffic awareness
  const calculateRouteWithGoogleMaps = async (pickup, destination) => {
    if (!window.google || !window.google.maps) {
      console.warn('Google Maps not loaded');
      return null;
    }

    console.log('calculateRouteWithGoogleMaps called with:', { pickup, destination });

    try {
      const directionsService = new window.google.maps.DirectionsService();
      
      // Get current time for traffic-aware routing
      const now = new Date();
      const departureTime = new Date(now.getTime() + (5 * 60 * 1000)); // Depart in 5 minutes
      
      const request = {
        origin: pickup,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC,
        drivingOptions: {
          departureTime: departureTime,
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS
        }
      };
      
      console.log('Google Maps request:', request);

      return new Promise((resolve, reject) => {
        directionsService.route(request, (result, status) => {
          if (status === 'OK') {
            const route = result.routes[0];
            const leg = route.legs[0];
            
            // Get traffic-aware distance and duration
            const distance = leg.distance.value / 1000; // Convert to km
            const trafficDuration = leg.duration_in_traffic ? leg.duration_in_traffic.value / 60 : leg.duration.value / 60; // Use traffic duration if available
            const baseDuration = leg.duration.value / 60; // Base duration without traffic
            
            // For same location or very short distances, use a more realistic minimum
            let finalDistance = distance;
            if (distance < 0.5) {
              finalDistance = 0.5; // Minimum 0.5 km for any ride
            }
            
            // Calculate vehicle-specific duration based on traffic conditions and vehicle type
            const vehicleTrafficMultipliers = {
              'BIKE_1_SEATER': {
                light: 0.7,    // Bike is 30% faster in light traffic
                moderate: 0.8, // Bike is 20% faster in moderate traffic
                heavy: 0.9     // Bike is 10% faster in heavy traffic
              },
              'AUTO_3_SEATER': {
                light: 1.1,    // Auto is 10% slower in light traffic
                moderate: 1.2, // Auto is 20% slower in moderate traffic
                heavy: 1.3     // Auto is 30% slower in heavy traffic
              },
              'CAR_4_SEATER': {
                light: 1.0,    // Car is baseline
                moderate: 1.0, // Car is baseline
                heavy: 1.0     // Car is baseline
              },
              'XUV_7_SEATER': {
                light: 1.05,   // XUV is 5% slower in light traffic
                moderate: 1.1, // XUV is 10% slower in moderate traffic
                heavy: 1.15    // XUV is 15% slower in heavy traffic
              }
            };
            
            // Determine traffic level based on duration difference
            const trafficRatio = trafficDuration / baseDuration;
            let trafficLevel = 'light';
            if (trafficRatio > 1.5) {
              trafficLevel = 'heavy';
            } else if (trafficRatio > 1.2) {
              trafficLevel = 'moderate';
            }
            
            const vehicleMultipliers = vehicleTrafficMultipliers[selectedVehicleType] || vehicleTrafficMultipliers['CAR_4_SEATER'];
            const trafficMultiplier = vehicleMultipliers[trafficLevel];
            const adjustedDuration = Math.max(3, trafficDuration * trafficMultiplier);
            
            // Get route summary for better logging
            const routeSummary = {
              distance: finalDistance,
              duration: Math.round(adjustedDuration),
              trafficLevel: trafficLevel,
              trafficRatio: trafficRatio.toFixed(2),
              baseDuration: Math.round(baseDuration),
              trafficDuration: Math.round(trafficDuration),
              vehicleType: selectedVehicleType,
              trafficMultiplier: trafficMultiplier,
              routeSteps: route.legs[0].steps?.length || 0,
              routePolyline: route.overview_polyline?.points ? 'Available' : 'Not available'
            };
            
            console.log('Google Maps traffic-aware route data:', routeSummary);
            
            resolve({
              distance: finalDistance,
              duration: Math.round(adjustedDuration),
              trafficLevel: trafficLevel,
              trafficRatio: trafficRatio,
              routePolyline: route.overview_polyline?.points
            });
          } else {
            console.error('Directions request failed due to ' + status);
            reject(new Error('Failed to calculate route'));
          }
        });
      });
    } catch (error) {
      console.error('Error calculating route:', error);
      return null;
    }
  };

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (currentBooking && currentBooking.status === 'IN_PROGRESS') {
      // Connect to backend WebSocket server
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${wsProtocol}//localhost:8080/ws/rider-notifications`);
      
      ws.onopen = () => {
        console.log('Connected to rider notifications WebSocket');
        setWebsocket(ws);
        ws.send(JSON.stringify({ 
          type: 'SUBSCRIBE', 
          bookingId: currentBooking.id,
          riderId: auth.username 
        }));
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Rider notification received:', data);
        
        if (data.type === 'DRIVER_LOCATION') {
          setDriverLocation({ lat: data.lat, lng: data.lng });
        } else if (data.type === 'RIDE_STATUS_UPDATE') {
          setCurrentBooking(prev => ({ ...prev, status: data.status }));
          addNotification(data.message);
        } else if (data.type === 'DRIVER_ARRIVED') {
          addNotification('🚗 Driver has arrived at pickup location!');
          // Update the current booking status to PICKUP to show the Start Ride button
          setCurrentBooking(prev => prev ? { ...prev, status: 'PICKUP' } : null);
          setBookingStatus('🚗 Driver has arrived at pickup location! Click "Start Ride" to confirm.');
          console.log('✅ DRIVER_ARRIVED notification received, updated booking status to PICKUP');
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWebsocket(null);
        // WebSocket errors are expected in development - backend handles real-time updates via polling
        console.log('Note: WebSocket connection failed, but real-time updates will work via polling');
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setWebsocket(null);
      };
      
      return () => {
        if (ws) {
          ws.close();
          setWebsocket(null);
        }
      };
    } else {
      // Close WebSocket if no active booking
      if (websocket) {
        websocket.close();
        setWebsocket(null);
      }
    }
  }, [currentBooking, auth.username]);

  const addNotification = (message) => {
    const newNotification = {
      id: Date.now(),
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setRideNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep last 5 notifications
  };

  const handleDriverLocationUpdate = (newLocation) => {
    setDriverLocation(newLocation);
    console.log('🚗 Driver location updated:', newLocation);
  };

  const fetchUserBookings = async () => {
    try {
      const response = await fetch(`${API_BASE}/bookings/user`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
        
        // Check for active booking
        const activeBooking = data.find(booking => 
          ['PENDING', 'ASSIGNED', 'PICKUP', 'RIDER_CONFIRMED', 'IN_TRANSIT'].includes(booking.status)
        );
        if (activeBooking) {
          setCurrentBooking(activeBooking);
          setBookingStatus(`Current booking status: ${activeBooking.status}`);
        }
      } else {
        setError('Failed to fetch bookings');
      }
    } catch (err) {
      setError('Error fetching bookings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const bookRide = async () => {
    if (!locations.pickup || !locations.destination) {
      setError('Please enter both pickup and destination locations');
      return;
    }
    
    setIsBookingRide(true);
    setError('');
    
    try {
      const pickupLocation = formatLocation(locations.pickup);
      const destination = formatLocation(locations.destination);
      
      const response = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pickupLocation,
          destination,
          vehicleType: selectedVehicleType,
          estimatedPrice: getSelectedVehiclePrice()
        })
      });
      
      if (response.ok) {
        const booking = await response.json();
        setCurrentBooking(booking);
        setBookingStatus('🚗 Booking created! Looking for a driver...');
        addNotification('Ride booked successfully!');
        
        // Clear form
        setLocations({ pickup: '', destination: '' });
        setBaseEstimate(null);
        
        // Start polling for status updates
        pollBookingStatus(booking.id);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to book ride');
      }
    } catch (err) {
      setError('Error booking ride: ' + err.message);
    } finally {
      setIsBookingRide(false);
    }
  };

  const pollBookingStatus = async (bookingId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/bookings/${bookingId}`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const booking = await response.json();
          setCurrentBooking(booking);
          
          if (booking.status === 'ASSIGNED') {
            setBookingStatus('✅ Driver assigned! Driver is on the way.');
            addNotification('Driver assigned to your ride!');
          } else if (booking.status === 'PICKUP') {
            setBookingStatus('🚗 Driver has arrived at pickup location! Click "Start Ride" to confirm.');
            addNotification('Driver has arrived at pickup location!');
          } else if (booking.status === 'RIDER_CONFIRMED') {
            setBookingStatus('✅ Pickup confirmed! Driver will start the trip.');
            addNotification('Ride started!');
          } else if (booking.status === 'IN_TRANSIT') {
            setBookingStatus('🚀 Trip in progress! Heading to destination.');
            addNotification('Trip in progress!');
          } else if (booking.status === 'COMPLETED') {
            setBookingStatus('✅ Ride completed!');
            addNotification('Ride completed successfully!');
            setCurrentBooking(null);
            clearInterval(pollInterval);
            fetchUserBookings();
          } else if (booking.status === 'CANCELLED') {
            setBookingStatus('❌ Ride was cancelled.');
            addNotification('Ride was cancelled.');
            setCurrentBooking(null);
            clearInterval(pollInterval);
            fetchUserBookings();
          }
        }
      } catch (err) {
        console.error('Error polling booking status:', err);
      }
    }, 3000); // Poll every 3 seconds
    
    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 600000);
  };

  const cancelBooking = async () => {
    if (!currentBooking) return;
    
    try {
      const response = await fetch(`${API_BASE}/bookings/${currentBooking.id}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setBookingStatus('❌ Ride cancelled successfully.');
        setCurrentBooking(null);
        addNotification('Ride cancelled successfully.');
        fetchUserBookings();
      } else {
        setError('Failed to cancel booking');
      }
    } catch (err) {
      setError('Error cancelling booking: ' + err.message);
    }
  };

  const confirmPickup = async () => {
    if (!currentBooking) return;
    
    try {
      const response = await fetch(`${API_BASE}/bookings/${currentBooking.id}/confirm-pickup`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setBookingStatus('✅ Pickup confirmed! Driver will start the trip.');
        addNotification('Pickup confirmed!');
      } else {
        setError('Failed to confirm pickup');
      }
    } catch (err) {
      setError('Error confirming pickup: ' + err.message);
    }
  };

  const formatDistance = (distance) => {
    return `${distance.toFixed(1)} km`;
  };

  const getVehicleTrafficMultiplier = (vehicleType, trafficLevel) => {
    const baseMultipliers = {
      'BIKE_1_SEATER': 1.0,
      'AUTO_3_SEATER': 1.1,
      'CAR_4_SEATER': 1.2,
      'XUV_7_SEATER': 1.3
    };
    
    const trafficMultipliers = {
      'low': 1.0,
      'medium': 1.2,
      'high': 1.5,
      'unknown': 1.1
    };
    
    return baseMultipliers[vehicleType] * trafficMultipliers[trafficLevel];
  };

  const getVehicleDuration = (baseDuration, vehicleType, trafficLevel) => {
    const vehicleMultipliers = {
      'BIKE_1_SEATER': 0.9,
      'AUTO_3_SEATER': 1.1,
      'CAR_4_SEATER': 1.2,
      'XUV_7_SEATER': 1.3
    };
    
    const trafficMultipliers = {
      'low': 1.0,
      'medium': 1.2,
      'high': 1.5,
      'unknown': 1.1
    };
    
    return Math.round(baseDuration * vehicleMultipliers[vehicleType] * trafficMultipliers[trafficLevel]);
  };

  const getVehiclePrice = (distance, duration, vehicleType, trafficLevel) => {
    const baseFares = {
      'BIKE_1_SEATER': 20,
      'AUTO_3_SEATER': 35,
      'CAR_4_SEATER': 65,
      'XUV_7_SEATER': 90
    };
    
    const distanceRates = {
      'BIKE_1_SEATER': 5.5,
      'AUTO_3_SEATER': 11,
      'CAR_4_SEATER': 14,
      'XUV_7_SEATER': 17.5
    };
    
    const timeRates = {
      'BIKE_1_SEATER': 0.5,
      'AUTO_3_SEATER': 0.8,
      'CAR_4_SEATER': 1.2,
      'XUV_7_SEATER': 1.5
    };
    
    const basePrice = baseFares[vehicleType] + (distance * distanceRates[vehicleType]) + (duration * timeRates[vehicleType]);
    const trafficMultiplier = getVehicleTrafficMultiplier(vehicleType, trafficLevel);
    
    return Math.round(basePrice * trafficMultiplier);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Header />
        <div className="dashboard-content">
          <div className="loading">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header />
      <div className="dashboard-content">
        <h2>Welcome to Bike Ride App</h2>
        
        {error && <div className="error">{error}</div>}
        
        {/* Current Booking Status */}
        {currentBooking && (
          <div className="card">
            <h3>Current Ride Status</h3>
            <p><strong>Booking ID:</strong> {currentBooking.id}</p>
            <p><strong>Status:</strong> {currentBooking.status}</p>
            <p><strong>Vehicle Type:</strong> {currentBooking.vehicleType}</p>
            <p><strong>Estimated Price:</strong> ₹{currentBooking.estimatedPrice}</p>
            
            {bookingStatus && (
              <div className="success">
                {bookingStatus}
              </div>
            )}
            
            <div className="btn-group">
              {currentBooking.status === 'PICKUP' && (
                <button onClick={confirmPickup} className="btn btn-primary">
                  Start Ride
                </button>
              )}
              {['PENDING', 'ASSIGNED'].includes(currentBooking.status) && (
                <button onClick={cancelBooking} className="btn btn-danger">
                  Cancel Ride
                </button>
              )}
              {currentBooking.status === 'ASSIGNED' && (
                <button onClick={() => setShowLiveTracking(true)} className="btn btn-secondary">
                  Track Driver
                </button>
              )}
            </div>
          </div>
        )}

        {/* Live Tracking */}
        {showLiveTracking && currentBooking && (
          <div className="card">
            <h3>Live Driver Tracking</h3>
            <LiveTrackingMap 
              bookingId={currentBooking.id}
              onLocationUpdate={handleDriverLocationUpdate}
            />
            <button onClick={() => setShowLiveTracking(false)} className="btn btn-outline">
              Close Tracking
            </button>
          </div>
        )}

        {/* Book New Ride */}
        {!currentBooking && (
          <div className="card">
            <h3>Book a Ride</h3>
            
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Pickup Location</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter pickup location"
                  value={locations.pickup}
                  onChange={(e) => setLocations({...locations, pickup: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Destination</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter destination"
                  value={locations.destination}
                  onChange={(e) => setLocations({...locations, destination: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Type</label>
              <select
                className="form-input"
                value={selectedVehicleType}
                onChange={(e) => setSelectedVehicleType(e.target.value)}
              >
                <option value="BIKE_1_SEATER">Bike (1 Seater) - ₹20 base</option>
                <option value="AUTO_3_SEATER">Auto (3 Seater) - ₹35 base</option>
                <option value="CAR_4_SEATER">Car (4 Seater) - ₹65 base</option>
                <option value="XUV_7_SEATER">XUV (7 Seater) - ₹90 base</option>
              </select>
            </div>

            {/* Price Estimate */}
            {baseEstimate && (
              <div className="card" style={{ background: 'var(--background-light)' }}>
                <h4>Price Estimate</h4>
                <div className="grid grid-2">
                  <div>
                    <p><strong>Distance:</strong> {formatDistance(baseEstimate.distance)}</p>
                    <p><strong>Duration:</strong> {baseEstimate.duration} minutes</p>
                    <p><strong>Traffic:</strong> {baseEstimate.trafficLevel}</p>
                  </div>
                  <div>
                    <p><strong>Estimated Price:</strong></p>
                    <h3 style={{ color: 'var(--primary-color)', margin: 0 }}>₹{getSelectedVehiclePrice()}</h3>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={bookRide} 
              disabled={isBookingRide || !locations.pickup || !locations.destination}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {isBookingRide ? 'Booking...' : 'Book Ride'}
            </button>
          </div>
        )}

        {/* Ride History */}
        <div className="card">
          <h3>Ride History</h3>
          {bookings.length === 0 ? (
            <p>No ride history found.</p>
          ) : (
            <div className="table-container">
              <table className="table table-responsive">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Pickup</th>
                    <th>Destination</th>
                    <th>Vehicle Type</th>
                    <th>Status</th>
                    <th>Price</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td data-label="Booking ID">{booking.id}</td>
                      <td data-label="Pickup">{booking.pickupLocation}</td>
                      <td data-label="Destination">{booking.destination}</td>
                      <td data-label="Vehicle Type">{booking.vehicleType}</td>
                      <td data-label="Status">{booking.status}</td>
                      <td data-label="Price">₹{booking.estimatedPrice}</td>
                      <td data-label="Date">{new Date(booking.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notifications */}
        {rideNotifications.length > 0 && (
          <div className="notification">
            {rideNotifications.map(notification => (
              <div key={notification.id} className="success">
                {notification.message}
                <small> - {notification.timestamp}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard; 