package com.ampersandor.sat.repository;

import com.ampersandor.sat.entity.FileRecord;

import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface FileRecordRepository extends R2dbcRepository<FileRecord, Long> {
}