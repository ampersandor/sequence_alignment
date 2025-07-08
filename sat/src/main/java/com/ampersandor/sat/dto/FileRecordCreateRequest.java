package com.ampersandor.sat.dto;

import java.time.LocalDateTime;

import com.ampersandor.sat.domain.FileType;

public record FileRecordCreateRequest(
    String filename,
    String uniqueFilename,
    LocalDateTime createdAt,
    FileType fileType,
    Long size
) {
}
