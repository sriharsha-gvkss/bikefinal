package com.taxi.booking.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;

@Configuration
@EnableKafka
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class KafkaConfig {
    // Kafka configuration will only be loaded if app.kafka.enabled=true
    // This class will not be loaded at all if Kafka is disabled
} 