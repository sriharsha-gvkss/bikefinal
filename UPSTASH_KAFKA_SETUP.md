# Upstash Kafka Setup Guide for Render Deployment

This guide will help you set up Upstash Kafka (which includes Zookeeper) and connect it to your Render services.

## Prerequisites

1. An Upstash account (free tier available)
2. Your Render services deployed
3. Your application code ready

## Step 1: Set Up Upstash Kafka

### 1.1 Create Upstash Account

1. Go to [https://upstash.com/](https://upstash.com/)
2. Click "Sign Up" and create an account
3. Verify your email address

### 1.2 Create Kafka Database

1. **Go to Console** → **Kafka**
2. **Click "Create Database"**
3. **Configure your database:**
   - **Name**: `biketaxi-kafka`
   - **Region**: Choose a region close to your Render services
     - For Oregon (US West): `us-west-1`
     - For Virginia (US East): `us-east-1`
     - For Frankfurt (EU): `eu-west-1`
   - **Plan**: Select **Free** (10,000 messages/day)
   - **Multi-zone**: Leave unchecked for free tier
4. **Click "Create"**

### 1.3 Get Connection Details

After creation, go to the **REST API** tab and note down:

- **Kafka Bootstrap Server**: `kafka-abc123-def456.us-west-1.upstash.io:9092`
- **Username**: `your-actual-username`
- **Password**: `your-actual-password`

## Step 2: Deploy Your Services on Render

### 2.1 Deploy PostgreSQL Database

1. Go to Render Dashboard → "New" → "PostgreSQL"
2. Configure:
   - **Name**: `biketaxi-db`
   - **Database**: `biketaxi`
   - **User**: `biketaxi_user`
   - **Region**: Same as your Kafka
3. Click "Create Database"
4. Note down the connection details

### 2.2 Deploy Booking Service

1. Go to Render Dashboard → "New" → "Web Service"
2. Connect your repository: `sriharsha-gvkss/bikefinal`
3. Configure:
   - **Name**: `biketaxi-booking-service`
   - **Root Directory**: `booking-service`
   - **Environment**: `Docker`
   - **Branch**: `main`
   - **Region**: Same as your database

4. **Environment Variables**:
   ```
   SPRING_PROFILES_ACTIVE=prod
   SPRING_DATASOURCE_URL=jdbc:postgresql://your-postgres-host:5432/biketaxi
   SPRING_DATASOURCE_USERNAME=your_postgres_username
   SPRING_DATASOURCE_PASSWORD=your_postgres_password
   SPRING_KAFKA_BOOTSTRAP_SERVERS=your-upstash-kafka-url:9092
   SPRING_KAFKA_SECURITY_PROTOCOL=SASL_SSL
   SPRING_KAFKA_SASL_MECHANISM=PLAIN
   SPRING_KAFKA_SASL_JAAS_CONFIG=org.apache.kafka.common.security.plain.PlainLoginModule required username="your-upstash-username" password="your-upstash-password";
   PORT=8080
   APP_CORS_ALLOWED_ORIGINS=https://your-frontend-url.onrender.com
   ```

### 2.3 Deploy Driver Matching Service

1. Go to Render Dashboard → "New" → "Web Service"
2. Connect your repository: `sriharsha-gvkss/bikefinal`
3. Configure:
   - **Name**: `biketaxi-driver-matching-service`
   - **Root Directory**: `driver-matching-service`
   - **Environment**: `Docker`
   - **Branch**: `main`
   - **Region**: Same as your database

4. **Environment Variables**:
   ```
   SPRING_PROFILES_ACTIVE=prod
   SPRING_KAFKA_BOOTSTRAP_SERVERS=your-upstash-kafka-url:9092
   SPRING_KAFKA_SECURITY_PROTOCOL=SASL_SSL
   SPRING_KAFKA_SASL_MECHANISM=PLAIN
   SPRING_KAFKA_SASL_JAAS_CONFIG=org.apache.kafka.common.security.plain.PlainLoginModule required username="your-upstash-username" password="your-upstash-password";
   PORT=8081
   ```

### 2.4 Deploy Frontend

1. Go to Render Dashboard → "New" → "Static Site"
2. Connect your repository: `sriharsha-gvkss/bikefinal`
3. Configure:
   - **Name**: `biketaxi-frontend`
   - **Root Directory**: `main-ui`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
   - **Branch**: `main`

4. **Environment Variables**:
   ```
   REACT_APP_BOOKING_SERVICE_URL=https://your-booking-service-url.onrender.com
   REACT_APP_DRIVER_MATCHING_SERVICE_URL=https://your-driver-matching-service-url.onrender.com
   REACT_APP_BOOKING_SERVICE_WS_URL=wss://your-booking-service-url.onrender.com
   REACT_APP_DRIVER_MATCHING_SERVICE_WS_URL=wss://your-driver-matching-service-url.onrender.com
   REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

## Step 3: Example Environment Variables

### Booking Service (Replace with your actual values):
```
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://dpg-abc123-def456-oregon-postgres.render.com:5432/biketaxi
SPRING_DATASOURCE_USERNAME=biketaxi_user
SPRING_DATASOURCE_PASSWORD=your_actual_password
SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka-abc123-def456.us-west-1.upstash.io:9092
SPRING_KAFKA_SECURITY_PROTOCOL=SASL_SSL
SPRING_KAFKA_SASL_MECHANISM=PLAIN
SPRING_KAFKA_SASL_JAAS_CONFIG=org.apache.kafka.common.security.plain.PlainLoginModule required username="your-upstash-username" password="your-upstash-password";
PORT=8080
APP_CORS_ALLOWED_ORIGINS=https://biketaxi-frontend.onrender.com
```

### Driver Matching Service:
```
SPRING_PROFILES_ACTIVE=prod
SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka-abc123-def456.us-west-1.upstash.io:9092
SPRING_KAFKA_SECURITY_PROTOCOL=SASL_SSL
SPRING_KAFKA_SASL_MECHANISM=PLAIN
SPRING_KAFKA_SASL_JAAS_CONFIG=org.apache.kafka.common.security.plain.PlainLoginModule required username="your-upstash-username" password="your-upstash-password";
PORT=8081
```

## Step 4: Testing Your Setup

### 4.1 Check Upstash Dashboard

1. Go to your Upstash Kafka dashboard
2. Check the **Topics** tab - topics will be created automatically when your app first uses them
3. Check the **Messages** tab to see if messages are being produced/consumed

### 4.2 Test Your Application

1. Visit your frontend URL
2. Try to create a booking
3. Check the logs in your Render services
4. Verify messages are flowing through Kafka

## Troubleshooting

### Common Issues:

1. **Connection Refused**: Check if the Upstash URL and credentials are correct
2. **Authentication Failed**: Verify username and password in the JAAS config
3. **CORS Errors**: Ensure the frontend URL is correctly set in CORS configuration
4. **Topic Not Found**: Topics are auto-created, but you can create them manually in Upstash dashboard

### Debug Steps:

1. **Check Render Logs**: Go to your service dashboard → "Logs"
2. **Check Upstash Metrics**: Go to your Kafka dashboard → "Metrics"
3. **Test Connection**: Use Upstash's built-in REST API to test connectivity

## Cost Considerations

- **Upstash Free Tier**: 10,000 messages/day, 256MB storage
- **Render Free Tier**: Services spin down after inactivity
- **Upgrade When Needed**: Both platforms offer paid tiers for production use

## Security Notes

1. **Environment Variables**: Keep your Upstash credentials secure in Render environment variables
2. **HTTPS**: All connections use SSL/TLS
3. **Network Security**: Upstash provides secure endpoints

## Next Steps

1. Set up Upstash Kafka following this guide
2. Deploy your services on Render with the correct environment variables
3. Test the complete flow
4. Monitor usage and upgrade plans as needed

This setup gives you a fully managed Kafka/Zookeeper solution that works seamlessly with Render! 