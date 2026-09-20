ALTER TABLE customers ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12, 2) DEFAULT 0.0;

ALTER TABLE machine_sales ADD COLUMN IF NOT EXISTS guarantor_name VARCHAR(128);
ALTER TABLE machine_sales ADD COLUMN IF NOT EXISTS guarantor_national_id VARCHAR(32);
ALTER TABLE machine_sales ADD COLUMN IF NOT EXISTS guarantor_phone VARCHAR(32);
ALTER TABLE machine_sales ADD COLUMN IF NOT EXISTS guarantor_relation VARCHAR(64);

CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY,
    reference_type VARCHAR(32) NOT NULL,
    reference_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(64) NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_by UUID,
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_attachments_ref ON attachments(reference_type, reference_id);

INSERT INTO system_settings (key, value, description, updated_at) VALUES 
('enableEarlySettlement', 'true', 'تفعيل السداد المعجل بخصم', CURRENT_TIMESTAMP),
('earlySettlementDiscountPercent', '50', 'نسبة خصم الفوائد عند السداد المعجل', CURRENT_TIMESTAMP),
('requireKycAttachments', 'false', 'إلزامية إرفاق المستندات عند التعاقد', CURRENT_TIMESTAMP),
('requireGuarantor', 'false', 'إلزامية وجود ضامن عند التقسيط', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;
