package com.murabha.cloud.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkImportResultDto {
    private int totalRows;
    private int successCount;
    private int errorCount;
    @Builder.Default
    private List<String> errors = new ArrayList<>();
    @Builder.Default
    private List<String> createdItems = new ArrayList<>();
}