-- ============================================================================
-- MIGRATION 0029: ADD ORGANIZATION_ID TO PRODUCTS TABLE
-- ============================================================================

ALTER TABLE products ADD COLUMN organization_id INTEGER;

-- Set default organization_id for existing records
UPDATE products SET organization_id = 1 WHERE organization_id IS NULL;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
