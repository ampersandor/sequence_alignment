package com.ampersandor.sat.client;

import com.ampersandor.sat.dto.AlignJobSubmitRequest;
import com.ampersandor.sat.dto.AlignJobSubmitResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.Objects;

@Slf4j
@Component
@RequiredArgsConstructor
public class AlignmentServiceClient {

    private final WebClient client;


    public Mono<AlignJobSubmitResponse> align(AlignJobSubmitRequest request) {
        Objects.requireNonNull(request, "AlignJobSubmitRequest는 null일 수 없습니다");
        
        log.info("🚀 외부 정렬 서비스 호출: tool={}, inputPath={}", 
                request.alignTool(), request.inputPath());
        
        return client.post()
                .uri("/align")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .onStatus(statusCode -> statusCode.is4xxClientError(), clientResponse -> 
                        clientResponse.bodyToMono(String.class)
                                .flatMap(errorBody -> {
                                    log.error("❌ 4xx 클라이언트 오류: status={}, body={}", 
                                            clientResponse.statusCode(), errorBody);
                                    return Mono.error(new WebClientResponseException(
                                            clientResponse.statusCode().value(),
                                            "정렬 서비스 클라이언트 오류: " + errorBody,
                                            null, null, null));
                                })
                )
                .onStatus(statusCode -> statusCode.is5xxServerError(), clientResponse -> 
                        clientResponse.bodyToMono(String.class)
                                .flatMap(errorBody -> {
                                    log.error("❌ 5xx 서버 오류: status={}, body={}", 
                                            clientResponse.statusCode(), errorBody);
                                    return Mono.error(new WebClientResponseException(
                                            clientResponse.statusCode().value(),
                                            "정렬 서비스 서버 오류: " + errorBody,
                                            null, null, null));
                                })
                )
                .bodyToMono(AlignJobSubmitResponse.class)
                .doOnSuccess(response -> log.info("✅ 정렬 작업 제출 성공: taskId={}, status={}", 
                        response.taskId(), response.alignJobStatus()))
                .doOnError(WebClientResponseException.class, error -> 
                        log.error("❌ WebClient 오류: status={}, message={}", 
                                error.getStatusCode(), error.getMessage()))
                .doOnError(error -> !(error instanceof WebClientResponseException),
                        error -> log.error("❌ 예상치 못한 오류: {}", error.getMessage(), error));
    }
}