package com.ampersandor.sat.dto;

import com.ampersandor.sat.domain.AlignJobStatus;
import com.fasterxml.jackson.annotation.JsonProperty;

public record AlignJobSubmitResponse(
    @JsonProperty("status") AlignJobStatus alignJobStatus,
    @JsonProperty("task_id") String taskId
){}
