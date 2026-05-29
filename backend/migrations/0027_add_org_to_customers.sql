-- ============================================================================
-- MIGRATION 0027: ADD ORGANIZATION_ID TO CUSTOMERS
-- Description: Adds multi-tenant support to customers table
-- ============================================================================

-- Add organization_id column to customers table (allow null temporarily to update existing data)
ALTER TABLE customers ADD COLUMN organization_id INTEGER;

-- Set default organization_id for existing records
UPDATE customers SET organization_id = 1 WHERE organization_id IS NULL;

-- Create index for organization_id
CREATE INDEX idx_customers_org ON customers(organization_id);
