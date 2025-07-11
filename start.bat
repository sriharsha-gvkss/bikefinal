@echo off
echo 🚲 Starting Bike Taxi Service...
echo ==================================

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

echo ✅ Docker is running

REM Build Spring Boot applications
echo 🔨 Building Spring Boot applications...

REM Build Booking Service
echo Building Booking Service...
cd booking-service
call mvnw.cmd clean package -DskipTests
if errorlevel 1 (
    echo ❌ Failed to build Booking Service
    pause
    exit /b 1
)
cd ..

echo ✅ All applications built successfully

REM Start infrastructure services
echo 🐳 Starting infrastructure services...
docker-compose -f docker-compose.yml up -d
docker-compose -f kafka/docker-compose-kafka.yml up -d

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Start Spring Boot services
echo 🚀 Starting Spring Boot services...

REM Start Booking Service
echo Starting Booking Service on port 8080...
cd booking-service
start "Booking Service" mvnw.cmd spring-boot:run
cd ..

REM Wait for services to start
echo ⏳ Waiting for services to start...
timeout /t 15 /nobreak >nul

REM Start frontend services
echo 🌐 Starting frontend services...

REM Start Rider UI
echo Starting Rider UI on port 5500...
cd map-client
start "Rider UI" python -m http.server 5500
cd ..

REM Start Driver Simulator
echo Starting Driver Simulator on port 5600...
cd driver-simulator
start "Driver Simulator" python -m http.server 5600
cd ..

echo.
echo 🎉 Bike Taxi Service is now running!
echo ==================================
echo 📊 Services Status:
echo   • PostgreSQL:     http://localhost:5432
echo   • Kafka:          localhost:9092
echo   • Booking Service: http://localhost:8080 (includes matching)
echo   • Rider UI:       http://localhost:5500
echo   • Driver Simulator: http://localhost:5600
echo.
echo 📋 Next Steps:
echo   1. Open http://localhost:5500 in your browser (Rider UI)
echo   2. Open http://localhost:5600 in another tab (Driver Simulator)
echo   3. Click 'Start Simulator' in the Driver Simulator
echo   4. Set pickup and destination points on the map
echo   5. Click 'Book Ride' to test the system
echo.
echo 🛑 To stop all services, run: stop.bat
echo.
echo Happy testing! 🚲✨
pause 