package com.ampersandor.sat.config;

import com.ampersandor.sat.dto.AlignJobDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import reactor.core.publisher.Sinks;
import reactor.util.concurrent.Queues;


@Slf4j
@Configuration
@EnableTransactionManagement
public class ApplicationConfig {
    

    @Bean
    public Sinks.Many<AlignJobDto> alignJobSink() {
        log.info("🔧 AlignJob Sink 생성: multicast mode (no replay)");
        
        // 백프레셔를 지원하는 멀티캐스트 sink 생성 (replay 없음)
        Sinks.Many<AlignJobDto> sink = Sinks.many()
                .multicast()
                .onBackpressureBuffer(); // 백프레셔 처리를 위한 버퍼 설정
        
        // Sink 에러 처리기 설정
        sink.asFlux()
                .doOnError(error -> log.error("❌ Sink 에러 발생: {}", error.getMessage()))
                .retry(3)
                .subscribe();
        
        return sink;
    }
    

    @Bean
    public Integer defaultBufferSize() {
        return Queues.SMALL_BUFFER_SIZE;
    }
}
