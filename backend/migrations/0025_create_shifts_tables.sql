-- ============================================================================
-- MIGRATION 0025: CREATE SHIFTS AND CASH MOVEMENTS TABLES
-- Description: Tables to store register shifts and cash pay-in/pay-out logs
-- ============================================================================

CREATE TABLE shifts (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id INTEGER NOT NULL, -- Cashier
    register_name TEXT NOT NULL,
    
    start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    
    starting_cash DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cash_sales DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    expected_cash DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    actual_ending_cash DECIMAL(10,2),
    discrepancy DECIMAL(10,2),
    
    status TEXT NOT NULL DEFAULT 'Open', -- 'Open', 'Closed'
    notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE cash_movements (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    
    movement_type TEXT NOT NULL, -- 'pay_in', 'pay_out'
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shift_id) REFERENCES shifts(id)
);

CREATE INDEX idx_shifts_org ON shifts(organization_id);
CREATE INDEX idx_shifts_user ON shifts(user_id);
CREATE INDEX idx_cash_movements_shift ON cash_movements(shift_id);
