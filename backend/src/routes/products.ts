import { Hono, Context, Next } from 'hono';
import { Env, Bindings } from '../types/env.js';
import { ProductController } from '../controllers/productController.js';
import { authMiddleware, hasRolePermission } from '../middleware/auth.js';

// Setup Hono router
const products = new Hono<Bindings>();

// Apply Auth Middleware to all product routes
products.use('*', authMiddleware);

// Hono compatible Role Middleware
const checkRole = (allowedRoles: string[]) => async (c: Context<Bindings>, next: Next) => {
  const user = c.get('user') as any;
  // If user role is in allowed roles OR user has higher hierarchy than the lowest required role
  const hasAccess = allowedRoles.some(role => hasRolePermission(user?.role, role));
  if (!user || !hasAccess) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  await next();
};

// ==========================================
// GET ROUTES (All authenticated users)
// ==========================================

products.get('/', ProductController.getProducts);
products.get('/:id', ProductController.getProduct);

// ==========================================
// POST ROUTES (Admin/Manager only)
// ==========================================

products.post('/', checkRole(['admin', 'manager']), ProductController.createProduct);

// ==========================================
// PUT ROUTES (Admin/Manager only)
// ==========================================

products.put('/:id', checkRole(['admin', 'manager']), ProductController.updateProduct);

// ==========================================
// DELETE ROUTES (Admin only)
// ==========================================

products.delete('/:id', checkRole(['admin']), ProductController.deleteProduct);

export default products;
