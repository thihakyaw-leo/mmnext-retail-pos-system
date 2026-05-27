import { Context } from 'hono';
import { Bindings } from '../types/env.js';

interface StockAdjustment {
  product_id: number;
  store_id: number;
  quantity: number; // positive for adding, negative for removing
}

export class InventoryController {
  
  /**
   * Bulk Update Stock using D1 Batching
   * Takes an array of stock adjustments and applies them in a single database round-trip.
   */
  async bulkUpdateStock(c: Context<Bindings>) {
    try {
      const body = await c.req.json();
      const adjustments: StockAdjustment[] = body.adjustments;

      if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
        return c.json({ error: 'Valid array of adjustments is required.' }, 400);
      }

      // We enforce a reasonable limit to prevent hitting D1 constraints (e.g. max 100 statements per batch)
      if (adjustments.length > 100) {
        return c.json({ error: 'Maximum batch size is 100 items.' }, 400);
      }

      // Prepare the base SQL statement
      // Assuming a simplistic inventory schema:
      // UPDATE inventory SET quantity_on_hand = quantity_on_hand + ? WHERE product_id = ? AND store_id = ?
      const statement = c.env.DB.prepare(`
        UPDATE inventory 
        SET quantity_on_hand = quantity_on_hand + ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = ? AND store_id = ?
      `);

      // Create an array of prepared statements by binding values to each
      const statementsToBatch = adjustments.map(adj => 
        statement.bind(adj.quantity, adj.product_id, adj.store_id)
      );

      // Execute all statements in a single batch
      // This is highly optimized compared to running .run() inside a for loop
      const results = await c.env.DB.batch(statementsToBatch);

      // Calculate how many rows were actually affected across all statements
      let totalUpdated = 0;
      for (const res of results) {
        if (res.meta && res.meta.changes) {
          totalUpdated += res.meta.changes;
        }
      }

      return c.json({
        success: true,
        message: 'Bulk stock update completed successfully.',
        items_processed: adjustments.length,
        items_updated: totalUpdated
      });

    } catch (error: any) {
      console.error('Bulk Update Stock Error:', error);
      return c.json({ 
        error: 'Failed to perform bulk update.',
        details: c.env.ENVIRONMENT === 'development' ? error.message : undefined 
      }, 500);
    }
  }
}
