package com.ampersandor.sat.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;


public record PagedResponse<T>(
    @JsonProperty("content") List<T> content,
    @JsonProperty("page") int page,
    @JsonProperty("size") int size,
    @JsonProperty("totalPages") int totalPages,
    @JsonProperty("totalElements") long totalElements,
    @JsonProperty("first") boolean first,
    @JsonProperty("last") boolean last,
    @JsonProperty("numberOfElements") int numberOfElements
) {
    
    public static <T> PagedResponse<T> of(List<T> content, int page, int size, long totalElements) {
        int totalPages = (int) Math.ceil((double) totalElements / size);
        boolean first = page == 1;
        boolean last = page >= totalPages;
        int numberOfElements = content.size();
        
        return new PagedResponse<>(
            content,
            page,
            size,
            totalPages,
            totalElements,
            first,
            last,
            numberOfElements
        );
    }
} 