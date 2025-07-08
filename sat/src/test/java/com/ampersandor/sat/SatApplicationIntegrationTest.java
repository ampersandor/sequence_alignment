package com.ampersandor.sat;

import com.ampersandor.sat.dto.FileRecordDto;
import com.ampersandor.sat.dto.HealthResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.reactive.server.WebTestClient;

import static org.assertj.core.api.Assertions.assertThat;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
@ActiveProfiles("test")
@DisplayName("SAT 애플리케이션 통합 테스트")
class SatApplicationIntegrationTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    @DisplayName("헬스체크 엔드포인트 동작 확인")
    void healthCheck_ShouldReturnHealthyStatus() {
        webTestClient.get()
                .uri("/health")
                .exchange()
                .expectStatus().isOk()
                .expectBody(HealthResponse.class)
                .value(response -> {
                    assertThat(response.status()).isEqualTo("UP");
                    assertThat(response.details()).isEqualTo("SAT Application is running normally");
                });
    }

    @Test
    @DisplayName("상세 헬스체크 엔드포인트 동작 확인")
    void detailedHealthCheck_ShouldReturnDetailedStatus() {
        webTestClient.get()
                .uri("/health/detailed")
                .exchange()
                .expectStatus().isOk()
                .expectBody(HealthResponse.class)
                .value(response -> {
                    assertThat(response.status()).isEqualTo("UP");
                    assertThat(response.details()).contains("Database: Connected");
                    assertThat(response.details()).contains("Memory:");
                });
    }

    @Test
    @DisplayName("파일 목록 조회 기본 테스트")
    void fileListFlow_BasicTest() {
        // 1. 파일 목록 조회
        webTestClient.get()
                .uri("/file/list")
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(FileRecordDto.class);

        // 2. 전체 파일 목록 조회
        webTestClient.get()
                .uri("/file/list/all")
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(FileRecordDto.class);
    }

    @Test
    @DisplayName("정렬 워크플로우 헬스체크")
    void alignmentWorkflowHealth_ShouldReturnOk() {
        webTestClient.get()
                .uri("/align/health")
                .exchange()
                .expectStatus().isOk()
                .expectBody(String.class)
                .value(response -> {
                    assertThat(response).isEqualTo("Sequence Alignment Workflow Service is running");
                });
    }

    @Test
    @DisplayName("잘못된 파일 타입 요청 처리")
    void invalidFileTypeRequest_ShouldReturnError() {
        webTestClient.get()
                .uri("/file/list/invalid")
                .exchange()
                .expectStatus().is5xxServerError();
    }

    @Test
    @DisplayName("존재하지 않는 파일 다운로드 요청")
    void nonExistentFileDownload_ShouldReturnNotFound() {
        webTestClient.get()
                .uri("/file/download/999999")
                .exchange()
                .expectStatus().isNotFound();
    }

    @Test
    @DisplayName("빈 파일 목록 조회")
    void emptyFileList_ShouldReturnEmptyArray() {
        webTestClient.get()
                .uri("/file/list/output")
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(FileRecordDto.class)
                .hasSize(0);
    }
} 