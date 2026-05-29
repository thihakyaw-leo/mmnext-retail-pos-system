-- ============================================================================
-- MIGRATION 0024: CREATE PAYROLL TABLES
-- Description: Tables to store payroll runs and individual payslips
-- ============================================================================

CREATE TABLE payroll_runs (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    total_employees INTEGER NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Approved', 'Paid'
    notes TEXT,
    processed_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE payroll_slips (
    id TEXT PRIMARY KEY,
    payroll_run_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    staff_id INTEGER NOT NULL,
    
    base_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    commission DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    allowances DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    deductions DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    net_pay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Paid'
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id),
    FOREIGN KEY (staff_id) REFERENCES users(id)
);

CREATE INDEX idx_payroll_runs_org ON payroll_runs(organization_id);
CREATE INDEX idx_payroll_slips_run ON payroll_slips(payroll_run_id);
CREATE INDEX idx_payroll_slips_staff ON payroll_slips(staff_id);
