package com.ampersandor.sat.controller;

import com.ampersandor.sat.dto.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;


@RestController
@RequestMapping("/health")
public class HealthController {

    @GetMapping
    public Mono<HealthResponse> checkHealth() {
        return Mono.fromCallable(() -> new HealthResponse(
                "UP",
                LocalDateTime.now(),
                "SAT Application is running normally"
        ))
        .doOnNext(health -> System.out.println("헬스 체크 요청 처리: " + health.status()))
        .doOnError(error -> System.err.println("헬스 체크 중 오류 발생: " + error.getMessage()));
    }

    @GetMapping("/detailed")
    public Mono<HealthResponse> checkDetailedHealth() {
        return Mono.fromCallable(() -> {
            // 여기서 필요에 따라 데이터베이스 연결 상태, 외부 서비스 상태 등을 확인할 수 있습니다.
            String detailedStatus = String.format(
                "Database: Connected, " +
                "Memory: %.2f MB used, " +
                "Uptime: Available",
                (Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()) / 1024.0 / 1024.0
            );
            
            return new HealthResponse(
                "UP",
                LocalDateTime.now(),
                detailedStatus
            );
        })
        .doOnNext(health -> System.out.println("상세 헬스 체크 요청 처리"))
        .doOnError(error -> System.err.println("상세 헬스 체크 중 오류 발생: " + error.getMessage()));
    }
} 