package com.ampersandor.sat.exceptions;

import reactor.core.publisher.Mono;

public class ApplicationExceptions {

    public static <T> Mono<T> fileRecordNotFound(Long id) {
        return Mono.error(new FileRecordNotFoundException(id));
    }
}
