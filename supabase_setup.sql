-- =============================================================================
-- JSK Fishers — Supabase Database Setup Script
-- Copy and paste this ENTIRE script into the Supabase SQL Editor and click RUN.
-- It will set up all tables, triggers, indexes, and initial admin/staff users.
-- =============================================================================

-- 1. Drop existing tables if re-running
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bill_items CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS fish_items CASCADE;
DROP TABLE IF EXISTS parties CASCADE;
DROP TABLE IF EXISTS business_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('ADMIN', 'STAFF')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create Business Settings Table
CREATE TABLE business_settings (
    id SERIAL PRIMARY KEY,
    business_name VARCHAR(200) NOT NULL DEFAULT 'JSK Fishers',
    address TEXT DEFAULT 'Kanhangad Fish Market',
    city VARCHAR(100) DEFAULT 'Kasaragod',
    state VARCHAR(100) DEFAULT 'Kerala',
    phone VARCHAR(20) DEFAULT '+91 9876543210',
    email VARCHAR(100) DEFAULT 'jsk@fishmarket.com',
    gst_number VARCHAR(20) DEFAULT '32AABCF1234B1Z5',
    logo_url TEXT,
    footer_text VARCHAR(500) DEFAULT 'HAVE A NICE DAY!',
    starting_bill_number INTEGER DEFAULT 17950,
    current_bill_number INTEGER DEFAULT 17955,
    bill_prefix VARCHAR(10) DEFAULT '',
    invoice_prefix VARCHAR(10) DEFAULT 'INV',
    default_payment_method VARCHAR(20) DEFAULT 'Cash',
    default_commission NUMERIC(12,2) DEFAULT 0,
    default_vehicle_rent NUMERIC(12,2) DEFAULT 0,
    default_unloading NUMERIC(12,2) DEFAULT 0,
    calculation_method VARCHAR(20) DEFAULT 'BOX_RATE',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create Parties Table
CREATE TABLE parties (
    id SERIAL PRIMARY KEY,
    party_code VARCHAR(30) UNIQUE,
    party_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    gst_number VARCHAR(20),
    opening_balance NUMERIC(15,2) DEFAULT 0,
    current_balance NUMERIC(15,2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create Fish Items Table
CREATE TABLE fish_items (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(30) UNIQUE,
    name VARCHAR(200) NOT NULL,
    default_rate NUMERIC(12,2),
    unit VARCHAR(20) DEFAULT 'Box',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create Bills Table
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    bill_number INTEGER UNIQUE NOT NULL,
    invoice_number VARCHAR(50) UNIQUE,
    party_id INTEGER NOT NULL REFERENCES parties(id),
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    gross_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    commission NUMERIC(12,2) DEFAULT 0,
    vehicle_rent NUMERIC(12,2) DEFAULT 0,
    unloading NUMERIC(12,2) DEFAULT 0,
    total_expenses NUMERIC(12,2) DEFAULT 0,
    net_amount NUMERIC(15,2) DEFAULT 0,
    old_balance NUMERIC(15,2) DEFAULT 0,
    total_due NUMERIC(15,2) DEFAULT 0,
    paid_amount NUMERIC(15,2) DEFAULT 0,
    balance NUMERIC(15,2) DEFAULT 0,
    payment_method VARCHAR(30) DEFAULT 'Cash',
    status VARCHAR(10) DEFAULT 'DUE' CHECK (status IN ('PAID', 'PARTIAL', 'DUE', 'VOID')),
    notes TEXT,
    void_reason TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Create Bill Items Table
CREATE TABLE bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    fish_item_id INTEGER REFERENCES fish_items(id),
    item_name VARCHAR(200) NOT NULL,
    box NUMERIC(10,2) DEFAULT 0,
    quantity NUMERIC(10,2) DEFAULT 0,
    rate NUMERIC(12,2) NOT NULL,
    total NUMERIC(15,2) NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- 8. Create Payments Table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    payment_code VARCHAR(30) UNIQUE,
    party_id INTEGER NOT NULL REFERENCES parties(id),
    bill_id INTEGER REFERENCES bills(id),
    amount NUMERIC(15,2) NOT NULL,
    payment_method VARCHAR(30) DEFAULT 'Cash',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    is_void BOOLEAN DEFAULT FALSE,
    void_reason TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. Create Ledger Entries Table
CREATE TABLE ledger_entries (
    id SERIAL PRIMARY KEY,
    party_id INTEGER NOT NULL REFERENCES parties(id),
    bill_id INTEGER REFERENCES bills(id),
    payment_id INTEGER REFERENCES payments(id),
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('BILL', 'PAYMENT', 'ADJUSTMENT', 'OPENING', 'VOID')),
    debit NUMERIC(15,2) DEFAULT 0,
    credit NUMERIC(15,2) DEFAULT 0,
    running_balance NUMERIC(15,2) DEFAULT 0,
    description TEXT,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference VARCHAR(100),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Create Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. Performance Indexes
CREATE INDEX idx_bills_party_id ON bills(party_id);
CREATE INDEX idx_bills_bill_date ON bills(bill_date);
CREATE INDEX idx_bills_bill_number ON bills(bill_number);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX idx_payments_party_id ON payments(party_id);
CREATE INDEX idx_payments_bill_id ON payments(bill_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_ledger_party_id ON ledger_entries(party_id);
CREATE INDEX idx_ledger_entry_date ON ledger_entries(entry_date);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- 12. Auto Update Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_parties_updated_at BEFORE UPDATE ON parties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fish_items_updated_at BEFORE UPDATE ON fish_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON business_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED INITIAL DATA (Users, Settings, Fish Catalog, Sample Parties)
-- =============================================================================

-- Default Business Settings
INSERT INTO business_settings (
    id, business_name, address, city, state, phone, email, gst_number,
    footer_text, starting_bill_number, current_bill_number, bill_prefix, invoice_prefix, default_payment_method
) VALUES (
    1, 'JSK Fishers', 'Kanhangad Fish Market', 'Kasaragod', 'Kerala', '+91 9876543210',
    'jsk@fishmarket.com', '32AABCF1234B1Z5', 'HAVE A NICE DAY!', 17950, 17955, '', 'INV', 'Cash'
) ON CONFLICT (id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    address = EXCLUDED.address,
    current_bill_number = EXCLUDED.current_bill_number;

-- Default Users:
-- admin / admin123
-- staff / staff123
INSERT INTO users (username, password_hash, full_name, role) VALUES
    ('admin', '$2b$10$5m7NqcRWLtk3knDmL2opYOdU/79y5YDmUmybZ.j4k.95JtijuGZcm', 'Administrator', 'ADMIN'),
    ('staff', '$2b$10$8mxQ4ojNnXcVy23lkxv6E.LM8KUosdOriqfD3QFss0QCgSnQxNQ2W', 'Staff Member', 'STAFF')
ON CONFLICT (username) DO NOTHING;

-- Fish Catalog
INSERT INTO fish_items (item_code, name, default_rate, unit) VALUES
    ('MATHI', 'MATHI (Sardine)', 3500, 'Box'),
    ('AYALA', 'AYALA (Mackerel)', 4200, 'Box'),
    ('CHOORA', 'CHOORA (Tuna)', 5500, 'Box'),
    ('KILIMEEN', 'KILIMEEN', 3200, 'Box'),
    ('HAMOUR', 'HAMOUR', 8000, 'Box'),
    ('PRAWNS', 'PRAWNS', 12000, 'Box'),
    ('SQUID', 'SQUID', 6500, 'Box'),
    ('POMFRET', 'POMFRET (Vatta)', 9500, 'Box'),
    ('NETHOLI', 'NETHOLI (Anchovy)', 2800, 'Box'),
    ('KUTTOLI', 'KUTTOLI', 3100, 'Box'),
    ('SANKARA', 'SANKARA (Red Snapper)', 7500, 'Box'),
    ('CHALA', 'CHALA (Herring)', 2500, 'Box')
ON CONFLICT (item_code) DO NOTHING;

-- Initial Parties
INSERT INTO parties (party_code, party_name, phone, address, opening_balance, current_balance) VALUES
    ('MPM001', 'M P M KZD Traders', '+91 9876501001', 'Kozhikode, Kerala', 30000, 29900),
    ('KFT002', 'Kadalundi Fish Traders', '+91 9876501002', 'Kadalundi, Kerala', 0, 45200),
    ('BME003', 'Beypore Marine Exports', '+91 9876501003', 'Beypore, Kerala', 15000, 15000),
    ('PSF004', 'Puthiyappa Sea Foods', '+91 9876501004', 'Puthiyappa, Kozhikode', 0, 72300),
    ('CFF005', 'Chaliyam Fresh Fish', '+91 9876501005', 'Chaliyam, Kerala', 5000, 18500),
    ('VBM006', 'Valanchery Bay Merchants', '+91 9876501006', 'Valanchery, Kerala', 0, 0),
    ('PKT007', 'Parappanangadi Kuttans', '+91 9876501007', 'Parappanangadi, Kerala', 0, 31200)
ON CONFLICT (party_code) DO NOTHING;

SELECT '✅ JSK Fishers Supabase Database Initialized Successfully!' AS status;

