package com.ampersandor.sat.controller;

import com.ampersandor.sat.dto.FileRecordDto;
import com.ampersandor.sat.dto.FileRecordUploadResponse;
import com.ampersandor.sat.exceptions.ApplicationExceptions;
import com.ampersandor.sat.service.FileRecordService;
import com.ampersandor.sat.domain.FileType;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.core.io.buffer.DefaultDataBufferFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.bind.annotation.*;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import lombok.extern.slf4j.Slf4j;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.Files;

@Slf4j
@RestController
@RequestMapping("file")
public class FileRecordController {

    private final FileRecordService fileRecordService;
    private final String dataDir;
    private final int downloadBufferSize;

    public FileRecordController(FileRecordService fileRecordService, 
                              @Value("${data.dir}") String dataDir,
                              @Value("${app.download.buffer-size:32768}") int downloadBufferSize){
        this.fileRecordService = fileRecordService;
        this.dataDir = dataDir;
        this.downloadBufferSize = downloadBufferSize;
    }

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public Mono<ResponseEntity<FileRecordUploadResponse>> uploadFile(
            @RequestPart("file") Mono<FilePart> filePartMono,
            ServerHttpRequest request) {

        log.info("API: 파일 업로드 요청 수신");

        return this.fileRecordService.uploadFile(filePartMono, request)
                .map(ResponseEntity::ok)
                .doOnSuccess(response -> log.info("API: 파일 업로드 완료 - ID={}",
                        response.getBody().fileId()))
                .doOnError(error -> log.error("API: 파일 업로드 실패", error))
                .onErrorReturn(ResponseEntity.badRequest().build());
    }

    @GetMapping("/list")
    public Flux<FileRecordDto> listInputFiles() {
        log.info("INPUT 파일 목록 조회 요청");
        return fileRecordService.findByFileType(FileType.INPUT)
                .doOnNext(dto -> log.debug("INPUT 파일: {} (ID: {})", dto.filename(), dto.id()));
    }


    @GetMapping("/list/all")
    public Flux<FileRecordDto> listAllFiles() {
        log.info("전체 파일 목록 조회 요청");
        return fileRecordService.findAll()
                .doOnNext(dto -> log.debug("파일: {} (ID: {}, Type: {})", 
                    dto.filename(), dto.id(), dto.fileType()));
    }


    @GetMapping("/list/output")
    public Flux<FileRecordDto> listOutputFiles() {
        log.info("OUTPUT 파일 목록 조회 요청");
        return fileRecordService.findByFileType(FileType.OUTPUT)
                .doOnNext(dto -> log.debug("OUTPUT 파일: {} (ID: {})", dto.filename(), dto.id()));
    }


    @GetMapping("/list/{fileType}")
    public Flux<FileRecordDto> listFilesByType(@PathVariable String fileType) {
        log.info("FileType {} 파일 목록 조회 요청", fileType);
        
        try {
            FileType type = FileType.valueOf(fileType.toUpperCase());
            return fileRecordService.findByFileType(type)
                    .doOnNext(dto -> log.debug("{} 파일: {} (ID: {})", 
                        type, dto.filename(), dto.id()));
        } catch (IllegalArgumentException e) {
            log.error("잘못된 fileType: {}", fileType);
            return Flux.error(new IllegalArgumentException("잘못된 fileType: " + fileType + ". INPUT 또는 OUTPUT을 사용하세요."));
        }
    }


    @GetMapping("/download/{fileId}")
    public Mono<Void> downloadFile(@PathVariable Long fileId, ServerHttpResponse response) {
        log.info("파일 다운로드 요청: fileId={}", fileId);
        
        return fileRecordService.findById(fileId)
                .switchIfEmpty(ApplicationExceptions.fileRecordNotFound(fileId))
                .flatMap(fileRecord -> {
                    Path filePath = Paths.get(dataDir, fileRecord.getUniqueFilename());
                    
                    if (!Files.exists(filePath)) {
                        log.error("파일이 존재하지 않습니다: {}", filePath);
                        response.setStatusCode(org.springframework.http.HttpStatus.NOT_FOUND);
                        return response.setComplete();
                    }
                    
                    long fileSize;
                    try {
                        fileSize = Files.size(filePath);
                    } catch (Exception e) {
                        log.error("파일 크기를 가져올 수 없습니다: {}", filePath, e);
                        response.setStatusCode(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR);
                        return response.setComplete();
                    }
                    
                    response.getHeaders().set(HttpHeaders.CONTENT_DISPOSITION, 
                                             "attachment; filename=\"" + fileRecord.getFilename() + "\"");
                    response.getHeaders().setContentType(MediaType.APPLICATION_OCTET_STREAM);
                    response.getHeaders().setContentLength(fileSize);
                    
                    Flux<DataBuffer> dataBufferFlux = DataBufferUtils.read(
                            filePath, 
                            new DefaultDataBufferFactory(), 
                            downloadBufferSize  // 버퍼 크기: 32KB
                    )
                    .doOnDiscard(DataBuffer.class, DataBufferUtils::release); // 메모리 누수 방지
                    
                    return response.writeWith(dataBufferFlux)
                            .doFinally(signal -> log.info("파일 다운로드 완료: fileId={}, signal={}", fileId, signal))
                            .doOnError(error -> log.error("파일 다운로드 중 오류 발생: fileId={}", fileId, error));
                })
                .doOnError(error -> log.error("파일 다운로드 처리 중 오류: fileId={}", fileId, error))
                .then();
    }

    
}
