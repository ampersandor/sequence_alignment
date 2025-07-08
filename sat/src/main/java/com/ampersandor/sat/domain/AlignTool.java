package com.ampersandor.sat.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum AlignTool {
    mafft("mafft"),
    uclust("uclust"), 
    vsearch("vsearch");
    
    private final String value;
    
    AlignTool(String value) {
        this.value = value;
    }
    
    @JsonValue
    public String getValue() {
        return value;
    }
}