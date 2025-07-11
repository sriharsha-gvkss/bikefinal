# 🚲 Bike Taxi Service - Complete Setup Guide

This guide will help you set up and run the complete Bike Taxi Service with all 5 projects.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Java 17** (JDK) - [Download here](https://adoptium.net/)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Python 3.7+** (for frontend servers)
- **Git** (for cloning the repository)

### Verify Installation
```bash
# Check Java version
java -version

# Check Docker
docker --version

# Check Python
python --version

# Check Git
git --version
```

## 🚀 Quick Start (Windows)

### Option 1: Automated Setup (Recommended)
1. **Double-click** `start.bat` to start all services automatically
2. Wait for all services to start (about 2-3 minutes)
3. Open your browser and go to:
   - **Rider UI**: http://localhost:5500
   - **Driver Simulator**: http://localhost:5600

### Option 2: Manual Setup
Follow the step-by-step instructions below.

## 🔧 Manual Setup Instructions

### Step 1: Start Infrastructure Services

```bash
# Start PostgreSQL
docker-compose up -d

# Start Kafka & Zookeeper
docker-compose -f kafka/docker-compose-kafka.yml up -d
```

### Step 2: Build Spring Boot Applications

```bash
# Build Booking Service
cd booking-service
mvnw.cmd clean package -DskipTests
cd ..

# Build Driver Matching Service
cd driver-matching-service
mvnw.cmd clean package -DskipTests
cd ..
```

### Step 3: Start Backend Services

```bash
# Start Booking Service (Terminal 1)
cd booking-service
mvnw.cmd spring-boot:run

# Start Driver Matching Service (Terminal 2)
cd driver-matching-service
mvnw.cmd spring-boot:run
```

### Step 4: Start Frontend Services

```bash
# Start Rider UI (Terminal 3)
cd map-client
python -m http.server 5500

# Start Driver Simulator (Terminal 4)
cd driver-simulator
python -m http.server 5600
```

## 🧪 Testing the System

### 1. Open the Applications
- **Rider UI**: http://localhost:5500
- **Driver Simulator**: http://localhost:5600

### 2. Start Driver Simulation
1. In the Driver Simulator tab, click **"Start Simulator"**
2. You should see the status change to "Online"
3. The simulator will start sending location updates every 3 seconds

### 3. Book a Ride
1. In the Rider UI tab, you'll see a Google Map
2. **Click once** on the map to set pickup location (green "P" marker)
3. **Click again** to set destination (blue "D" marker)
4. Click **"Book Ride"** button
5. Watch the real-time driver locations appear on the map!

## 📊 Service Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Rider UI      │    │  Driver Simulator│    │  Booking Service│
│  (Port 5500)    │    │   (Port 5600)    │    │   (Port 8080)   │
└─────────┬───────┘    └──────────┬───────┘    └─────────┬───────┘
          │                       │                      │
          │                       │                      │
          │                       │                      ▼
          │                       │              ┌─────────────────┐
          │                       │              │   PostgreSQL    │
          │                       │              │   (Port 5432)   │
          │                       │              └─────────┬───────┘
          │                       │                        │
          │                       │                        ▼
          │                       │              ┌─────────────────┐
          │                       │              │      Kafka      │
          │                       │              │   (Port 9092)   │
          │                       │              └─────────┬───────┘
          │                       │                        │
          │                       │                        ▼
          │                       │              ┌─────────────────┐
          │                       │              │ Matching Service│
          │                       │              │   (Port 8081)   │
          │                       │              └─────────────────┘
          │                       │
          └───────────────────────┼──────────────────────┘
                                  │
                                  ▼
                          ┌─────────────────┐
                          │   WebSocket     │
                          │ Real-time comm  │
                          └─────────────────┘
```

## 🔍 API Endpoints

### Booking Service (Port 8080)
- `POST /booking` - Create new booking
- `GET /booking` - Get all bookings
- `GET /booking/{id}` - Get booking by ID
- `GET /booking/rider/{riderId}` - Get bookings by rider
- `PUT /booking/{id}/status` - Update booking status
- `PUT /booking/{id}/assign` - Assign driver to booking

### Matching Service (Port 8081)
- `GET /match/nearest?lat=x&lng=y` - Find nearest driver
- `GET /match/nearby?lat=x&lng=y&maxDistance=10` - Find nearby drivers
- `GET /match/drivers` - Get all drivers
- `POST /match/driver-location` - Update driver location

### WebSocket Endpoints
- `ws://localhost:8080/ws/driver-location` - Real-time driver locations

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
netstat -ano | findstr :8080

# Kill the process
taskkill /PID <process_id> /F
```

#### 2. Docker Not Running
- Start Docker Desktop
- Wait for it to fully load
- Try running the commands again

#### 3. Java Not Found
- Ensure JAVA_HOME is set correctly
- Install Java 17 if not already installed
- Restart your terminal after installation

#### 4. Maven Build Fails
```bash
# Clean and rebuild
mvnw.cmd clean package -DskipTests

# Check Java version
java -version
```

#### 5. Services Not Starting
- Check if all required ports are free
- Ensure Docker containers are running
- Check log files for errors

### Log Files
- `booking-service.log` - Booking service logs
- `matching-service.log` - Matching service logs
- `rider-ui.log` - Rider UI server logs
- `driver-simulator.log` - Driver simulator logs

## 🛑 Stopping Services

### Option 1: Automated Stop
```bash
# Double-click stop.bat or run:
stop.bat
```

### Option 2: Manual Stop
```bash
# Stop Docker containers
docker-compose down
docker-compose -f kafka/docker-compose-kafka.yml down

# Stop Java processes
taskkill /f /im java.exe

# Stop Python servers
taskkill /f /im python.exe
```

## 🔧 Configuration

### Environment Variables
You can customize the configuration by setting environment variables:

```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/biketaxi
SPRING_DATASOURCE_USERNAME=user
SPRING_DATASOURCE_PASSWORD=pass

# Kafka
SPRING_KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Server Ports
SERVER_PORT=8080  # Booking Service
SERVER_PORT=8081  # Matching Service
```

### Google Maps API Key
To use real Google Maps functionality:
1. Get an API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Replace `YOUR_API_KEY` in `map-client/index.html`

## 📈 Monitoring

### Health Checks
- **Booking Service**: http://localhost:8080/actuator/health
- **Matching Service**: http://localhost:8081/actuator/health

### Database
- **PostgreSQL**: Connect to localhost:5432
- **Database**: biketaxi
- **Username**: user
- **Password**: pass

### Kafka
- **Broker**: localhost:9092
- **Topic**: booking-events

## 🚀 Production Deployment

For production deployment, consider:
- Using Docker Compose for all services
- Setting up proper monitoring and logging
- Implementing authentication and authorization
- Using a production database (AWS RDS, etc.)
- Setting up CI/CD pipelines
- Implementing proper error handling and retry mechanisms

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the log files
3. Ensure all prerequisites are met
4. Try restarting the services

## 🎉 Congratulations!

You now have a fully functional Bike Taxi Service running with:
- ✅ Real-time driver location tracking
- ✅ Geohash-based driver matching
- ✅ Kafka event-driven architecture
- ✅ WebSocket live updates
- ✅ Google Maps integration
- ✅ Microservices design

Happy coding! 🚲✨ 