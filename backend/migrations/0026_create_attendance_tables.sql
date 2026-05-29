-- Create attendance_logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER,
    store_id INTEGER,
    staff_id INTEGER NOT NULL,
    clock_in_time DATETIME NOT NULL,
    clock_out_time DATETIME,
    total_hours REAL,
    status TEXT DEFAULT 'Present', -- Present, Late, Half-day
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for quick lookups by staff or date range
CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON attendance_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in ON attendance_logs(clock_in_time);
