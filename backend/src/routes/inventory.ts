import { Hono } from 'hono';
import { InventoryController } from '../controllers/inventoryController.js';
import { Bindings } from '../types/env.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';

const inventoryRoutes = new Hono<Bindings>();
const inventoryController = new InventoryController();

// Use authentication for all inventory routes
// (Actually already applied globally in index.ts for protectedApi, but doing it here just to be explicit or if we change mounts later)
// Wait, since protectedApi handles auth, we'll just define the route.

// We will add RBAC to ensure only managers or admins can bulk update stock
inventoryRoutes.post(
  '/bulk-update', 
  rbacMiddleware(['admin', 'manager']), 
  (c) => inventoryController.bulkUpdateStock(c)
);

export default inventoryRoutes;
