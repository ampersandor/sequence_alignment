package com.ampersandor.sat.service;

import com.ampersandor.sat.domain.AlignJobStatus;
import com.ampersandor.sat.domain.FileType;
import com.ampersandor.sat.dto.*;
import com.ampersandor.sat.dto.PagedResponse;
import com.ampersandor.sat.entity.AlignJob;
import com.ampersandor.sat.exceptions.FileRecordNotFoundException;
import com.ampersandor.sat.mapper.AlignJobMapper;
import com.ampersandor.sat.mapper.FileRecordMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;


@Slf4j
@Service
public class WorkflowService {

    private final FileRecordService fileRecordService;
    private final AlignJobService alignJobService;


    public WorkflowService(FileRecordService fileRecordService,
                           AlignJobService alignJobService) {
        this.fileRecordService = fileRecordService;
        this.alignJobService = alignJobService;
        log.info("🏗️ SequenceAlignmentWorkflowService 초기화 완료");
    }

    @Transactional
    public Mono<AlignJobDto> startAlignment(Long fileId, AlignJobCreateRequest request) {
        return fileRecordService.findById(fileId)
                .switchIfEmpty(Mono.error(new FileRecordNotFoundException(fileId)))
                .flatMap(fileRecord -> {
                    AlignJob alignJob = AlignJobMapper.toAlignJob(request, fileRecord);
                    AlignJobSubmitRequest submitRequest = AlignJobMapper.toAlignJobSubmitRequest(alignJob, fileRecord);
                    return alignJobService.submitAlignmentJob(submitRequest)
                            .flatMap(response -> {
                                alignJob.setTaskId(response.taskId());
                                alignJob.setStatus(response.alignJobStatus());
                                return alignJobService.saveAlignJob(alignJob);
                            })
                            .map(AlignJobMapper::toAlignJobDto)
                            .flatMap(alignJobService::emitAlignJobDto);
                })
                .doOnSuccess(dto -> log.info("✅ 정렬 워크플로우 완료 - taskId={}", dto.taskId()))
                .doOnError(error -> log.error("❌ 정렬 워크플로우 실패 - fileId={}", fileId, error))
                .onErrorResume(FileRecordNotFoundException.class, error -> 
                        Mono.error(new IllegalArgumentException("입력 파일을 찾을 수 없습니다: " + fileId)));
    }

    @Transactional
    public Mono<AlignJobDto> updateAlignment(AlignJobUpdateRequest updateRequest) {
        // ERROR 상태이거나 출력 파일이 없는 경우
        if (updateRequest.status() == AlignJobStatus.ERROR || 
            updateRequest.outputFile() == null || 
            updateRequest.outputFile().isEmpty()) {
            
            return alignJobService.updateJobStatus(updateRequest)
                    .map(AlignJobMapper::toAlignJobDto)
                    .flatMap(alignJobService::emitAlignJobDto)
                    .doOnSuccess(response -> {
                        if (updateRequest.status() == AlignJobStatus.ERROR) {
                            log.error("❌ 정렬 작업 실패 - taskId={}, error={}", 
                                    response.taskId(), updateRequest.error());
                        } else {
                            log.warn("⚠️ 출력 파일 없이 상태 업데이트 - taskId={}, status={}", 
                                    response.taskId(), response.status());
                        }
                    })
                    .doOnError(error -> log.error("❌ 상태 업데이트 실패 - taskId={}", 
                            updateRequest.taskId(), error));
        }
        
        // SUCCESS 상태이고 출력 파일이 있는 경우
        return fileRecordService.saveFileRecord(Mono.just(FileRecordMapper.toFileRecordCreateRequest(updateRequest, FileType.OUTPUT)))
                .flatMap(outputFileRecord -> alignJobService.updateJobStatusWithOutputFile(updateRequest, outputFileRecord)
                        .map(AlignJobMapper::toAlignJobDto)
                        .flatMap(alignJobService::emitAlignJobDto))
                .doOnSuccess(response -> log.info("✅ 출력 파일과 함께 상태 업데이트 완료 - taskId={}, status={}",
                        response.taskId(), response.status()))
                .doOnError(error -> log.error("❌ 출력 파일 업데이트 실패 - taskId={}", 
                        updateRequest.taskId(), error));
    }
        
    public Flux<AlignJobDto> streamAlignments(Integer page, Integer size) {
        return alignJobService.streamAlignJobs()
                .doOnSubscribe(subscription -> log.info("🔗 새로운 SSE 클라이언트 연결"))
                .doOnNext(job -> {
                    if (!"KEEP_ALIVE".equals(job.taskId())) {
                        log.debug("📤 SSE 이벤트 전송 - taskId={}, status={}", 
                                job.taskId(), job.status());
                    }
                })
                .doOnError(error -> log.error("❌ SSE 스트림 오류", error))
                .onErrorContinue((error, item) -> 
                        log.warn("⚠️ SSE 아이템 처리 중 오류 (계속 진행): {}", error.getMessage()))
                .doOnCancel(() -> log.info("🔌 SSE 클라이언트 연결 해제"))
                .doOnComplete(() -> log.info("✅ SSE 스트림 완료"));
    }

    public Mono<PagedResponse<AlignJobDto>> getExistingJobsWithPaging(Integer page, Integer size, List<String> sortParams) {
        return alignJobService.findExistingJobsWithPaging(page, size, sortParams)
                .doOnSubscribe(subscription -> log.info("📋 페이징 작업 조회 워크플로우 시작: page={}, size={}, sort={}", 
                        page, size, sortParams))
                .doOnNext(pagedResponse -> log.debug("📄 워크플로우 페이징 정보: 총 {}개 중 {}페이지", 
                        pagedResponse.totalElements(), pagedResponse.page()))
                .doOnSuccess(pagedResponse -> log.info("✅ 페이징 작업 조회 워크플로우 완료: page={}, size={}, total={}", 
                        page, size, pagedResponse.totalElements()))
                .doOnError(error -> log.error("❌ 페이징 작업 조회 워크플로우 실패: page={}, size={}", page, size, error));
    }

} 