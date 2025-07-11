@echo off
echo Cleaning and rebuilding Booking Service...
cd booking-service

echo Cleaning target directory...
if exist target rmdir /s /q target

echo Building with Maven...
call mvnw.cmd clean compile -DskipTests

if errorlevel 1 (
    echo Build failed
    pause
    exit /b 1
)

echo Build successful!
echo Starting the service...
call mvnw.cmd spring-boot:run
pause 