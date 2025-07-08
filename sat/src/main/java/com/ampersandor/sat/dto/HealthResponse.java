package com.ampersandor.sat.dto;

import java.time.LocalDateTime;

public record HealthResponse(String status,
                           LocalDateTime timestamp,
                           String details) {
} 