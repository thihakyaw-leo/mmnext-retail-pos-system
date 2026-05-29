import { Hono } from 'hono';
import { authMiddleware as auth } from '../middleware/auth.js';
import { rbacMiddleware as rbac } from '../middleware/rbac.js';
import { AuditController } from '../controllers/auditController.js';

const audit = new Hono();

// Protect all audit routes
audit.use('*', auth);

// Only Admin and Manager can access audit logs. Cashiers cannot.
audit.get('/logs', rbac(['admin', 'manager']), AuditController.getLogs);
audit.get('/logs/:id', rbac(['admin', 'manager']), AuditController.getLogDetails);

export default audit;
