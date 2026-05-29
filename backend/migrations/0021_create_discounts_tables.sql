-- ============================================================================
-- MIGRATION 0021: CREATE DISCOUNTS TABLES
-- Description: Creates tables for promotions and coupons
-- ============================================================================

CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- percent, fixed, bogo
    value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL, -- percent, fixed
    value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Triggers to update updated_at
CREATE TRIGGER IF NOT EXISTS update_promotions_timestamp 
    AFTER UPDATE ON promotions
    FOR EACH ROW
    BEGIN
        UPDATE promotions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_coupons_timestamp 
    AFTER UPDATE ON coupons
    FOR EACH ROW
    BEGIN
        UPDATE coupons SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
