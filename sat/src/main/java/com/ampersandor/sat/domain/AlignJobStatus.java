package com.ampersandor.sat.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum AlignJobStatus {
    PENDING("PENDING"),
    RUNNING("RUNNING"),
    SUCCESS("SUCCESS"),
    ERROR("ERROR");
    
    private final String value;
    
    AlignJobStatus(String value) {
        this.value = value;
    }
    
    @JsonValue
    public String getValue() {
        return value;
    }
}
