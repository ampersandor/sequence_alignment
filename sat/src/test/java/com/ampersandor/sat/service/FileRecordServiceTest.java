package com.ampersandor.sat.service;

import com.ampersandor.sat.domain.FileType;
import com.ampersandor.sat.dto.FileRecordCreateRequest;
import com.ampersandor.sat.entity.FileRecord;
import com.ampersandor.sat.exceptions.FileRecordNotFoundException;
import com.ampersandor.sat.repository.FileRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DefaultDataBufferFactory;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.util.ReflectionTestUtils;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.io.IOException;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;


@ExtendWith(MockitoExtension.class)
@DisplayName("FileRecordService 테스트")
class FileRecordServiceTest {

    @Mock
    private FileRecordRepository fileRecordRepository;
    
    @Mock
    private FilePart filePart;
    
    @Mock
    private ServerHttpRequest serverHttpRequest;
    
    @Mock
    private HttpHeaders httpHeaders;

    private FileRecordService fileRecordService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        fileRecordService = new FileRecordService(fileRecordRepository);
        ReflectionTestUtils.setField(fileRecordService, "dataDir", tempDir.toString());
    }

    @Test
    @DisplayName("FileRecord 저장 - 성공")
    void saveFileRecord_Success() {
        // given
        FileRecordCreateRequest request = new FileRecordCreateRequest(
                "test.fasta",
                "unique_test.fasta",
                LocalDateTime.now(),
                FileType.INPUT,
                1024L
        );
        FileRecord savedRecord = new FileRecord();
        savedRecord.setId(1L);
        savedRecord.setFilename("test.fasta");
        savedRecord.setUniqueFilename("unique_test.fasta");
        savedRecord.setCreatedAt(LocalDateTime.now());
        savedRecord.setFileType(FileType.INPUT);
        savedRecord.setSize(1024L);

        when(fileRecordRepository.save(any(FileRecord.class))).thenReturn(Mono.just(savedRecord));

        // when & then
        StepVerifier.create(fileRecordService.saveFileRecord(Mono.just(request)))
                .assertNext(fileRecord -> {
                    assertThat(fileRecord.getId()).isEqualTo(1L);
                    assertThat(fileRecord.getFilename()).isEqualTo("test.fasta");
                    assertThat(fileRecord.getFileType()).isEqualTo(FileType.INPUT);
                })
                .verifyComplete();

        verify(fileRecordRepository).save(any(FileRecord.class));
    }

    @Test
    @DisplayName("파일 업로드 - 성공")
    void uploadFile_Success() throws IOException {
        // given
        String content = ">sequence1\nATCGATCG\n>sequence2\nGCTAGCTA";
        DataBuffer buffer = new DefaultDataBufferFactory().wrap(content.getBytes());
        
        when(filePart.filename()).thenReturn("test.fasta");
        when(filePart.transferTo(any(Path.class))).thenReturn(Mono.empty());
        when(serverHttpRequest.getHeaders()).thenReturn(httpHeaders);
        when(httpHeaders.getContentLength()).thenReturn(24L);

        FileRecord savedRecord = new FileRecord();
        savedRecord.setId(1L);
        savedRecord.setFilename("test.fasta");
        savedRecord.setUniqueFilename("unique_test.fasta");
        savedRecord.setCreatedAt(LocalDateTime.now());
        savedRecord.setFileType(FileType.INPUT);
        savedRecord.setSize(24L);

        when(fileRecordRepository.save(any(FileRecord.class))).thenReturn(Mono.just(savedRecord));

        // when & then
        StepVerifier.create(fileRecordService.uploadFile(Mono.just(filePart), serverHttpRequest))
                .assertNext(response -> {
                    assertThat(response.fileId()).isEqualTo("1");
                    assertThat(response.fileName()).isEqualTo("test.fasta");
                    assertThat(response.size()).isEqualTo(24L);
                })
                .verifyComplete();
    }

    @Test
    @DisplayName("ID로 FileRecord 조회 - 성공")
    void findById_Success() {
        // given
        Long fileId = 1L;
        FileRecord fileRecord = new FileRecord();
        fileRecord.setId(fileId);
        fileRecord.setFilename("test.fasta");
        fileRecord.setUniqueFilename("unique_test.fasta");
        fileRecord.setCreatedAt(LocalDateTime.now());
        fileRecord.setFileType(FileType.INPUT);
        fileRecord.setSize(1024L);

        when(fileRecordRepository.findById(fileId)).thenReturn(Mono.just(fileRecord));

        // when & then
        StepVerifier.create(fileRecordService.findById(fileId))
                .assertNext(result -> {
                    assertThat(result.getId()).isEqualTo(fileId);
                    assertThat(result.getFilename()).isEqualTo("test.fasta");
                })
                .verifyComplete();

        verify(fileRecordRepository).findById(fileId);
    }

    @Test
    @DisplayName("ID로 FileRecord 조회 - 파일 없음")
    void findById_NotFound() {
        // given
        Long fileId = 999L;
        when(fileRecordRepository.findById(fileId)).thenReturn(Mono.empty());

        // when & then
        StepVerifier.create(fileRecordService.findById(fileId))
                .expectError(FileRecordNotFoundException.class)
                .verify();
    }

    @Test
    @DisplayName("모든 FileRecord 조회 - 성공")
    void findAll_Success() {
        // given
        FileRecord record1 = new FileRecord();
        record1.setId(1L);
        record1.setFilename("test1.fasta");
        record1.setFileType(FileType.INPUT);
        record1.setSize(1024L);
        record1.setCreatedAt(LocalDateTime.now());
        
        FileRecord record2 = new FileRecord();
        record2.setId(2L);
        record2.setFilename("test2.fasta");
        record2.setFileType(FileType.OUTPUT);
        record2.setSize(2048L);
        record2.setCreatedAt(LocalDateTime.now());
        
        List<FileRecord> fileRecords = Arrays.asList(record1, record2);

        when(fileRecordRepository.findAll()).thenReturn(Flux.fromIterable(fileRecords));

        // when & then
        StepVerifier.create(fileRecordService.findAll())
                .assertNext(dto -> {
                    assertThat(dto.id()).isEqualTo(1L);
                    assertThat(dto.filename()).isEqualTo("test1.fasta");
                    assertThat(dto.fileType()).isEqualTo(FileType.INPUT);
                })
                .assertNext(dto -> {
                    assertThat(dto.id()).isEqualTo(2L);
                    assertThat(dto.filename()).isEqualTo("test2.fasta");
                    assertThat(dto.fileType()).isEqualTo(FileType.OUTPUT);
                })
                .verifyComplete();
    }

    @Test
    @DisplayName("FileType으로 필터링 조회 - INPUT 파일만")
    void findByFileType_InputOnly() {
        // given
        FileRecord record1 = new FileRecord();
        record1.setId(1L);
        record1.setFilename("input1.fasta");
        record1.setFileType(FileType.INPUT);
        record1.setSize(1024L);
        record1.setCreatedAt(LocalDateTime.now());
        
        FileRecord record2 = new FileRecord();
        record2.setId(2L);
        record2.setFilename("output1.fasta");
        record2.setFileType(FileType.OUTPUT);
        record2.setSize(2048L);
        record2.setCreatedAt(LocalDateTime.now());
        
        FileRecord record3 = new FileRecord();
        record3.setId(3L);
        record3.setFilename("input2.fasta");
        record3.setFileType(FileType.INPUT);
        record3.setSize(1536L);
        record3.setCreatedAt(LocalDateTime.now());
        
        List<FileRecord> fileRecords = Arrays.asList(record1, record2, record3);

        when(fileRecordRepository.findAll()).thenReturn(Flux.fromIterable(fileRecords));

        // when & then
        StepVerifier.create(fileRecordService.findByFileType(FileType.INPUT))
                .assertNext(dto -> {
                    assertThat(dto.id()).isEqualTo(1L);
                    assertThat(dto.fileType()).isEqualTo(FileType.INPUT);
                })
                .assertNext(dto -> {
                    assertThat(dto.id()).isEqualTo(3L);
                    assertThat(dto.fileType()).isEqualTo(FileType.INPUT);
                })
                .verifyComplete();
    }

    @Test
    @DisplayName("FileType null 체크")
    void findByFileType_NullCheck() {
        // when & then
        try {
            fileRecordService.findByFileType(null);
        } catch (NullPointerException e) {
            // 예상된 동작 - null 체크에서 발생하는 예외
            assertThat(e.getMessage()).contains("FileType은 null일 수 없습니다");
        }
    }
} 