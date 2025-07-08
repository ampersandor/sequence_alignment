package com.ampersandor.sat.entity;

import lombok.Setter;
import lombok.Getter;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import com.ampersandor.sat.domain.FileType;


@Getter
@Setter
public class FileRecord {
    @Id
    private Long id;
    private String filename;
    private String uniqueFilename;
    private LocalDateTime createdAt;
    private FileType fileType;
    private Long size;
}
