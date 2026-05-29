import { Hono, Context, Next } from 'hono';
import { Bindings } from '../types/env.js';
import { SupplierController } from '../controllers/supplierController.js';
import { authMiddleware, hasRolePermission } from '../middleware/auth.js';

// Setup Hono router
const suppliers = new Hono<Bindings>();

// Apply Auth Middleware to all supplier routes
suppliers.use('*', authMiddleware);

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
// GET ROUTES (All authenticated users)
// ==========================================

suppliers.get('/', SupplierController.getSuppliers);
suppliers.get('/:id', SupplierController.getSupplier);

// ==========================================
// POST ROUTES (Admin/Manager only)
// ==========================================

suppliers.post('/', checkRole(['admin', 'manager']), SupplierController.createSupplier);

// ==========================================
// PUT ROUTES (Admin/Manager only)
// ==========================================

suppliers.put('/:id', checkRole(['admin', 'manager']), SupplierController.updateSupplier);

// ==========================================
// DELETE ROUTES (Admin only)
// ==========================================

suppliers.delete('/:id', checkRole(['admin']), SupplierController.deleteSupplier);

export default suppliers;
