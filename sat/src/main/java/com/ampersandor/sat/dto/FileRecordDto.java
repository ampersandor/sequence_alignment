package com.ampersandor.sat.dto;

import java.time.LocalDateTime;
import com.ampersandor.sat.domain.FileType;

public record FileRecordDto(
    Long id,
    String filename,
    String uniqueFilename,
    LocalDateTime createdAt,
    FileType fileType,
    Long size
) {
    
}
