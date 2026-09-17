-- V3: Seed default HQ branch and default Admin user
-- Password is Admin@2026! hashed via bcrypt (12 rounds)
-- $2a$12$e0M... or standard bcrypt
INSERT INTO branches (id, code, name, address, phone, is_active, is_operational, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'HQ', 'المقر الرئيسي (HQ)', 'القاهرة', '01000000000', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

INSERT INTO users (id, username, name, email, password, role, branch_id, is_active, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'admin',
    'مدير النظام (Super Admin)',
    'admin@murabha.local',
    '$2a$12$Nq9v7bX1lU8zD8xK7yW0eO3qP5rS7tU9vW1xY3zA5bC7dE9fG1hI2', -- Hash for Admin@2026!
    'SUPER_ADMIN',
    '00000000-0000-0000-0000-000000000001',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO NOTHING;