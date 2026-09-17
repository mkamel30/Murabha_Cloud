-- Murabha Cloud V1 Schema: Multi-tenant installment sales and collection platform

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(32),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_operational BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_branch_id ON users(branch_id);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY,
    bk_code VARCHAR(32) NOT NULL,
    customer_type VARCHAR(32) NOT NULL DEFAULT 'عام',
    name VARCHAR(128) NOT NULL,
    phone VARCHAR(32),
    address VARCHAR(255),
    notes TEXT,
    department VARCHAR(64),
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_customer_bk_type UNIQUE (bk_code, customer_type)
);
CREATE INDEX IF NOT EXISTS idx_customer_bk_code ON customers(bk_code);
CREATE INDEX IF NOT EXISTS idx_customer_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customer_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customer_branch_id ON customers(branch_id);

CREATE TABLE IF NOT EXISTS machine_sales (
    id UUID PRIMARY KEY,
    receipt_number VARCHAR(64) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    machine_serial VARCHAR(64) NOT NULL,
    sale_type VARCHAR(32) NOT NULL DEFAULT 'INSTALLMENT',
    total_price NUMERIC(12,2) NOT NULL,
    down_payment NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    down_payment_receipt VARCHAR(64),
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    remaining_amount NUMERIC(12,2) NOT NULL,
    payment_place VARCHAR(64),
    notes TEXT,
    sale_date DATE NOT NULL,
    first_due_date DATE,
    months INTEGER,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    void_reason VARCHAR(255),
    voided_at TIMESTAMP WITH TIME ZONE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sale_customer_id ON machine_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_date ON machine_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sale_status ON machine_sales(status);
CREATE INDEX IF NOT EXISTS idx_sale_serial ON machine_sales(machine_serial);
CREATE INDEX IF NOT EXISTS idx_sale_branch_id ON machine_sales(branch_id);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY,
    receipt_number VARCHAR(64) NOT NULL,
    sale_id UUID NOT NULL REFERENCES machine_sales(id) ON DELETE CASCADE,
    payment_type VARCHAR(32) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    payment_place VARCHAR(64),
    notes TEXT,
    paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_sale_id ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payment_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payment_receipt ON payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payment_branch_id ON payments(branch_id);

CREATE TABLE IF NOT EXISTS installments (
    id UUID PRIMARY KEY,
    sale_id UUID NOT NULL REFERENCES machine_sales(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    installment_no INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    is_waived BOOLEAN NOT NULL DEFAULT false,
    waive_reason VARCHAR(255),
    paid_date DATE,
    receipt_number VARCHAR(64),
    payment_place VARCHAR(64),
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_installment_sale_id ON installments(sale_id);
CREATE INDEX IF NOT EXISTS idx_installment_due_date ON installments(due_date);
CREATE INDEX IF NOT EXISTS idx_installment_is_paid ON installments(is_paid);
CREATE INDEX IF NOT EXISTS idx_installment_payment_id ON installments(payment_id);
CREATE INDEX IF NOT EXISTS idx_installment_branch_id ON installments(branch_id);

CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    logs TEXT NOT NULL DEFAULT '[]',
    next_follow_up DATE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_followup_customer_id ON follow_ups(customer_id);
CREATE INDEX IF NOT EXISTS idx_followup_next_date ON follow_ups(next_follow_up);
CREATE INDEX IF NOT EXISTS idx_followup_is_completed ON follow_ups(is_completed);
CREATE INDEX IF NOT EXISTS idx_followup_branch_id ON follow_ups(branch_id);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(64) PRIMARY KEY,
    value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID,
    username VARCHAR(64),
    role VARCHAR(32),
    branch_id UUID,
    action VARCHAR(64) NOT NULL,
    target_entity VARCHAR(64),
    target_id VARCHAR(64),
    details TEXT,
    ip_address VARCHAR(64),
    user_agent VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_branch_id ON audit_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);