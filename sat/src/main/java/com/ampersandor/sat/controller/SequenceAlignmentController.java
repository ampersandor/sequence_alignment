package com.ampersandor.sat.controller;

import com.ampersandor.sat.dto.*;
import com.ampersandor.sat.dto.PagedResponse;
import com.ampersandor.sat.service.WorkflowService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/align")
public class SequenceAlignmentController {

    private final WorkflowService workflowService;

    public SequenceAlignmentController(WorkflowService workflowService) {
        this.workflowService = workflowService;
        log.info("🏗️ SequenceAlignmentController 초기화 완료");
    }

    @PostMapping("/{fileId}")
    public Mono<ResponseEntity<AlignJobDto>> startAlignment(
            @PathVariable Long fileId,
            @RequestBody Mono<AlignJobCreateRequest> alignRequestMono) {

        return alignRequestMono
                .flatMap(req -> workflowService.startAlignment(fileId, req))
                .doOnSuccess(submitResponse -> log.info("API 호출 성공: {}", submitResponse.taskId()))
                .doOnError(error -> log.error("API: 정렬 작업 시작 실패 - {}", error.getMessage()))
                .map(ResponseEntity::ok)
                .onErrorReturn(ResponseEntity.badRequest().build());
    }

    @PostMapping("/webhook")
    public Mono<ResponseEntity<AlignJobDto>> handleWebhook(
            @RequestBody AlignJobUpdateRequest updateRequest) {
        
        log.info("API: Webhook 요청 수신 - TaskId={}", updateRequest.taskId());
        
        return workflowService.updateAlignment(updateRequest)
                .map(ResponseEntity::ok)
                .doOnSuccess(response -> log.info("API: Webhook 처리 완료 - TaskId={}, Status={}", 
                    response.getBody().taskId(), response.getBody().status()))
                .doOnError(error -> log.error("API: Webhook 처리 실패 - TaskId={}", 
                    updateRequest.taskId(), error))
                .onErrorReturn(ResponseEntity.badRequest().build());
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<AlignJobDto> streamAlignments(@RequestParam(defaultValue = "1") Integer page,
                                             @RequestParam(defaultValue = "10") Integer size) {
        log.info("API: SSE 스트리밍 요청 수신");
        
        return workflowService.streamAlignments(page, size)
                .doOnSubscribe(subscription -> log.info("API: 새로운 SSE 클라이언트 연결"))
                .doOnNext(job -> {
                    if (!"KEEP_ALIVE".equals(job.taskId())) {
                        log.info("API: SSE 이벤트 전송 - {} ({})", job.taskId(), job.status());
                    }
                })
                .doOnError(error -> log.error("API: SSE 스트림 중 오류 발생 - {}", error.getMessage()))
                .doOnCancel(() -> log.info("API: SSE 클라이언트 연결 종료"))
                .doOnComplete(() -> log.info("API: SSE 스트림 완료"))
                .onErrorContinue((error, item) -> {
                    log.warn("API: SSE 아이템 처리 중 오류 (계속 진행): {}", error.getMessage());
                });
    }

    @GetMapping("/jobs")
    public Mono<ResponseEntity<PagedResponse<AlignJobDto>>> getExistingJobsWithPaging(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) List<String> sort) {
        
        log.info("API: 페이징 작업 조회 요청 수신 - page={}, size={}, sort={}", 
                page, size, sort);
        
        return workflowService.getExistingJobsWithPaging(page, size, sort)
                .doOnSubscribe(subscription -> log.info("API: 페이징 작업 조회 시작"))
                .doOnNext(pagedResponse -> log.debug("API: 페이징 작업 조회 - 총 {}개 중 {}페이지", 
                        pagedResponse.totalElements(), pagedResponse.page()))
                .doOnSuccess(pagedResponse -> log.info("API: 페이징 작업 조회 완료 - 총 {}개", pagedResponse.totalElements()))
                .doOnError(error -> log.error("API: 페이징 작업 조회 중 오류 발생 - {}", error.getMessage()))
                .map(ResponseEntity::ok)
                .onErrorReturn(ResponseEntity.badRequest().build());
    }

    @GetMapping("/health")
    public Mono<ResponseEntity<String>> health() {
        return Mono.just(ResponseEntity.ok("Sequence Alignment Workflow Service is running"));
    }
} 