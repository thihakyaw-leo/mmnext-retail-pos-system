import { Env } from '../types/env.js';

export interface SyncPayload {
  type: 'SYNC_INVENTORY' | 'SYNC_ORDERS' | 'SYNC_CART' | 'SYNC_PROMOTIONS' | 'SYNC_SETTINGS';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  orgId: string | number;
  storeId?: string | number;
  entityId?: string | number;
  data?: any;
  timestamp?: string;
}

/**
 * Service to handle dispatching live data synchronization events to connected clients.
 * It sends internal HTTP POST requests to the PosDurableObject, which then
 * broadcasts to all connected WebSockets.
 */
export class RealTimeUpdateService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Broadcast a sync event to clients
   */
  async broadcastSync(payload: SyncPayload): Promise<boolean> {
    try {
      if (!payload.timestamp) {
        payload.timestamp = new Date().toISOString();
      }

      // We use a singleton Durable Object for the main store
      // If we move to per-store/org DOs, we would pass the orgId to idFromName
      const id = this.env.POS_DO.idFromName('main-store');
      const stub = this.env.POS_DO.get(id);

      // Create an internal request to trigger the broadcast
      const request = new Request('http://internal/internal/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sync',
          payload
        })
      });

      const response = await stub.fetch(request);
      if (!response.ok) {
        console.error('Failed to broadcast sync event via DO:', await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('Sync dispatch error:', error);
      return false;
    }
  }

  /**
   * Convenience method for Inventory updates
   */
  async syncInventory(orgId: string | number, action: SyncPayload['action'], productId: string | number, data?: any) {
    return this.broadcastSync({
      type: 'SYNC_INVENTORY',
      action,
      orgId,
      entityId: productId,
      data
    });
  }

  /**
   * Convenience method for Order updates (e.g. order status changed, sent to kitchen)
   */
  async syncOrder(orgId: string | number, storeId: string | number, action: SyncPayload['action'], orderId: string | number, data?: any) {
    return this.broadcastSync({
      type: 'SYNC_ORDERS',
      action,
      orgId,
      storeId,
      entityId: orderId,
      data
    });
  }

  /**
   * Convenience method for Settings updates (e.g. tax rates changed)
   */
  async syncSettings(orgId: string | number, action: SyncPayload['action'], data?: any) {
    return this.broadcastSync({
      type: 'SYNC_SETTINGS',
      action,
      orgId,
      data
    });
  }
}
