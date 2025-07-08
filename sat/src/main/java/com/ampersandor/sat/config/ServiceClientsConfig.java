package com.ampersandor.sat.config;

import org.springframework.context.annotation.Bean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

import com.ampersandor.sat.client.AlignmentServiceClient;

@Configuration
public class ServiceClientsConfig {

    @Bean
    public AlignmentServiceClient alignmentServiceClient(@Value("${core.api.url}") String baseUrl){
        return new AlignmentServiceClient(createWebClient(baseUrl));
    }

    private WebClient createWebClient(String baseUrl){
        return WebClient.builder()
                        .baseUrl(baseUrl)
                        .defaultHeader("Content-Type", "application/json")
                        .defaultHeader("Accept", "application/json")
                        .filter((request, next) -> {
                            System.out.println("FastAPI 요청: " + request.method() + " " + request.url());
                            System.out.println("요청 헤더: " + request.headers());
                            return next.exchange(request)
                                    .doOnNext(response -> System.out.println("FastAPI 응답 상태: " + response.statusCode()));
                        })
                        .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024)) // 10MB
                        .build();
    }
}
