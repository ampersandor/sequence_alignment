package com.ampersandor.sat.service;

import com.ampersandor.sat.domain.FileType;
import com.ampersandor.sat.dto.FileRecordCreateRequest;
import com.ampersandor.sat.dto.FileRecordDto;
import com.ampersandor.sat.dto.FileRecordUploadResponse;
import com.ampersandor.sat.entity.FileRecord;
import com.ampersandor.sat.exceptions.FileRecordNotFoundException;
import com.ampersandor.sat.mapper.FileRecordMapper;
import com.ampersandor.sat.repository.FileRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileRecordService {

    private final FileRecordRepository fileRecordRepository;
    
    @Value("${data.dir}")
    private String dataDir;

    @Transactional
    public Mono<FileRecord> saveFileRecord(Mono<FileRecordCreateRequest> fileRecordRequest) {
        return fileRecordRequest
                .map(FileRecordMapper::toFileRecord)
                .flatMap(fileRecordRepository::save)
                .doOnSuccess(fileRecord -> log.info("✅ FileRecord 저장 완료: id={}, filename={}", 
                        fileRecord.getId(), fileRecord.getFilename()))
                .doOnError(error -> log.error("❌ FileRecord 저장 실패", error));
    }

    private Mono<FileRecordCreateRequest> saveToStorage(FilePart filePart, Long fileSize) {
        Objects.requireNonNull(filePart, "FilePart는 null일 수 없습니다");
        
        String originalFilename = filePart.filename();
        String uniqueFilename = generateUniqueFilename(originalFilename);
        Path destination = Paths.get(dataDir, uniqueFilename);

        log.debug("💾 파일 저장 시작: {} -> {}", originalFilename, destination);

        return filePart.transferTo(destination)
                .subscribeOn(Schedulers.boundedElastic()) // 파일 I/O를 위한 별도 스레드 풀 사용
                .then(Mono.fromCallable(() -> new FileRecordCreateRequest(
                        originalFilename,
                        uniqueFilename,
                        LocalDateTime.now(),
                        FileType.INPUT,
                        fileSize != null ? fileSize : 0L
                )))
                .doOnSuccess(request -> log.info("✅ 파일 저장 완료: {}", destination))
                .doOnError(error -> log.error("❌ 파일 저장 실패: {}", destination, error));
    }

    @Transactional
    public Mono<FileRecordUploadResponse> uploadFile(Mono<FilePart> filePartMono, ServerHttpRequest request) {
        Long contentLength = request.getHeaders().getContentLength();
        
        return filePartMono
                .flatMap(filePart -> saveToStorage(filePart, contentLength))
                .flatMap(createRequest -> saveFileRecord(Mono.just(createRequest)))
                .map(FileRecordMapper::toFileRecordUploadResponse)
                .doOnSuccess(response -> log.info("✅ 파일 업로드 완료: filename={}, id={}", 
                        response.fileName(), response.fileId()))
                .doOnError(error -> log.error("❌ 파일 업로드 실패", error));
    }

    public Mono<FileRecord> findById(Long id) {
        Objects.requireNonNull(id, "FileRecord ID는 null일 수 없습니다");
        
        return fileRecordRepository.findById(id)
                .switchIfEmpty(Mono.error(new FileRecordNotFoundException(id)))
                .doOnSuccess(fileRecord -> log.debug("📄 FileRecord 조회 성공: id={}, filename={}", 
                        id, fileRecord.getFilename()));
    }

    public Flux<FileRecordDto> findAll() {
        return fileRecordRepository.findAll()
                .map(FileRecordMapper::toFileRecordDto)
                .doOnComplete(() -> log.debug("📋 전체 FileRecord 조회 완료"));
    }

    public Flux<FileRecordDto> findByFileType(FileType fileType) {
        Objects.requireNonNull(fileType, "FileType은 null일 수 없습니다");
        
        return fileRecordRepository.findAll()
                .filter(fileRecord -> fileType.equals(fileRecord.getFileType()))
                .map(FileRecordMapper::toFileRecordDto)
                .doOnNext(dto -> log.debug("📁 FileType {} 파일 조회: {} ({}KB)", 
                        fileType, dto.filename(), dto.size() / 1024))
                .doOnComplete(() -> log.debug("📋 FileType {} 조회 완료", fileType));
    }

    
    private String generateUniqueFilename(String originalFilename) {
        return UUID.randomUUID() + "_" + originalFilename;
    }
}
