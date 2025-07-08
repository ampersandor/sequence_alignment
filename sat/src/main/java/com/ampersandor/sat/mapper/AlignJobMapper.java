package com.ampersandor.sat.mapper;

import com.ampersandor.sat.dto.*;
import com.ampersandor.sat.entity.AlignJob;
import com.ampersandor.sat.entity.FileRecord;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Component
public class AlignJobMapper {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    public static AlignJob toAlignJob(AlignJobCreateRequest request, FileRecord fileRecord){
        AlignJob alignJob = new AlignJob();
        alignJob.setUserId(request.userId());
        alignJob.setAlignTool(request.alignTool());
        alignJob.setOptions(request.options());
        alignJob.setCreatedAt(LocalDateTime.now());
        alignJob.setUpdatedAt(LocalDateTime.now());
        alignJob.setInputFileRecordId(fileRecord.getId());
        alignJob.setInputFilePath(fileRecord.getFilename());

        return alignJob;
    }


    public static AlignJobSubmitRequest toAlignJobSubmitRequest(AlignJob alignJob, FileRecord fileRecord) {
        return new AlignJobSubmitRequest(
                alignJob.getAlignTool(),
                alignJob.getOptions(),
                fileRecord.getUniqueFilename()
        );
    }

    public static AlignJobDto toAlignJobDto(AlignJob alignJob) {
        return new AlignJobDto(
                alignJob.getTaskId(),
                alignJob.getUserId(),
                alignJob.getInputFilePath(),
                alignJob.getInputFileRecordId(),
                alignJob.getAlignTool(),
                alignJob.getOptions(),
                alignJob.getCreatedAt().format(FORMATTER),
                alignJob.getUpdatedAt().format(FORMATTER),
                alignJob.getOutputFileRecordId(),
                alignJob.getStatus().getValue(),
                alignJob.getErrorMessage()
        );
    }
    /**
     * Keep-alive용 더미 DTO 생성
     */
    public static AlignJobDto createKeepAliveDto() {
        return new AlignJobDto(
            "KEEP_ALIVE",
            0L,
            null,
            null,
            null,
            null,
            java.time.LocalDateTime.now().format(FORMATTER),
            java.time.LocalDateTime.now().format(FORMATTER),
                null,
            "PENDING",
            "Keep-alive signal"
        );
    }

} 