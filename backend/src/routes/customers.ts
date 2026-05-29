import { Hono, Context, Next } from 'hono';
import { Bindings } from '../types/env.js';
import { CustomerController } from '../controllers/customerController.js';
import { authMiddleware, hasRolePermission } from '../middleware/auth.js';

const customers = new Hono<Bindings>();

// Apply Auth Middleware
customers.use('*', authMiddleware);

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

customers.get('/', checkRole(['admin', 'manager', 'cashier']), CustomerController.getCustomers);
customers.get('/:id', checkRole(['admin', 'manager', 'cashier']), CustomerController.getCustomer);
customers.post('/', checkRole(['admin', 'manager', 'cashier']), CustomerController.createCustomer);
customers.put('/:id', checkRole(['admin', 'manager', 'cashier']), CustomerController.updateCustomer);
customers.delete('/:id', checkRole(['admin', 'manager']), CustomerController.deleteCustomer);

export default customers;
