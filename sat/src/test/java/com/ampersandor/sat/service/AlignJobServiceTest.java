package com.ampersandor.sat.service;

import com.ampersandor.sat.client.AlignmentServiceClient;
import com.ampersandor.sat.domain.AlignJobStatus;
import com.ampersandor.sat.domain.AlignTool;
import com.ampersandor.sat.dto.*;
import com.ampersandor.sat.entity.AlignJob;
import com.ampersandor.sat.entity.FileRecord;
import com.ampersandor.sat.exceptions.AlignJobNotFoundException;
import com.ampersandor.sat.repository.AlignJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.test.StepVerifier;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;


@ExtendWith(MockitoExtension.class)
@DisplayName("AlignJobService 테스트")
class AlignJobServiceTest {

    @Mock
    private AlignmentServiceClient alignmentServiceClient;
    
    @Mock
    private AlignJobRepository alignJobRepository;
    
    @Mock
    private Sinks.Many<AlignJobDto> alignJobSink;

    @InjectMocks
    private AlignJobService alignJobService;

    private AlignJob testAlignJob;
    private AlignJobUpdateRequest updateRequest;

    @BeforeEach
    void setUp() {
        testAlignJob = new AlignJob();
        testAlignJob.setId(1L);
        testAlignJob.setTaskId("task-123");
        testAlignJob.setStatus(AlignJobStatus.PENDING);
        testAlignJob.setCreatedAt(LocalDateTime.now());
        testAlignJob.setUpdatedAt(LocalDateTime.now());

        updateRequest = new AlignJobUpdateRequest(
                "task-123",
                AlignJobStatus.SUCCESS,
                "output.fasta",
                null
        );
    }

    @Test
    @DisplayName("정렬 작업 제출 - 성공")
    void submitAlignmentJob_Success() {
        // given
        AlignJobSubmitRequest request = new AlignJobSubmitRequest(
                AlignTool.mafft,
                "--auto",
                "/data/test.fasta"
        );
        AlignJobSubmitResponse expectedResponse = new AlignJobSubmitResponse(
                AlignJobStatus.PENDING,
                "task-123"
        );

        when(alignmentServiceClient.align(request)).thenReturn(Mono.just(expectedResponse));

        // when & then
        StepVerifier.create(alignJobService.submitAlignmentJob(request))
                .assertNext(response -> {
                    assertThat(response.taskId()).isEqualTo("task-123");
                    assertThat(response.alignJobStatus()).isEqualTo(AlignJobStatus.PENDING);
                })
                .verifyComplete();

        verify(alignmentServiceClient).align(request);
    }

    @Test
    @DisplayName("AlignJob 저장 - 성공")
    void saveAlignJob_Success() {
        // given
        AlignJob alignJob = new AlignJob();
        alignJob.setId(1L);
        alignJob.setTaskId("task-123");
        alignJob.setStatus(AlignJobStatus.PENDING);
        alignJob.setInputFileRecordId(1L);
        alignJob.setCreatedAt(LocalDateTime.now());

        AlignJob savedJob = new AlignJob();
        savedJob.setId(1L);
        savedJob.setTaskId("task-123");
        savedJob.setStatus(AlignJobStatus.PENDING);
        savedJob.setInputFileRecordId(1L);
        savedJob.setCreatedAt(LocalDateTime.now());

        when(alignJobRepository.save(any(AlignJob.class))).thenReturn(Mono.just(savedJob));

        // when & then
        StepVerifier.create(alignJobService.saveAlignJob(alignJob))
                .assertNext(result -> {
                    assertThat(result.getId()).isEqualTo(1L);
                    assertThat(result.getTaskId()).isEqualTo("task-123");
                    assertThat(result.getStatus()).isEqualTo(AlignJobStatus.PENDING);
                })
                .verifyComplete();

        verify(alignJobRepository).save(alignJob);
    }

    @Test
    @DisplayName("작업 상태 업데이트 - 출력 파일과 함께 성공")
    void updateJobStatusWithOutputFile_Success() {
        // Given
        FileRecord outputFile = new FileRecord();
        outputFile.setId(2L);
        outputFile.setFilename("output.fasta");

        when(alignJobRepository.findByTaskId(anyString())).thenReturn(Mono.just(testAlignJob));
        when(alignJobRepository.save(any(AlignJob.class))).thenReturn(Mono.just(testAlignJob));

        // When & Then
        StepVerifier.create(alignJobService.updateJobStatusWithOutputFile(updateRequest, outputFile))
                .assertNext(alignJob -> {
                    assertThat(alignJob.getStatus()).isEqualTo(AlignJobStatus.SUCCESS);
                    assertThat(alignJob.getOutputFileRecordId()).isEqualTo(2L);
                })
                .verifyComplete();

        verify(alignJobRepository).findByTaskId("task-123");
        verify(alignJobRepository).save(any(AlignJob.class));
    }

    @Test
    @DisplayName("작업 상태 업데이트 - ERROR 상태 (출력 파일 없이)")
    void updateJobStatus_Error() {
        // Given
        AlignJobUpdateRequest errorRequest = new AlignJobUpdateRequest(
                "task-123",
                AlignJobStatus.ERROR,
                null,
                "Alignment failed: invalid input format"
        );

        when(alignJobRepository.findByTaskId(anyString())).thenReturn(Mono.just(testAlignJob));
        when(alignJobRepository.save(any(AlignJob.class))).thenReturn(Mono.just(testAlignJob));

        // When & Then
        StepVerifier.create(alignJobService.updateJobStatus(errorRequest))
                .assertNext(alignJob -> {
                    assertThat(alignJob.getStatus()).isEqualTo(AlignJobStatus.ERROR);
                    assertThat(alignJob.getErrorMessage()).isEqualTo("Alignment failed: invalid input format");
                    assertThat(alignJob.getOutputFileRecordId()).isNull();
                })
                .verifyComplete();

        verify(alignJobRepository).findByTaskId("task-123");
        verify(alignJobRepository).save(any(AlignJob.class));
    }

    @Test
    @DisplayName("작업 상태 업데이트 - RUNNING 상태 (출력 파일 없이)")
    void updateJobStatus_Running() {
        // Given
        AlignJobUpdateRequest runningRequest = new AlignJobUpdateRequest(
                "task-123",
                AlignJobStatus.RUNNING,
                null,
                null
        );

        when(alignJobRepository.findByTaskId(anyString())).thenReturn(Mono.just(testAlignJob));
        when(alignJobRepository.save(any(AlignJob.class))).thenReturn(Mono.just(testAlignJob));

        // When & Then
        StepVerifier.create(alignJobService.updateJobStatus(runningRequest))
                .assertNext(alignJob -> {
                    assertThat(alignJob.getStatus()).isEqualTo(AlignJobStatus.RUNNING);
                    assertThat(alignJob.getErrorMessage()).isNull();
                    assertThat(alignJob.getOutputFileRecordId()).isNull();
                })
                .verifyComplete();

        verify(alignJobRepository).findByTaskId("task-123");
        verify(alignJobRepository).save(any(AlignJob.class));
    }

    @Test
    @DisplayName("작업 상태 업데이트 - 존재하지 않는 TaskId")
    void updateJobStatus_NotFound() {
        // Given
        when(alignJobRepository.findByTaskId(anyString())).thenReturn(Mono.empty());

        // When & Then
        StepVerifier.create(alignJobService.updateJobStatus(updateRequest))
                .expectError(AlignJobNotFoundException.class)
                .verify();

        verify(alignJobRepository).findByTaskId("task-123");
        verify(alignJobRepository, never()).save(any(AlignJob.class));
    }

    @Test
    @DisplayName("Job 생성 이벤트 발행 - 성공")
    void emitAlignJobDto_Success() {
        // given
        AlignJobDto jobDto = new AlignJobDto(
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

        when(alignJobSink.tryEmitNext(any(AlignJobDto.class)))
                .thenReturn(Sinks.EmitResult.OK);

        // when & then
        StepVerifier.create(alignJobService.emitAlignJobDto(jobDto))
                .assertNext(result -> {
                    assertThat(result.taskId()).isEqualTo("task-123");
                    assertThat(result.status()).isEqualTo("PENDING");
                })
                .verifyComplete();

        verify(alignJobSink).tryEmitNext(jobDto);
    }

    @Test
    @DisplayName("AlignJob 저장 실패 처리")
    void saveAlignJob_Failure() {
        // given
        AlignJob alignJob = new AlignJob();
        alignJob.setTaskId("task-123");
        
        when(alignJobRepository.save(any(AlignJob.class)))
                .thenReturn(Mono.error(new RuntimeException("Database error")));

        // when & then
        StepVerifier.create(alignJobService.saveAlignJob(alignJob))
                .expectError(RuntimeException.class)
                .verify();
    }
} 