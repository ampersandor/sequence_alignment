package com.ampersandor.sat.dto;

import com.ampersandor.sat.domain.AlignTool;
import com.fasterxml.jackson.annotation.JsonProperty;

public record AlignJobSubmitRequest(
    @JsonProperty("align_tool") AlignTool alignTool,
    @JsonProperty("options") String options,
    @JsonProperty("input_path") String inputPath
){}
