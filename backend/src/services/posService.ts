import { Env } from '../types/env.js';

export class PosService {
  private db: D1Database;
  private env: Env;
  private kv: any;

  constructor(env: Env) {
    this.env = env;
    this.db = env.DB;
    this.kv = env.CACHE;
  }

  async getPosInitData(orgId: string) {
    // Run multiple queries in parallel for POS initialization
    const [products, categories, promotions] = await Promise.all([
      this.getProducts(orgId),
      this.getCategories(orgId),
      this.getActivePromotions(orgId)
    ]);

    return {
      products,
      categories,
      promotions,
      timestamp: new Date().toISOString()
    };
  }

  private async getProducts(orgId: string) {
    const query = `
      SELECT id, name, sku, barcode, description, price, 
             category_id, image_url, quantity_on_hand as current_stock,
             track_inventory
      FROM products 
      WHERE organization_id = ? AND status = 'active'
    `;
    const { results } = await this.db.prepare(query).bind(orgId).all();
    return results;
  }

  private async getCategories(orgId: string) {
    const query = `
      SELECT id, name, description, color, parent_id, sort_order
      FROM categories 
      WHERE organization_id = ? AND is_active = 1
      ORDER BY sort_order ASC
    `;
    const { results } = await this.db.prepare(query).bind(orgId).all();
    return results;
  }

  private async getActivePromotions(orgId: string) {
    const now = new Date().toISOString();
    const query = `
      SELECT id, name, type, value, start_date, end_date, 
             min_purchase_amount, conditions
      FROM promotions 
      WHERE organization_id = ? 
        AND is_active = 1 
        AND start_date <= ? 
        AND (end_date >= ? OR end_date IS NULL)
    `;
    const { results } = await this.db.prepare(query).bind(orgId, now, now).all();
    
    // Parse conditions json
    return results.map((promo: any) => ({
      ...promo,
      conditions: promo.conditions ? JSON.parse(promo.conditions) : null
    }));
  }

  async holdCart(orgId: string, cashierId: string, cartData: any) {
    if (!this.kv) throw new Error('KV Cache is not available for holding carts');

    const cartId = cartData.id || `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const key = `held_cart:${orgId}:${cashierId}:${cartId}`;
    
    const payload = {
      ...cartData,
      id: cartId,
      held_at: new Date().toISOString(),
      cashier_id: cashierId
    };

    // Store the cart with a 24-hour expiration (86400 seconds)
    await this.kv.put(key, JSON.stringify(payload), { expirationTtl: 86400 });
    
    return { cart_id: cartId, success: true };
  }

  async getHeldCarts(orgId: string, cashierId: string) {
    if (!this.kv) return [];

    const prefix = `held_cart:${orgId}:${cashierId}:`;
    let cursor: string | undefined;
    const carts = [];

    try {
      do {
        const list = await this.kv.list({ prefix, cursor });
        
        for (const key of list.keys) {
          const data = await this.kv.get(key.name, 'json');
          if (data) {
            carts.push(data);
          }
        }
        cursor = list.cursor;
      } while (cursor);

      // Sort by held_at descending (newest first)
      return carts.sort((a: any, b: any) => 
        new Date(b.held_at).getTime() - new Date(a.held_at).getTime()
      );
    } catch (error) {
      console.warn(`Error fetching held carts for cashier ${cashierId}:`, error);
      return [];
    }
  }

  async deleteHeldCart(orgId: string, cashierId: string, cartId: string) {
    if (!this.kv) return false;
    
    const key = `held_cart:${orgId}:${cashierId}:${cartId}`;
    try {
      await this.kv.delete(key);
      return true;
    } catch (error) {
      console.warn(`Error deleting held cart ${key}:`, error);
      return false;
    }
  }
}
