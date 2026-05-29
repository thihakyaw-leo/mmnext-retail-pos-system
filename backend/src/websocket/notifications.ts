import { Env } from '../types/env.js';

export interface NotificationPayload {
  type: 'NEW_ORDER' | 'LOW_STOCK' | 'SYSTEM_ALERT' | 'ACHIEVEMENT_UNLOCKED' | string;
  title: string;
  message: string;
  data?: any;
  targetOrgId?: string | number;
  targetUserId?: string | number;
  targetRoles?: string[];
  createdAt?: string;
}

/**
 * Service to handle dispatching real-time notifications to connected clients.
 * It sends internal HTTP POST requests to the PosDurableObject, which then
 * broadcasts to all connected WebSockets.
 */
export class NotificationService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Broadcast a notification to clients
   */
  async send(payload: NotificationPayload): Promise<boolean> {
    try {
      if (!payload.createdAt) {
        payload.createdAt = new Date().toISOString();
      }

      // We use a singleton Durable Object for the main store
      // If we move to per-store/org DOs, we would pass the orgId to idFromName
      const id = this.env.POS_DO.idFromName('main-store');
      const stub = this.env.POS_DO.get(id);

      // Create an internal request to trigger the broadcast
      // We use a dummy local URL because it's a direct stub fetch
      const request = new Request('http://internal/internal/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'notification',
          payload
        })
      });

      const response = await stub.fetch(request);
      if (!response.ok) {
        console.error('Failed to send notification via DO:', await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('Notification dispatch error:', error);
      return false;
    }
  }

  /**
   * Convenience method for Gamification events
   */
  async sendAchievementUnlocked(orgId: string | number, userId: string | number, badgeName: string) {
    return this.send({
      type: 'ACHIEVEMENT_UNLOCKED',
      title: 'Achievement Unlocked!',
      message: `Congratulations! You have earned the "${badgeName}" badge.`,
      targetOrgId: orgId,
      targetUserId: userId,
      data: { badgeName }
    });
  }

  /**
   * Convenience method for Inventory alerts
   */
  async sendLowStockAlert(orgId: string | number, productName: string, remainingQuantity: number) {
    return this.send({
      type: 'LOW_STOCK',
      title: 'Low Stock Alert',
      message: `${productName} is running low. Only ${remainingQuantity} left in stock.`,
      targetOrgId: orgId,
      targetRoles: ['admin', 'manager'],
      data: { productName, remainingQuantity }
    });
  }
}
