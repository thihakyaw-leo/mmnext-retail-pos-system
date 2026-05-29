import { Hono, Context, Next } from 'hono';
import { Bindings } from '../types/env.js';
import { StaffController } from '../controllers/staffController.js';
import { authMiddleware, hasRolePermission } from '../middleware/auth.js';

const staffs = new Hono<Bindings>();

// Apply Auth Middleware
staffs.use('*', authMiddleware);

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

staffs.get('/', checkRole(['admin', 'manager']), StaffController.getStaffs);
staffs.get('/:id', checkRole(['admin', 'manager']), StaffController.getStaff);
staffs.post('/', checkRole(['admin']), StaffController.createStaff);
staffs.put('/:id', checkRole(['admin']), StaffController.updateStaff);
staffs.delete('/:id', checkRole(['admin']), StaffController.deleteStaff);
staffs.get('/:id/stats', checkRole(['admin', 'manager']), StaffController.getStaffStats);

export default staffs;
