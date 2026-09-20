package com.murabha.cloud.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReceiptSequenceService {
    private final JdbcTemplate jdbcTemplate;

    public ReceiptSequenceService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long getNextSaleReceiptNumber() {
        jdbcTemplate.update("UPDATE receipt_sequences SET seq_value = seq_value + 1 WHERE seq_name = 'SALE_RECEIPT'");
        return jdbcTemplate.queryForObject("SELECT seq_value FROM receipt_sequences WHERE seq_name = 'SALE_RECEIPT'", Long.class);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long getNextPaymentReceiptNumber() {
        jdbcTemplate.update("UPDATE receipt_sequences SET seq_value = seq_value + 1 WHERE seq_name = 'PAYMENT_RECEIPT'");
        return jdbcTemplate.queryForObject("SELECT seq_value FROM receipt_sequences WHERE seq_name = 'PAYMENT_RECEIPT'", Long.class);
    }
}
