package com.ampersandor.sat.dto;

import com.ampersandor.sat.domain.AlignTool;
import com.fasterxml.jackson.annotation.JsonProperty;

public record AlignJobCreateRequest(
        @JsonProperty("user_id") Long userId,
        @JsonProperty("align_tool") AlignTool alignTool,
        @JsonProperty("options") String options) {
}
