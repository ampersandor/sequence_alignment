package com.ampersandor.sat.service;

import com.ampersandor.sat.domain.AlignJobStatus;
import com.ampersandor.sat.domain.FileType;
import com.ampersandor.sat.dto.*;
import com.ampersandor.sat.entity.AlignJob;
import com.ampersandor.sat.entity.FileRecord;
import com.ampersandor.sat.mapper.AlignJobMapper;
import com.ampersandor.sat.mapper.FileRecordMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkflowServiceTest {

    @Mock
    private FileRecordService fileRecordService;

    @Mock
    private AlignJobService alignJobService;

    @InjectMocks
    private WorkflowService workflowService;

    private AlignJob testAlignJob;
    private AlignJobDto testAlignJobDto;
    private FileRecord outputFileRecord;

    @BeforeEach
    void setUp() {
        testAlignJob = new AlignJob();
        testAlignJob.setId(1L);
        testAlignJob.setTaskId("task-123");
        testAlignJob.setStatus(AlignJobStatus.SUCCESS);
        testAlignJob.setCreatedAt(LocalDateTime.now());
        testAlignJob.setUpdatedAt(LocalDateTime.now());

        testAlignJobDto = AlignJobMapper.toAlignJobDto(testAlignJob);

        outputFileRecord = new FileRecord();
        outputFileRecord.setId(2L);
        outputFileRecord.setFilename("output.fasta");
        outputFileRecord.setFileType(FileType.OUTPUT);
    }

    @Test
    @DisplayName("정렬 작업 업데이트 - ERROR 상태 처리")
    void updateAlignment_ErrorStatus() {
        // Given
        AlignJobUpdateRequest errorRequest = new AlignJobUpdateRequest(
                "task-123",
                AlignJobStatus.ERROR,
                null,
                "Alignment failed: invalid input format"
        );

        when(alignJobService.updateJobStatus(errorRequest))
                .thenReturn(Mono.just(testAlignJob));
        when(alignJobService.emitAlignJobDto(any(AlignJobDto.class)))
                .thenReturn(Mono.just(testAlignJobDto));

        // When & Then
        StepVerifier.create(workflowService.updateAlignment(errorRequest))
                .assertNext(result -> {
                    assertThat(result.taskId()).isEqualTo("task-123");
                    assertThat(result.status()).isEqualTo("SUCCESS"); // status는 String 타입
                })
                .verifyComplete();

        // 파일 저장이 호출되지 않았는지 확인
        verify(fileRecordService, never()).saveFileRecord(any());
        verify(alignJobService).updateJobStatus(errorRequest);
        verify(alignJobService).emitAlignJobDto(any(AlignJobDto.class));
    }

    @Test
    @DisplayName("정렬 작업 업데이트 - 출력 파일이 없는 SUCCESS 상태")
    void updateAlignment_SuccessWithoutOutputFile() {
        // Given
        AlignJobUpdateRequest requestWithoutFile = new AlignJobUpdateRequest(
                "task-123",
                AlignJobStatus.SUCCESS,
                "",  // 빈 문자열
                null
        );

        when(alignJobService.updateJobStatus(requestWithoutFile))
                .thenReturn(Mono.just(testAlignJob));
        when(alignJobService.emitAlignJobDto(any(AlignJobDto.class)))
                .thenReturn(Mono.just(testAlignJobDto));

        // When & Then
        StepVerifier.create(workflowService.updateAlignment(requestWithoutFile))
                .assertNext(result -> {
                    assertThat(result.taskId()).isEqualTo("task-123");
                })
                .verifyComplete();

        // 파일 저장이 호출되지 않았는지 확인
        verify(fileRecordService, never()).saveFileRecord(any());
        verify(alignJobService).updateJobStatus(requestWithoutFile);
    }

    @Test
    @DisplayName("정렬 작업 업데이트 - 정상적인 SUCCESS 상태")
    void updateAlignment_SuccessWithOutputFile() {
        // Given
        AlignJobUpdateRequest successRequest = new AlignJobUpdateRequest(
                "task-123",
                AlignJobStatus.SUCCESS,
                "output.fasta",
                null
        );

        FileRecordCreateRequest fileCreateRequest = FileRecordMapper.toFileRecordCreateRequest(successRequest, FileType.OUTPUT);

        when(fileRecordService.saveFileRecord(any(Mono.class)))
                .thenReturn(Mono.just(outputFileRecord));
        when(alignJobService.updateJobStatusWithOutputFile(successRequest, outputFileRecord))
                .thenReturn(Mono.just(testAlignJob));
        when(alignJobService.emitAlignJobDto(any(AlignJobDto.class)))
                .thenReturn(Mono.just(testAlignJobDto));

        // When & Then
        StepVerifier.create(workflowService.updateAlignment(successRequest))
                .assertNext(result -> {
                    assertThat(result.taskId()).isEqualTo("task-123");
                    assertThat(result.status()).isEqualTo("SUCCESS");
                })
                .verifyComplete();

        verify(fileRecordService).saveFileRecord(any(Mono.class));
        verify(alignJobService).updateJobStatusWithOutputFile(successRequest, outputFileRecord);
        verify(alignJobService).emitAlignJobDto(any(AlignJobDto.class));
    }

    @Test
    @DisplayName("정렬 작업 업데이트 - RUNNING 상태")
    void updateAlignment_RunningStatus() {
        // Given
        AlignJobUpdateRequest runningRequest = new AlignJobUpdateRequest(
                "task-123",
                AlignJobStatus.RUNNING,
                null,
                null
        );

        when(alignJobService.updateJobStatus(runningRequest))
                .thenReturn(Mono.just(testAlignJob));
        when(alignJobService.emitAlignJobDto(any(AlignJobDto.class)))
                .thenReturn(Mono.just(testAlignJobDto));

        // When & Then
        StepVerifier.create(workflowService.updateAlignment(runningRequest))
                .assertNext(result -> {
                    assertThat(result.taskId()).isEqualTo("task-123");
                })
                .verifyComplete();

        verify(fileRecordService, never()).saveFileRecord(any());
        verify(alignJobService).updateJobStatus(runningRequest);
    }

    @Test
    @DisplayName("정렬 작업 업데이트 - 파일 저장 실패")
    void updateAlignment_FileRecordSaveFailed() {
        // Given
        AlignJobUpdateRequest successRequest = new AlignJobUpdateRequest(
                "task-123",
                AlignJobStatus.SUCCESS,
                "output.fasta",
                null
        );

        when(fileRecordService.saveFileRecord(any(Mono.class)))
                .thenReturn(Mono.error(new RuntimeException("파일 저장 실패")));

        // When & Then
        StepVerifier.create(workflowService.updateAlignment(successRequest))
                .expectError(RuntimeException.class)
                .verify();

        verify(fileRecordService).saveFileRecord(any(Mono.class));
        verify(alignJobService, never()).updateJobStatusWithOutputFile(any(), any());
    }
} 