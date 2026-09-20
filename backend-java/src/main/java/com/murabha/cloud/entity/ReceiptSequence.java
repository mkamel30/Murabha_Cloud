package com.murabha.cloud.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "receipt_sequences")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptSequence {
    @Id
    @Column(name = "seq_name", length = 50)
    private String seqName;

    @Column(name = "seq_value", nullable = false)
    private Long seqValue;
}
