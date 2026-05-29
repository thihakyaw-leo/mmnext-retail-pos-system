import { Hono } from 'hono';
import { Bindings } from '../types/env.js';
import { PurchasingController } from '../controllers/purchasingController.js';
import { authMiddleware } from '../middleware/auth.js';

const purchasing = new Hono<{ Bindings: Bindings }>();

// Apply auth middleware to all purchasing routes
purchasing.use('*', authMiddleware);

// Suppliers
purchasing.get('/suppliers', PurchasingController.getSuppliers);
purchasing.post('/suppliers', PurchasingController.createSupplier);

// Purchase Orders
purchasing.get('/purchase-orders', PurchasingController.getPurchaseOrders);
purchasing.post('/purchase-orders', PurchasingController.createPurchaseOrder);
purchasing.put('/purchase-orders/:id/status', PurchasingController.updatePurchaseOrderStatus);

export default purchasing;
