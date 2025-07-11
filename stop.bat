@echo off
echo 🛑 Stopping Bike Taxi Service...
echo ==================================

REM Stop Docker containers
echo 🐳 Stopping Docker containers...
docker-compose -f docker-compose.yml down
docker-compose -f kafka/docker-compose-kafka.yml down

REM Kill Java processes (Spring Boot applications)
echo 🔄 Stopping Spring Boot services...
taskkill /f /im java.exe >nul 2>&1

REM Kill Python processes (frontend servers)
echo 🌐 Stopping frontend services...
taskkill /f /im python.exe >nul 2>&1

echo.
echo ✅ All services stopped successfully!
echo ==================================
echo 📊 Services stopped:
echo   • PostgreSQL
echo   • Kafka & Zookeeper
echo   • Booking Service
echo   • Driver Matching Service
echo   • Rider UI
echo   • Driver Simulator
echo.
echo 🚀 To start again, run: start.bat
pause 