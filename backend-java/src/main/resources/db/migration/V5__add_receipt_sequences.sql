CREATE TABLE receipt_sequences (
    seq_name VARCHAR(50) PRIMARY KEY,
    seq_value BIGINT NOT NULL
);

INSERT INTO receipt_sequences (seq_name, seq_value) VALUES ('SALE_RECEIPT', 1);
INSERT INTO receipt_sequences (seq_name, seq_value) VALUES ('PAYMENT_RECEIPT', 1);
