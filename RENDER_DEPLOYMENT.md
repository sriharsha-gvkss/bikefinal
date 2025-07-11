# Render Deployment Guide

This guide will help you deploy your Bike Taxi application on Render.

## Prerequisites

1. A Render account
2. Your code pushed to a Git repository (GitHub, GitLab, etc.)
3. A Google Maps API key

## Deployment Strategy

You'll need to create multiple services on Render:

1. **PostgreSQL Database** (Managed Service)
2. **Booking Service** (Web Service)
3. **Driver Matching Service** (Web Service)
4. **Frontend** (Static Site or Web Service)

## Step 1: Create PostgreSQL Database

1. Go to your Render dashboard
2. Click "New" → "PostgreSQL"
3. Configure:
   - **Name**: `biketaxi-db`
   - **Database**: `biketaxi`
   - **User**: `biketaxi_user`
   - **Region**: Choose your preferred region
4. Click "Create Database"
5. Note down the connection details (you'll need these for environment variables)

## Step 2: Deploy Booking Service

1. Go to your Render dashboard
2. Click "New" → "Web Service"
3. Connect your Git repository
4. Configure:
   - **Name**: `biketaxi-booking-service`
   - **Root Directory**: `booking-service`
   - **Environment**: `Docker`
   - **Branch**: `main`
   - **Region**: Same as your database

### Environment Variables for Booking Service:
```
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://your-postgres-host:5432/biketaxi
SPRING_DATASOURCE_USERNAME=your_db_username
SPRING_DATASOURCE_PASSWORD=your_db_password
SPRING_KAFKA_BOOTSTRAP_SERVERS=your-kafka-host:9092
PORT=8080
```

## Step 3: Deploy Driver Matching Service

1. Go to your Render dashboard
2. Click "New" → "Web Service"
3. Connect your Git repository
4. Configure:
   - **Name**: `biketaxi-driver-matching-service`
   - **Root Directory**: `driver-matching-service`
   - **Environment**: `Docker`
   - **Branch**: `main`
   - **Region**: Same as your database

### Environment Variables for Driver Matching Service:
```
SPRING_PROFILES_ACTIVE=prod
SPRING_KAFKA_BOOTSTRAP_SERVERS=your-kafka-host:9092
PORT=8081
```

## Step 4: Deploy Frontend

1. Go to your Render dashboard
2. Click "New" → "Static Site" (or "Web Service" for Docker)
3. Connect your Git repository
4. Configure:
   - **Name**: `biketaxi-frontend`
   - **Root Directory**: `main-ui`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
   - **Branch**: `main`

### Environment Variables for Frontend:
```
REACT_APP_BOOKING_SERVICE_URL=https://your-booking-service-url.onrender.com
REACT_APP_DRIVER_MATCHING_SERVICE_URL=https://your-driver-matching-service-url.onrender.com
REACT_APP_BOOKING_SERVICE_WS_URL=wss://your-booking-service-url.onrender.com
REACT_APP_DRIVER_MATCHING_SERVICE_WS_URL=wss://your-driver-matching-service-url.onrender.com
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Step 5: Kafka Setup (Optional)

For production, you might want to use a managed Kafka service like:
- Confluent Cloud
- Amazon MSK
- Upstash Kafka

Or you can run Kafka on a separate Render service.

## Important Notes

1. **Free Tier Limitations**: 
   - Free services spin down after inactivity
   - Limited resources
   - No persistent storage

2. **Environment Variables**: 
   - Replace placeholder URLs with actual Render URLs
   - Use HTTPS for production
   - Keep API keys secure

3. **CORS Configuration**: 
   - Your backend services need to allow requests from your frontend domain
   - Update CORS configuration in your Spring Boot applications

4. **Database Migration**: 
   - The application will automatically create tables on first run
   - For production, consider using proper database migration tools

## Troubleshooting

1. **Build Failures**: Check the build logs in Render dashboard
2. **Connection Issues**: Verify environment variables and network connectivity
3. **CORS Errors**: Update CORS configuration in your backend services
4. **Database Connection**: Ensure database credentials are correct

## Security Considerations

1. Use strong passwords for database
2. Keep API keys secure
3. Enable HTTPS for all services
4. Consider using Render's environment variable encryption for sensitive data

## Cost Optimization

1. Start with free tier for development
2. Upgrade only when needed
3. Monitor usage and costs
4. Consider using static site hosting for frontend to reduce costs 