package com.ampersandor.sat.entity;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import com.ampersandor.sat.domain.AlignTool;
import com.ampersandor.sat.domain.AlignJobStatus;

import java.time.LocalDateTime;

@Getter
@Setter
public class AlignJob {
    @Id
    private Long id;
    private Long userId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private AlignTool alignTool;
    private String options;
    private Long inputFileRecordId;
    private String inputFilePath;
    private AlignJobStatus status;
    private String taskId;
    private Long outputFileRecordId;
    private String errorMessage;
}
