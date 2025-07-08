package com.ampersandor.sat.controller;

import com.ampersandor.sat.dto.HealthResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.test.StepVerifier;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;


@WebFluxTest(HealthController.class)
@DisplayName("HealthController 테스트")
class HealthControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    @DisplayName("헬스 체크 - 성공")
    void checkHealth_Success() {
        webTestClient.get()
                .uri("/health")
                .exchange()
                .expectStatus().isOk()
                .expectBody(HealthResponse.class)
                .value(response -> {
                    assertThat(response.status()).isEqualTo("UP");
                    assertThat(response.details()).isEqualTo("SAT Application is running normally");
                    assertThat(response.timestamp()).isBefore(LocalDateTime.now().plusSeconds(1));
                });
    }

    @Test
    @DisplayName("상세 헬스 체크 - 성공")
    void checkDetailedHealth_Success() {
        webTestClient.get()
                .uri("/health/detailed")
                .exchange()
                .expectStatus().isOk()
                .expectBody(HealthResponse.class)
                .value(response -> {
                    assertThat(response.status()).isEqualTo("UP");
                    assertThat(response.details()).contains("Database: Connected");
                    assertThat(response.details()).contains("Memory:");
                    assertThat(response.details()).contains("Uptime: Available");
                });
    }

    @Test
    @DisplayName("헬스 체크 Mono 반환 테스트")
    void checkHealth_ReactiveTest() {
        HealthController healthController = new HealthController();
        
        StepVerifier.create(healthController.checkHealth())
                .assertNext(response -> {
                    assertThat(response.status()).isEqualTo("UP");
                    assertThat(response.details()).isEqualTo("SAT Application is running normally");
                })
                .verifyComplete();
    }

    @Test
    @DisplayName("상세 헬스 체크 Mono 반환 테스트")
    void checkDetailedHealth_ReactiveTest() {
        HealthController healthController = new HealthController();
        
        StepVerifier.create(healthController.checkDetailedHealth())
                .assertNext(response -> {
                    assertThat(response.status()).isEqualTo("UP");
                    assertThat(response.details()).contains("Database: Connected");
                })
                .verifyComplete();
    }
} 