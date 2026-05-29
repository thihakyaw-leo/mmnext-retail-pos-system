import { Hono, Context, Next } from 'hono';
import { Bindings } from '../types/env.js';
import { OrderController } from '../controllers/orderController.js';
import { authMiddleware, hasRolePermission } from '../middleware/auth.js';

const orders = new Hono<Bindings>();

// Apply Auth Middleware
orders.use('*', authMiddleware);

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

// GET /api/orders - List orders with filters
orders.get('/', checkRole(['admin', 'manager', 'cashier']), OrderController.getOrders);

// GET /api/orders/:id - Get single order details
orders.get('/:id', checkRole(['admin', 'manager', 'cashier']), OrderController.getOrder);

// POST /api/orders - Create new order (POS transaction)
orders.post('/', checkRole(['admin', 'manager', 'cashier']), OrderController.createOrder);

export default orders;
