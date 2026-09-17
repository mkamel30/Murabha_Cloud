-- V2: Seed default system settings
INSERT INTO system_settings (key, value, description, updated_at) VALUES 
('enableCashSales', 'false', 'تفعيل ميزة البيع النقدي (الكاش)', CURRENT_TIMESTAMP),
('paymentPlaces', '["Damen", "البريد", "البنك"]', 'أماكن وقنوات الدفع المعتمدة', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;