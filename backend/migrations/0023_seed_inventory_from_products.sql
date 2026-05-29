-- ============================================================================
-- MIGRATION 0023: SEED INVENTORY
-- Description: Backfill inventory table from existing products table
-- ============================================================================

-- Assuming default organization_id 'org_1' and store_id 1
INSERT INTO inventory (organization_id, store_id, product_id, quantity_on_hand, reorder_point)
SELECT 'org_1', 1, id, stock_quantity, reorder_level
FROM products
WHERE is_active = TRUE AND deleted_at IS NULL;
