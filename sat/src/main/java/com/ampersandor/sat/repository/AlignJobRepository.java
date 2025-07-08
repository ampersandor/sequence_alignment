package com.ampersandor.sat.repository;

import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.domain.Pageable;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import com.ampersandor.sat.entity.AlignJob;

public interface AlignJobRepository extends R2dbcRepository<AlignJob, Long>{
    Mono<AlignJob> findByTaskId(String taskId);

    Flux<AlignJob> findBy(Pageable pageable);

}
