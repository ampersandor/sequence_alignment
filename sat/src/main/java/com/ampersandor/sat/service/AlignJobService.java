package com.ampersandor.sat.service;

import com.ampersandor.sat.client.AlignmentServiceClient;
import com.ampersandor.sat.dto.AlignJobDto;
import com.ampersandor.sat.dto.AlignJobSubmitRequest;
import com.ampersandor.sat.dto.AlignJobSubmitResponse;
import com.ampersandor.sat.dto.AlignJobUpdateRequest;
import com.ampersandor.sat.dto.PagedResponse;
import com.ampersandor.sat.entity.AlignJob;
import com.ampersandor.sat.entity.FileRecord;
import com.ampersandor.sat.exceptions.AlignJobNotFoundException;
import com.ampersandor.sat.mapper.AlignJobMapper;
import com.ampersandor.sat.repository.AlignJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;


@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AlignJobService {

    private final AlignmentServiceClient alignmentServiceClient;
    private final AlignJobRepository alignJobRepository;
    private final Sinks.Many<AlignJobDto> alignJobSink;

    public Mono<AlignJobSubmitResponse> submitAlignmentJob(AlignJobSubmitRequest alignJobSubmitRequest) {
        return alignmentServiceClient.align(alignJobSubmitRequest)
                .timeout(Duration.ofSeconds(30))
                .retryWhen(Retry.backoff(3, Duration.ofSeconds(1))
                        .filter(throwable -> !(throwable instanceof IllegalArgumentException)))
                .doOnSuccess(response -> log.info("✅ 정렬 작업 제출 성공: taskId={}", response.taskId()))
                .doOnError(error -> log.error("❌ 정렬 작업 제출 실패: {}", error.getMessage(), error));
    }

    @Transactional
    public Mono<AlignJob> saveAlignJob(AlignJob alignJob) {
        return alignJobRepository.save(alignJob)
                .doOnSuccess(saved -> log.debug("💾 AlignJob 저장 완료: id={}, taskId={}", 
                        saved.getId(), saved.getTaskId()))
                .doOnError(error -> log.error("❌ AlignJob 저장 실패: {}", error.getMessage(), error));
    }

    @Transactional
    public Mono<AlignJob> updateJobStatusWithOutputFile(AlignJobUpdateRequest updateRequest, FileRecord outputFileRecord) {
        return alignJobRepository.findByTaskId(updateRequest.taskId())
                .switchIfEmpty(Mono.error(new AlignJobNotFoundException(
                        "TaskId를 찾을 수 없습니다: " + updateRequest.taskId())))
                .flatMap(alignJob -> {
                    alignJob.setStatus(updateRequest.status());
                    alignJob.setErrorMessage(updateRequest.error());
                    alignJob.setOutputFileRecordId(outputFileRecord.getId());
                    alignJob.setUpdatedAt(LocalDateTime.now());
                    return alignJobRepository.save(alignJob);
                })
                .doOnSuccess(alignJob -> log.info("✅ 작업 상태 업데이트 완료: taskId={}, status={}, outputFileId={}",
                        updateRequest.taskId(), updateRequest.status(), outputFileRecord.getId()))
                .doOnError(error -> log.error("❌ 작업 상태 업데이트 실패: taskId={}", 
                        updateRequest.taskId(), error));
    }

    @Transactional
    public Mono<AlignJob> updateJobStatus(AlignJobUpdateRequest updateRequest) {
        return alignJobRepository.findByTaskId(updateRequest.taskId())
                .switchIfEmpty(Mono.error(new AlignJobNotFoundException(
                        "TaskId를 찾을 수 없습니다: " + updateRequest.taskId())))
                .flatMap(alignJob -> {
                    alignJob.setStatus(updateRequest.status());
                    alignJob.setErrorMessage(updateRequest.error());
                    alignJob.setUpdatedAt(LocalDateTime.now());
                    return alignJobRepository.save(alignJob);
                })
                .doOnSuccess(alignJob -> log.info("✅ 작업 상태만 업데이트: taskId={}, status={}",
                        updateRequest.taskId(), updateRequest.status()))
                .doOnError(error -> log.error("❌ 작업 상태 업데이트 실패: taskId={}", 
                        updateRequest.taskId(), error));
    }

    public Mono<AlignJobDto> emitAlignJobDto(AlignJobDto alignJobDto) {
        return Mono.fromCallable(() -> {
            Sinks.EmitResult result = alignJobSink.tryEmitNext(alignJobDto);
            
            if (result.isFailure()) {
                log.warn("⚠️ Sink emit 실패: {}", result);
            } else {
                log.info("📢 Job 생성 이벤트 발행: taskId={}, status={}",
                        alignJobDto.taskId(), alignJobDto.status());
            }
            
            return alignJobDto;
        });
    }

    public Flux<AlignJobDto> streamAlignJobs() {
        return streamRealtimeUpdates()
        .doOnSubscribe(subscription -> {
            log.info("🔗 SSE 클라이언트 연결: 현재 구독자 수 = {}", 
                    alignJobSink.currentSubscriberCount());
        })
        .doOnCancel(() -> {
            log.info("🔌 SSE 클라이언트 연결 해제: 현재 구독자 수 = {}", 
                    alignJobSink.currentSubscriberCount());
        })
        .doOnError(error -> log.error("❌ SSE 스트림 오류: {}", error.getMessage(), error));
    }

    public Mono<PagedResponse<AlignJobDto>> findExistingJobsWithPaging(Integer page, Integer size, List<String> sortParams) {
        Sort sort = parseSort(sortParams);
        PageRequest pageRequest = PageRequest.of(page - 1, size, sort);
        
        return Mono.zip(
            alignJobRepository.findBy(pageRequest)
                .map(AlignJobMapper::toAlignJobDto)
                .collectList(),
            alignJobRepository.count()
        )
        .map(tuple -> {
            List<AlignJobDto> content = tuple.getT1();
            long totalElements = tuple.getT2();
            return PagedResponse.of(content, page, size, totalElements);
        })
        .doOnSubscribe(subscription -> log.info("📋 페이징 작업 조회 시작: page={}, size={}, sort={}", 
                page, size, sortParams))
        .doOnNext(pagedResponse -> log.debug("📄 페이징 정보: 총 {}개 중 {}페이지", 
                pagedResponse.totalElements(), pagedResponse.page()))
        .doOnSuccess(pagedResponse -> log.info("✅ 페이징 작업 조회 완료: page={}, size={}, total={}", 
                page, size, pagedResponse.totalElements()))
        .doOnError(error -> log.error("❌ 페이징 작업 조회 실패: page={}, size={}", page, size, error))
        .onErrorResume(error -> {
            log.warn("⚠️ 페이징 작업 조회 중 오류, 빈 응답 반환: {}", error.getMessage());
            return Mono.just(PagedResponse.of(List.of(), page, size, 0L));
        });
    }

    private Sort parseSort(List<String> sortParams) {
        if (sortParams == null || sortParams.isEmpty()) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        
        List<Sort.Order> orders = new ArrayList<>();
        
        // 짝수 인덱스는 property, 홀수 인덱스는 direction
        for (int i = 0; i < sortParams.size(); i += 2) {
            String property = sortParams.get(i).trim();
            String direction = "asc"; // 기본값
            
            // 다음 파라미터가 있으면 방향으로 사용
            if (i + 1 < sortParams.size()) {
                String nextParam = sortParams.get(i + 1).trim().toLowerCase();
                if (isDirection(nextParam)) {
                    direction = nextParam;
                } else {
                    // 방향이 아니면 다음 property로 취급, 인덱스 조정
                    i--;
                }
            }
            
            // 유효한 필드인지 검사
            String validProperty = validateSortField(property);
            if (validProperty != null) {
                Sort.Direction dir = "desc".equals(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
                orders.add(new Sort.Order(dir, validProperty));
            }
        }
        
        return orders.isEmpty() ? Sort.by(Sort.Direction.DESC, "createdAt") : Sort.by(orders);
    }

    private boolean isDirection(String param) {
        return param != null && ("asc".equals(param) || "desc".equals(param));
    }

    private String validateSortField(String sortBy) {
        if (sortBy == null || sortBy.trim().isEmpty()) {
            return null;
        }
        
        // 허용된 정렬 필드들
        return switch (sortBy.toLowerCase()) {
            case "createdat", "created_at" -> "createdAt";
            case "updatedat", "updated_at" -> "updatedAt";
            case "status" -> "status";
            case "aligntool", "align_tool" -> "alignTool";
            case "taskid", "task_id" -> "taskId";
            case "userid", "user_id" -> "userId";
            default -> null; // 유효하지 않으면 null 반환
        };
    }

    private Flux<AlignJobDto> streamRealtimeUpdates() {
        return Flux.merge(
                alignJobSink.asFlux()
                    .doOnNext(job -> {
                        if (!"KEEP_ALIVE".equals(job.taskId())) {
                            log.debug("🔥 실시간 업데이트: taskId={}, status={}", 
                                    job.taskId(), job.status());
                        }
                    }),
                Flux.interval(Duration.ofSeconds(15))
                    .map(tick -> AlignJobMapper.createKeepAliveDto())
                    .doOnNext(job -> log.trace("💓 Keep-alive 신호 전송"))
        );
    }
} 