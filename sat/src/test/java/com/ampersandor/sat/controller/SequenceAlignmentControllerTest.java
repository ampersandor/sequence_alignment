package com.ampersandor.sat.controller;

import com.ampersandor.sat.domain.AlignJobStatus;
import com.ampersandor.sat.domain.AlignTool;
import com.ampersandor.sat.dto.*;
import com.ampersandor.sat.service.WorkflowService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;


@WebFluxTest(SequenceAlignmentController.class)
@DisplayName("SequenceAlignmentController 테스트")
class SequenceAlignmentControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private WorkflowService workflowService;

    @Test
    @DisplayName("정렬 작업 시작 - 성공")
    void startAlignment_Success() {
        // given
        Long fileId = 1L;
        AlignJobCreateRequest request = new AlignJobCreateRequest(
                1L,
                AlignTool.mafft,
                "--auto"
        );
        AlignJobDto mockResponse = new AlignJobDto(
                "task-123",
                1L,
                "/data/input.fasta",
                1L,
                AlignTool.mafft,
                "--auto",
                "2024-01-01T00:00:00",
                null,
                null,
                "PENDING",
                null
        );

        when(workflowService.startAlignment(anyLong(), any(AlignJobCreateRequest.class)))
                .thenReturn(Mono.just(mockResponse));

        // when & then
        webTestClient.post()
                .uri("/align/{fileId}", fileId)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectBody(AlignJobDto.class)
                .value(response -> {
                    assertThat(response.taskId()).isEqualTo("task-123");
                    assertThat(response.status()).isEqualTo("PENDING");
                    assertThat(response.alignTool()).isEqualTo(AlignTool.mafft);
                });
    }

    @Test
    @DisplayName("웹훅 처리 - 성공")
    void handleWebhook_Success() {
        // given
        AlignJobUpdateRequest updateRequest = new AlignJobUpdateRequest(
                "task-123",
                AlignJobStatus.SUCCESS,
                "/data/output.fasta",
                null
        );
        AlignJobDto mockResponse = new AlignJobDto(
                "task-123",
                1L,
                "/data/input.fasta",
                1L,
                AlignTool.mafft,
                "--auto",
                "2024-01-01T00:00:00",
                "2024-01-01T01:00:00",
                2L,
                "SUCCESS",
                null
        );

        when(workflowService.updateAlignment(any(AlignJobUpdateRequest.class)))
                .thenReturn(Mono.just(mockResponse));

        // when & then
        webTestClient.post()
                .uri("/align/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(updateRequest)
                .exchange()
                .expectStatus().isOk()
                .expectBody(AlignJobDto.class)
                .value(response -> {
                    assertThat(response.taskId()).isEqualTo("task-123");
                    assertThat(response.status()).isEqualTo("SUCCESS");
                    assertThat(response.outputFileRecordId()).isEqualTo(2L);
                });
    }

    @Test
    @DisplayName("헬스체크 - 성공")
    void health_Success() {
        // when & then
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
    @DisplayName("정렬 작업 시작 - 서비스 오류")
    void startAlignment_ServiceError() {
        // given
        Long fileId = 1L;
        AlignJobCreateRequest request = new AlignJobCreateRequest(
                1L,
                AlignTool.mafft,
                "--auto"
        );

        when(workflowService.startAlignment(anyLong(), any(AlignJobCreateRequest.class)))
                .thenReturn(Mono.error(new RuntimeException("Service error")));

        // when & then
        webTestClient.post()
                .uri("/align/{fileId}", fileId)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isBadRequest();
    }

    @Test
    @DisplayName("웹훅 처리 - 서비스 오류")
    void handleWebhook_ServiceError() {
        // given
        AlignJobUpdateRequest updateRequest = new AlignJobUpdateRequest(
                "task-123",
                AlignJobStatus.ERROR,
                null,
                "Processing failed"
        );

        when(workflowService.updateAlignment(any(AlignJobUpdateRequest.class)))
                .thenReturn(Mono.error(new RuntimeException("Update failed")));

        // when & then
        webTestClient.post()
                .uri("/align/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(updateRequest)
                .exchange()
                .expectStatus().isBadRequest();
    }

    @Test
    @DisplayName("SSE 스트림 - 성공")
    void streamAlignments_Success() {
        // Given
        Flux<AlignJobDto> mockStream = Flux.just(
            new AlignJobDto("task1", 1L, "/path/input1.fasta", 1L, AlignTool.mafft, null, "2024-01-01T00:00:00", "2024-01-01T00:00:00", null, "PENDING", null),
            new AlignJobDto("task2", 2L, "/path/input2.fasta", 2L, AlignTool.uclust, null, "2024-01-01T00:00:00", "2024-01-01T00:00:00", null, "RUNNING", null)
        );
        
        when(workflowService.streamAlignments(1, 10))
            .thenReturn(mockStream);
        
        // When & Then
        webTestClient.get()
            .uri("/align/stream?page=1&size=10")
            .exchange()
            .expectStatus().isOk()
            .expectHeader().contentType(MediaType.TEXT_EVENT_STREAM)
            .expectBodyList(AlignJobDto.class)
            .hasSize(2);
    }


    @Test
    @DisplayName("페이징 정보 포함 기존 작업 조회 - 성공")
    void getExistingJobsWithPaging_Success() {
        // Given
        List<AlignJobDto> jobList = List.of(
            new AlignJobDto("task1", 1L, "/path/input1.fasta", 1L, AlignTool.mafft, null, "2024-01-01T00:00:00", "2024-01-01T00:00:00", null, "SUCCESS", null),
            new AlignJobDto("task2", 2L, "/path/input2.fasta", 2L, AlignTool.uclust, null, "2024-01-01T00:00:00", "2024-01-01T00:00:00", null, "ERROR", null)
        );
        PagedResponse<AlignJobDto> pagedResponse = PagedResponse.of(jobList, 1, 10, 25L);
        
        when(workflowService.getExistingJobsWithPaging(1, 10, (List<String>) null))
            .thenReturn(Mono.just(pagedResponse));
        
        // When & Then
        webTestClient.get()
            .uri("/align/jobs?page=1&size=10")
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.content").isArray()
            .jsonPath("$.content.length()").isEqualTo(2)
            .jsonPath("$.page").isEqualTo(1)
            .jsonPath("$.size").isEqualTo(10)
            .jsonPath("$.totalPages").isEqualTo(3)
            .jsonPath("$.totalElements").isEqualTo(25)
            .jsonPath("$.first").isEqualTo(true)
            .jsonPath("$.last").isEqualTo(false)
            .jsonPath("$.numberOfElements").isEqualTo(2)
            .jsonPath("$.content[0].taskId").isEqualTo("task1")
            .jsonPath("$.content[1].taskId").isEqualTo("task2");
    }

    @Test
    @DisplayName("페이징 정보 포함 기존 작업 조회 - 기본값 사용")
    void getExistingJobsWithPaging_DefaultValues() {
        // Given
        List<AlignJobDto> jobList = List.of(
            new AlignJobDto("task1", 1L, "/path/input1.fasta", 1L, AlignTool.vsearch, null, "2024-01-01T00:00:00", "2024-01-01T00:00:00", null, "PENDING", null)
        );
        PagedResponse<AlignJobDto> pagedResponse = PagedResponse.of(jobList, 1, 10, 1L);
        
        when(workflowService.getExistingJobsWithPaging(1, 10, (List<String>) null))
            .thenReturn(Mono.just(pagedResponse));
        
        // When & Then
        webTestClient.get()
            .uri("/align/jobs")
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.content").isArray()
            .jsonPath("$.content.length()").isEqualTo(1)
            .jsonPath("$.page").isEqualTo(1)
            .jsonPath("$.size").isEqualTo(10)
            .jsonPath("$.totalPages").isEqualTo(1)
            .jsonPath("$.totalElements").isEqualTo(1)
            .jsonPath("$.first").isEqualTo(true)
            .jsonPath("$.last").isEqualTo(true)
            .jsonPath("$.numberOfElements").isEqualTo(1);
    }

    @Test
    @DisplayName("페이징 정보 포함 기존 작업 조회 - 빈 결과")
    void getExistingJobsWithPaging_EmptyResult() {
        // Given
        PagedResponse<AlignJobDto> pagedResponse = PagedResponse.of(List.of(), 1, 10, 0L);
        
        when(workflowService.getExistingJobsWithPaging(1, 10, (List<String>) null))
            .thenReturn(Mono.just(pagedResponse));
        
        // When & Then
        webTestClient.get()
            .uri("/align/jobs?page=1&size=10")
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.content").isArray()
            .jsonPath("$.content.length()").isEqualTo(0)
            .jsonPath("$.page").isEqualTo(1)
            .jsonPath("$.size").isEqualTo(10)
            .jsonPath("$.totalPages").isEqualTo(0)
            .jsonPath("$.totalElements").isEqualTo(0)
            .jsonPath("$.first").isEqualTo(true)
            .jsonPath("$.last").isEqualTo(true)
            .jsonPath("$.numberOfElements").isEqualTo(0);
    }



    @Test
    @DisplayName("Spring Data 표준 정렬 - 생성일 내림차순")
    void getExistingJobsWithSort_CreatedAtDesc() {
        // Given
        List<AlignJobDto> jobList = List.of(
            new AlignJobDto("task1", 1L, "/path/input1.fasta", 1L, AlignTool.mafft, null, "2024-01-02T00:00:00", "2024-01-02T00:00:00", null, "SUCCESS", null),
            new AlignJobDto("task2", 2L, "/path/input2.fasta", 2L, AlignTool.uclust, null, "2024-01-01T00:00:00", "2024-01-01T00:00:00", null, "ERROR", null)
        );
        PagedResponse<AlignJobDto> pagedResponse = PagedResponse.of(jobList, 1, 10, 2L);
        
        when(workflowService.getExistingJobsWithPaging(1, 10, List.of("createdAt,desc")))
            .thenReturn(Mono.just(pagedResponse));
        
        // When & Then
        webTestClient.get()
            .uri("/align/jobs?page=1&size=10&sort=createdAt,desc")
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.content").isArray()
            .jsonPath("$.content.length()").isEqualTo(2)
            .jsonPath("$.content[0].taskId").isEqualTo("task1")
            .jsonPath("$.content[1].taskId").isEqualTo("task2");
    }

    @Test
    @DisplayName("Spring Data 표준 정렬 - 다중 정렬")
    void getExistingJobsWithSort_MultipleSort() {
        // Given
        List<AlignJobDto> jobList = List.of(
            new AlignJobDto("task1", 1L, "/path/input1.fasta", 1L, AlignTool.mafft, null, "2024-01-01T00:00:00", "2024-01-01T00:00:00", null, "ERROR", null),
            new AlignJobDto("task2", 2L, "/path/input2.fasta", 2L, AlignTool.uclust, null, "2024-01-01T00:00:00", "2024-01-01T00:00:00", null, "SUCCESS", null)
        );
        PagedResponse<AlignJobDto> pagedResponse = PagedResponse.of(jobList, 1, 10, 2L);
        
        when(workflowService.getExistingJobsWithPaging(1, 10, List.of("status,asc", "createdAt,desc")))
            .thenReturn(Mono.just(pagedResponse));
        
        // When & Then
        webTestClient.get()
            .uri("/align/jobs?page=1&size=10&sort=status,asc&sort=createdAt,desc")
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.content").isArray()
            .jsonPath("$.content.length()").isEqualTo(2)
            .jsonPath("$.content[0].status").isEqualTo("ERROR")
            .jsonPath("$.content[1].status").isEqualTo("SUCCESS");
    }

    @Test
    @DisplayName("Spring Data 표준 정렬 - 방향 생략")
    void getExistingJobsWithSort_NoDirection() {
        // Given
        List<AlignJobDto> jobList = List.of(
            new AlignJobDto("task1", 1L, "/path/input1.fasta", 1L, AlignTool.mafft, null, "2024-01-01T00:00:00", "2024-01-01T00:00:00", null, "SUCCESS", null)
        );
        PagedResponse<AlignJobDto> pagedResponse = PagedResponse.of(jobList, 1, 10, 1L);
        
        when(workflowService.getExistingJobsWithPaging(1, 10, List.of("createdAt")))
            .thenReturn(Mono.just(pagedResponse));
        
        // When & Then
        webTestClient.get()
            .uri("/align/jobs?page=1&size=10&sort=createdAt")
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.content").isArray()
            .jsonPath("$.content.length()").isEqualTo(1);
    }
} 