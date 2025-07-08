package com.ampersandor.sat;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import reactor.core.publisher.Sinks;
import com.ampersandor.sat.dto.AlignJobDto;

@TestConfiguration
public class SatApplicationTestConfiguration {

    @Bean
    @Primary
    public Sinks.Many<AlignJobDto> testAlignJobSink() {
        return Sinks.many().multicast().onBackpressureBuffer();
    }
} 