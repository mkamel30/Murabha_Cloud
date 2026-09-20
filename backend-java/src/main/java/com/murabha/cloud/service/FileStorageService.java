package com.murabha.cloud.service;

import com.murabha.cloud.entity.Attachment;
import com.murabha.cloud.repository.AttachmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {
    
    private final AttachmentRepository attachmentRepository;
    private final String uploadDir = "./uploads/";

    public Attachment saveFile(MultipartFile file, String refType, UUID refId, UUID userId) {
        try {
            Path dirPath = Paths.get(uploadDir);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }
            
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            
            String newFileName = UUID.randomUUID().toString() + extension;
            Path filePath = dirPath.resolve(newFileName);
            
            file.transferTo(filePath.toFile());
            
            Attachment attachment = Attachment.builder()
                .referenceType(refType)
                .referenceId(refId)
                .fileName(originalFilename)
                .fileType(file.getContentType())
                .filePath(filePath.toString())
                .uploadedBy(userId)
                .build();
                
            return attachmentRepository.save(attachment);
        } catch (IOException e) {
            throw new RuntimeException("فشل في حفظ الملف", e);
        }
    }
    
    public Attachment getAttachment(UUID id) {
        return attachmentRepository.findById(id).orElseThrow(() -> new RuntimeException("الملف غير موجود"));
    }
}
