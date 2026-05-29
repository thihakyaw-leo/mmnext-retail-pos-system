-- ============================================================================
-- MIGRATION 0022: CREATE INVENTORY TABLES
-- Description: Inventory table and inventory logs for tracking stock levels
-- ============================================================================

-- Inventory table to track stock per store
CREATE TABLE inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    store_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    
    quantity_on_hand INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - reserved_quantity) STORED,
    reorder_point INTEGER DEFAULT 10,
    
    last_count_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(organization_id, store_id, product_id)
);

-- Inventory logs table for audit trail
CREATE TABLE inventory_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    store_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    
    type TEXT NOT NULL, -- 'receive', 'adjustment', 'sale', 'return'
    quantity_change INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    
    reason TEXT,
    reference_id TEXT, -- e.g. order_id, purchase_order_id
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for fast lookups
CREATE INDEX idx_inventory_org_store ON inventory(organization_id, store_id);
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_logs_product ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_user ON inventory_logs(user_id);
CREATE INDEX idx_inventory_logs_org_store ON inventory_logs(organization_id, store_id);
