-- ============================================================================
-- MIGRATION 0020: CREATE PURCHASE ORDERS TABLE
-- Description: Creates tables for purchasing and procurement, and triggers for stock updates
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    store_id INTEGER,
    po_number TEXT NOT NULL,
    supplier_id INTEGER NOT NULL,
    status TEXT DEFAULT 'Draft', -- Draft, Pending, Received, Cancelled
    expected_date DATE,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Trigger to update updated_at
CREATE TRIGGER IF NOT EXISTS update_purchase_orders_timestamp 
    AFTER UPDATE ON purchase_orders
    FOR EACH ROW
    BEGIN
        UPDATE purchase_orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Trigger to auto-increment stock when PO status changes to 'Received'
CREATE TRIGGER IF NOT EXISTS update_stock_on_po_receive
    AFTER UPDATE OF status ON purchase_orders
    FOR EACH ROW
    WHEN NEW.status = 'Received' AND OLD.status != 'Received'
    BEGIN
        -- We cannot run a FOR loop in SQLite directly to update multiple rows from a join in a single statement 
        -- using just standard triggers if we don't have a specific way.
        -- We will use an UPDATE ... FROM ... if supported, or a correlated subquery.
        -- SQLite >= 3.33 supports UPDATE FROM
        UPDATE products 
        SET stock_quantity = stock_quantity + (
            SELECT sum(quantity) FROM purchase_order_items WHERE po_id = NEW.id AND product_id = products.id
        )
        WHERE id IN (
            SELECT product_id FROM purchase_order_items WHERE po_id = NEW.id
        );
    END;

-- Also if a received PO is cancelled or reverted, we should decrement
CREATE TRIGGER IF NOT EXISTS revert_stock_on_po_unreceive
    AFTER UPDATE OF status ON purchase_orders
    FOR EACH ROW
    WHEN OLD.status = 'Received' AND NEW.status != 'Received'
    BEGIN
        UPDATE products 
        SET stock_quantity = stock_quantity - (
            SELECT sum(quantity) FROM purchase_order_items WHERE po_id = NEW.id AND product_id = products.id
        )
        WHERE id IN (
            SELECT product_id FROM purchase_order_items WHERE po_id = NEW.id
        );
    END;
