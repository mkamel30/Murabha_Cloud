-- V4: Installment requests and notifications tables

CREATE TABLE IF NOT EXISTS installment_requests (
    id UUID PRIMARY KEY,
    request_number VARCHAR(64) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    machine_serial VARCHAR(64) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    down_payment NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    months INTEGER NOT NULL,
    installment_amount NUMERIC(12,2),
    payment_place VARCHAR(64),
    notes TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_SUPERVISOR',
    rejection_reason TEXT,
    approval_history TEXT NOT NULL DEFAULT '[]',
    down_payment_receipt VARCHAR(64),
    sale_id UUID,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    requested_by_user_name VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_req_number ON installment_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_req_branch_id ON installment_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_req_status ON installment_requests(status);
CREATE INDEX IF NOT EXISTS idx_req_customer_id ON installment_requests(customer_id);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    user_id UUID,
    branch_id UUID,
    target_role VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(64) NOT NULL DEFAULT 'NEW_REQUEST',
    action_url VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notif_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_branch_id ON notifications(branch_id);
CREATE INDEX IF NOT EXISTS idx_notif_is_read ON notifications(is_read);
