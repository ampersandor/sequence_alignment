package com.ampersandor.sat.mapper;

import com.ampersandor.sat.domain.FileType;
import com.ampersandor.sat.dto.AlignJobUpdateRequest;
import org.springframework.stereotype.Component;

import com.ampersandor.sat.dto.FileRecordCreateRequest;
import com.ampersandor.sat.dto.FileRecordUploadResponse;
import com.ampersandor.sat.dto.FileRecordDto;
import com.ampersandor.sat.entity.FileRecord;

import java.time.LocalDateTime;

@Component
public class FileRecordMapper {

    public static FileRecordCreateRequest toFileRecordCreateRequest(AlignJobUpdateRequest updateRequest, FileType fileType){
        return new FileRecordCreateRequest(
                updateRequest.outputFile(),
                updateRequest.outputFile(),
                LocalDateTime.now(),
                fileType,
                0L
        );
    }

    public static FileRecord toFileRecord(FileRecordCreateRequest fileRecordCreateRequest) {
        var fileRecord = new FileRecord();
        fileRecord.setFilename(fileRecordCreateRequest.filename());
        fileRecord.setUniqueFilename(fileRecordCreateRequest.uniqueFilename());
        fileRecord.setCreatedAt(fileRecordCreateRequest.createdAt());
        fileRecord.setFileType(fileRecordCreateRequest.fileType());
        fileRecord.setSize(fileRecordCreateRequest.size());
        return fileRecord;
    }

    public static FileRecordUploadResponse toFileRecordUploadResponse(FileRecord fileRecord) {
        return new FileRecordUploadResponse(
            fileRecord.getId().toString(),
            fileRecord.getFilename(),
            fileRecord.getSize()
        );
    }

    public static FileRecordDto toFileRecordDto(FileRecord fileRecord) {
        return new FileRecordDto(
                fileRecord.getId(),
                fileRecord.getFilename(),
                fileRecord.getUniqueFilename(),
                fileRecord.getCreatedAt(),
                fileRecord.getFileType(),
                fileRecord.getSize()
        );
    }
}
