package com.murabha.cloud.controller;

import com.murabha.cloud.entity.Attachment;
import com.murabha.cloud.security.SecurityUtils;
import com.murabha.cloud.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Attachment> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("refType") String refType,
            @RequestParam("refId") UUID refId) {
        java.util.UUID userId = SecurityUtils.getCurrentUser() != null ? SecurityUtils.getCurrentUser().getId() : null;
        return ResponseEntity.ok(fileStorageService.saveFile(file, refType, refId, userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> getFile(@PathVariable UUID id) {
        try {
            Attachment attachment = fileStorageService.getAttachment(id);
            Path path = Paths.get(attachment.getFilePath());
            Resource resource = new UrlResource(path.toUri());
            
            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + attachment.getFileName() + "\"")
                        .contentType(MediaType.parseMediaType(attachment.getFileType()))
                        .body(resource);
            } else {
                throw new RuntimeException("لا يمكن قراءة الملف");
            }
        } catch (Exception e) {
            throw new RuntimeException("خطأ في تحميل الملف", e);
        }
    }
}
