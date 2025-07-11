import config from '../config';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.driverId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.locationUpdateCallback = null;
    this.bookingNotificationCallback = null;
  }

  async connect(driverId) {
    return new Promise((resolve, reject) => {
      try {
        this.driverId = driverId;
        
        // Create WebSocket connection using config
        const wsUrl = config.bookingServiceWsUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        this.socket = new WebSocket(`${wsUrl}/ws/driver/${driverId}`);
        
        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Send driver registration
          this.sendMessage({
            type: 'DRIVER_REGISTER',
            driverId: driverId,
            timestamp: new Date().toISOString()
          });
          
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        this.socket.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          
          // Attempt to reconnect if not manually closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('Failed to connect to WebSocket server'));
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'Manual disconnect');
      this.socket = null;
    }
    this.isConnected = false;
    this.driverId = null;
  }

  sendMessage(message) {
    if (this.socket && this.isConnected) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  sendLocation(location) {
    this.sendMessage({
      type: 'DRIVER_LOCATION',
      driverId: this.driverId,
      location: {
        latitude: location.lat,
        longitude: location.lng,
        timestamp: new Date().toISOString()
      }
    });
  }

  sendStatus(status) {
    this.sendMessage({
      type: 'DRIVER_STATUS',
      driverId: this.driverId,
      status: status, // 'AVAILABLE', 'BUSY', 'OFFLINE'
      timestamp: new Date().toISOString()
    });
  }

  handleMessage(data) {
    console.log('Received message:', data);
    
    switch (data.type) {
      case 'LOCATION_UPDATE':
        if (this.locationUpdateCallback) {
          this.locationUpdateCallback(data.location);
        }
        break;
        
      case 'BOOKING_REQUEST':
        if (this.bookingNotificationCallback) {
          this.bookingNotificationCallback(data.booking);
        }
        break;
        
      case 'DRIVER_ASSIGNMENT':
        console.log('Driver assigned to booking:', data.booking);
        break;
        
      case 'SYSTEM_MESSAGE':
        console.log('System message:', data.message);
        break;
        
      case 'ERROR':
        console.error('Server error:', data.message);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  attemptReconnect() {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      if (this.driverId) {
        this.connect(this.driverId)
          .then(() => {
            console.log('Reconnected successfully');
          })
          .catch((error) => {
            console.error('Reconnection failed:', error);
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.attemptReconnect();
            }
          });
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  onLocationUpdate(callback) {
    this.locationUpdateCallback = callback;
  }

  onBookingNotification(callback) {
    this.bookingNotificationCallback = callback;
  }

  // Send booking acceptance/rejection
  respondToBooking(bookingId, accept) {
    this.sendMessage({
      type: 'BOOKING_RESPONSE',
      driverId: this.driverId,
      bookingId: bookingId,
      accepted: accept,
      timestamp: new Date().toISOString()
    });
  }

  // Send trip completion
  completeTrip(bookingId) {
    this.sendMessage({
      type: 'TRIP_COMPLETED',
      driverId: this.driverId,
      bookingId: bookingId,
      timestamp: new Date().toISOString()
    });
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      driverId: this.driverId,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

export default WebSocketService; 