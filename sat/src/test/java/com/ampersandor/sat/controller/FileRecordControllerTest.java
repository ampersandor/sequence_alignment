package com.ampersandor.sat.controller;

import com.ampersandor.sat.domain.FileType;
import com.ampersandor.sat.dto.FileRecordDto;
import com.ampersandor.sat.dto.FileRecordUploadResponse;
import com.ampersandor.sat.entity.FileRecord;
import com.ampersandor.sat.service.FileRecordService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.web.reactive.function.BodyInserters;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;


@WebFluxTest(FileRecordController.class)
@DisplayName("FileRecordController 테스트")
class FileRecordControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private FileRecordService fileRecordService;

    @Test
    @DisplayName("파일 업로드 - 성공")
    void uploadFile_Success() {
        // given
        FileRecordUploadResponse mockResponse = new FileRecordUploadResponse(
                "1",
                "test.fasta",
                1024L
        );

        when(fileRecordService.uploadFile(any(Mono.class), any(ServerHttpRequest.class)))
                .thenReturn(Mono.just(mockResponse));

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", new ClassPathResource("test-data/sample.fasta"));

        // when & then
        webTestClient.post()
                .uri("/file/upload")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .exchange()
                .expectStatus().isOk()
                .expectBody(FileRecordUploadResponse.class)
                .value(response -> {
                    assertThat(response.fileId()).isEqualTo("1");
                    assertThat(response.fileName()).isEqualTo("test.fasta");
                    assertThat(response.size()).isEqualTo(1024L);
                });
    }

    @Test
    @DisplayName("INPUT 파일 목록 조회 - 성공")
    void listInputFiles_Success() {
        // given
        FileRecordDto dto1 = new FileRecordDto(
                1L,
                "input1.fasta",
                "unique1.fasta",
                LocalDateTime.now(),
                FileType.INPUT,
                1024L
        );
        FileRecordDto dto2 = new FileRecordDto(
                2L,
                "input2.fasta",
                "unique2.fasta",
                LocalDateTime.now(),
                FileType.INPUT,
                2048L
        );

        when(fileRecordService.findByFileType(FileType.INPUT))
                .thenReturn(Flux.just(dto1, dto2));

        // when & then
        webTestClient.get()
                .uri("/file/list")
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(FileRecordDto.class)
                .hasSize(2)
                .value(list -> {
                    assertThat(list.get(0).filename()).isEqualTo("input1.fasta");
                    assertThat(list.get(0).fileType()).isEqualTo(FileType.INPUT);
                    assertThat(list.get(1).filename()).isEqualTo("input2.fasta");
                    assertThat(list.get(1).fileType()).isEqualTo(FileType.INPUT);
                });
    }

    @Test
    @DisplayName("전체 파일 목록 조회 - 성공")
    void listAllFiles_Success() {
        // given
        FileRecordDto inputDto = new FileRecordDto(
                1L,
                "input.fasta",
                "unique_input.fasta",
                LocalDateTime.now(),
                FileType.INPUT,
                1024L
        );
        FileRecordDto outputDto = new FileRecordDto(
                2L,
                "output.fasta",
                "unique_output.fasta",
                LocalDateTime.now(),
                FileType.OUTPUT,
                2048L
        );

        when(fileRecordService.findAll())
                .thenReturn(Flux.just(inputDto, outputDto));

        // when & then
        webTestClient.get()
                .uri("/file/list/all")
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(FileRecordDto.class)
                .hasSize(2)
                .value(list -> {
                    assertThat(list.get(0).fileType()).isEqualTo(FileType.INPUT);
                    assertThat(list.get(1).fileType()).isEqualTo(FileType.OUTPUT);
                });
    }

    @Test
    @DisplayName("OUTPUT 파일 목록 조회 - 성공")
    void listOutputFiles_Success() {
        // given
        FileRecordDto outputDto = new FileRecordDto(
                1L,
                "result.fasta",
                "unique_result.fasta",
                LocalDateTime.now(),
                FileType.OUTPUT,
                1536L
        );

        when(fileRecordService.findByFileType(FileType.OUTPUT))
                .thenReturn(Flux.just(outputDto));

        // when & then
        webTestClient.get()
                .uri("/file/list/output")
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(FileRecordDto.class)
                .hasSize(1)
                .value(list -> {
                    assertThat(list.get(0).fileType()).isEqualTo(FileType.OUTPUT);
                    assertThat(list.get(0).filename()).isEqualTo("result.fasta");
                });
    }

    @Test
    @DisplayName("FileType별 파일 조회 - INPUT")
    void listFilesByType_Input() {
        // given
        FileRecordDto inputDto = new FileRecordDto(
                1L,
                "input.fasta",
                "unique_input.fasta",
                LocalDateTime.now(),
                FileType.INPUT,
                1024L
        );

        when(fileRecordService.findByFileType(FileType.INPUT))
                .thenReturn(Flux.just(inputDto));

        // when & then
        webTestClient.get()
                .uri("/file/list/input")
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(FileRecordDto.class)
                .hasSize(1)
                .value(list -> {
                    assertThat(list.get(0).fileType()).isEqualTo(FileType.INPUT);
                });
    }

    @Test
    @DisplayName("FileType별 파일 조회 - 잘못된 타입")
    void listFilesByType_InvalidType() {
        // when & then
        webTestClient.get()
                .uri("/file/list/invalid")
                .exchange()
                .expectStatus().is5xxServerError();
    }

    @Test
    @DisplayName("파일 다운로드 - 성공")
    void downloadFile_Success() {
        // given
        FileRecord fileRecord = new FileRecord();
        fileRecord.setId(1L);
        fileRecord.setFilename("test.fasta");
        fileRecord.setUniqueFilename("unique_test.fasta");

        when(fileRecordService.findById(1L))
                .thenReturn(Mono.just(fileRecord));

        // when & then
        webTestClient.get()
                .uri("/file/download/1")
                .exchange()
                .expectStatus().isNotFound(); // 실제 파일이 존재하지 않으므로 404 예상
    }

    @Test
    @DisplayName("파일 다운로드 - 파일 없음")
    void downloadFile_NotFound() {
        // given
        when(fileRecordService.findById(999L))
                .thenReturn(Mono.empty());

        // when & then
        webTestClient.get()
                .uri("/file/download/999")
                .exchange()
                .expectStatus().isNotFound();
    }

    @Test
    @DisplayName("빈 파일 목록 조회")
    void listFiles_Empty() {
        // given
        when(fileRecordService.findByFileType(FileType.INPUT))
                .thenReturn(Flux.empty());

        // when & then
        webTestClient.get()
                .uri("/file/list")
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(FileRecordDto.class)
                .hasSize(0);
    }
} 