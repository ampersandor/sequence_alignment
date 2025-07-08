package com.ampersandor.sat.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum FileType {
    INPUT("INPUT"),
    OUTPUT("OUTPUT");
    
    private final String value;
    
    FileType(String value) {
        this.value = value;
    }
    
    @JsonValue
    public String getValue() {
        return value;
    }
} 