package com.ampersandor.sat.dto;

import com.ampersandor.sat.domain.AlignTool;
import com.fasterxml.jackson.annotation.JsonProperty;

public record AlignJobDto(
    @JsonProperty("taskId") String taskId,
    @JsonProperty("userID") Long userID,
    @JsonProperty("inputPath") String inputPath,
    @JsonProperty("inputFileRecordId") Long inputFileRecordId,
    @JsonProperty("alignTool") AlignTool alignTool,
    @JsonProperty("options") String options,
    @JsonProperty("createdAt") String createdAt,
    @JsonProperty("updatedAt") String updatedAt,
    @JsonProperty("outputFileRecordId") Long outputFileRecordId,
    @JsonProperty("status") String status, // PENDING, RUNNING, COMPLETED, FAILED
    @JsonProperty("message") String message
) {
} 