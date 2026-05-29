import { Hono, Context, Next } from 'hono';
import { Bindings } from '../types/env.js';
import { InventoryController } from '../controllers/inventoryController.js';
import { authMiddleware, hasRolePermission } from '../middleware/auth.js';

const inventoryRoutes = new Hono<Bindings>();

// Apply Auth Middleware
inventoryRoutes.use('*', authMiddleware);

// Hono compatible Role Middleware
const checkRole = (allowedRoles: string[]) => async (c: Context<Bindings>, next: Next) => {
  const user = c.get('user') as any;
  const hasAccess = allowedRoles.some(role => hasRolePermission(user?.role, role));
  if (!user || !hasAccess) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  await next();
};

// ==========================================
// ROUTES
// ==========================================

inventoryRoutes.get('/', checkRole(['admin', 'manager', 'cashier']), InventoryController.getInventory);
inventoryRoutes.get('/logs', checkRole(['admin', 'manager']), InventoryController.getInventoryLogs);
inventoryRoutes.post('/update', checkRole(['admin', 'manager']), InventoryController.updateInventoryLevel);

export default inventoryRoutes;
