-- ============================================================================
-- MIGRATION 0028: ADD ORGANIZATION_ID AND MISSING FIELDS TO ORDERS
-- ============================================================================

-- Add organization_id and store_id to orders table
ALTER TABLE orders ADD COLUMN organization_id INTEGER;
ALTER TABLE orders ADD COLUMN store_id INTEGER;

-- Add discount tracking columns
ALTER TABLE orders ADD COLUMN discount_type TEXT;
ALTER TABLE orders ADD COLUMN discount_reason TEXT;

-- Set default values for existing records
UPDATE orders SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE orders SET store_id = 1 WHERE store_id IS NULL;

-- Create indexes for the new columns
CREATE INDEX idx_orders_org ON orders(organization_id);
CREATE INDEX idx_orders_org_store ON orders(organization_id, store_id);
