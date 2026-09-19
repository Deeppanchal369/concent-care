package com.consentcare.core.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${consentcare.services.risk-service-url}")
    private String riskServiceUrl;

    @Value("${consentcare.services.agent-service-url}")
    private String agentServiceUrl;

    @Bean
    public WebClient riskServiceClient() {
        return WebClient.builder().baseUrl(riskServiceUrl).build();
    }

    @Bean
    public WebClient agentServiceClient() {
        return WebClient.builder().baseUrl(agentServiceUrl).build();
    }
}
