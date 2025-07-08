package com.ampersandor.sat.dto;

import com.ampersandor.sat.domain.AlignJobStatus;
import com.fasterxml.jackson.annotation.JsonProperty;

public record AlignJobUpdateRequest(
    @JsonProperty("task_id") String taskId,
    @JsonProperty("status") AlignJobStatus status,
    @JsonProperty("output_file") String outputFile,
    @JsonProperty("error") String error
) {
}