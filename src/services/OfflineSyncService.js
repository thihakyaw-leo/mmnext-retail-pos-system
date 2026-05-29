import axiosClient from '../api/axiosClient';
import { notification } from 'antd';

const OFFLINE_ORDERS_KEY = 'mmnext_offline_orders';

class OfflineSyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncing = false;

    // Listen to network status changes
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Attempt initial sync if online
    if (this.isOnline) {
      setTimeout(() => this.syncOrders(), 2000);
    }
  }

  handleOnline() {
    this.isOnline = true;
    notification.success({ 
      message: 'Connection Restored', 
      description: 'You are back online. Syncing pending orders...',
      placement: 'bottomRight'
    });
    this.syncOrders();
  }

  handleOffline() {
    this.isOnline = false;
    notification.warning({ 
      message: 'Connection Lost', 
      description: 'You are offline. Orders will be saved locally and synced later.',
      placement: 'bottomRight',
      duration: 0
    });
  }

  getOfflineOrders() {
    try {
      const orders = localStorage.getItem(OFFLINE_ORDERS_KEY);
      return orders ? JSON.parse(orders) : [];
    } catch (e) {
      return [];
    }
  }

  saveOfflineOrders(orders) {
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(orders));
    // Dispatch an event so UI can update the pending count
    window.dispatchEvent(new Event('offline-orders-updated'));
  }

  async queueOrder(orderData) {
    const orders = this.getOfflineOrders();
    // Add a local timestamp and ID for tracking
    const newOrder = {
      ...orderData,
      _localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      _queuedAt: new Date().toISOString()
    };
    
    orders.push(newOrder);
    this.saveOfflineOrders(orders);
    
    notification.info({
      message: 'Order Saved Offline',
      description: `Order ${orderData.order_number} has been saved locally.`,
      placement: 'bottomRight'
    });
    
    return { success: true, local: true, order: newOrder };
  }

  async syncOrders() {
    if (!this.isOnline || this.syncing) return;
    
    const orders = this.getOfflineOrders();
    if (orders.length === 0) return;
    
    this.syncing = true;
    let syncedCount = 0;
    let failedOrders = [];
    
    for (const order of orders) {
      try {
        // Strip out local tracking properties
        const { _localId, _queuedAt, ...payload } = order;
        
        await axiosClient.post('/orders', payload);
        syncedCount++;
      } catch (error) {
        console.error('Failed to sync order:', error);
        failedOrders.push(order);
      }
    }
    
    this.saveOfflineOrders(failedOrders);
    this.syncing = false;
    
    if (syncedCount > 0) {
      notification.success({
        message: 'Sync Complete',
        description: `Successfully synced ${syncedCount} offline order(s).`,
        placement: 'bottomRight'
      });
    }
    
    if (failedOrders.length > 0) {
      notification.error({
        message: 'Sync Incomplete',
        description: `Failed to sync ${failedOrders.length} order(s). Will try again later.`,
        placement: 'bottomRight'
      });
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
