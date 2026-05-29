import { Hono, Context, Next } from 'hono';
import { Bindings } from '../types/env.js';
import { CategoryController } from '../controllers/categoryController.js';
import { authMiddleware, hasRolePermission } from '../middleware/auth.js';

const categories = new Hono<Bindings>();

// Apply Auth Middleware to all category routes
categories.use('*', authMiddleware);

const checkRole = (allowedRoles: string[]) => async (c: Context<Bindings>, next: Next) => {
  const user = c.get('user') as any;
  const hasAccess = allowedRoles.some(role => hasRolePermission(user?.role, role));
  if (!user || !hasAccess) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  await next();
};

categories.get('/', CategoryController.getCategories);
categories.get('/:id', CategoryController.getCategory);

// Only admin/manager can modify
categories.post('/', checkRole(['admin', 'manager']), CategoryController.createCategory);
categories.put('/:id', checkRole(['admin', 'manager']), CategoryController.updateCategory);
categories.delete('/:id', checkRole(['admin', 'manager']), CategoryController.deleteCategory);

export default categories;
