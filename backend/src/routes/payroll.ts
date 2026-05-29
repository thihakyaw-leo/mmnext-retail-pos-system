import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware as auth } from '../middleware/auth.js';
import { rbacMiddleware as rbac } from '../middleware/rbac.js';
import { validateQuery } from '../middleware/validation.js';
import { PayrollController } from '../controllers/payrollController.js';

const payroll = new Hono();

const dateRangeSchema = z.object({
  startDate: z.string().min(1, 'startDate is required'),
  endDate: z.string().min(1, 'endDate is required'),
  staffId: z.string().optional()
});

// Protect all payroll routes - Admin and Manager only
payroll.use('*', auth, rbac(['admin', 'manager']));

// Calculate payroll (combines base salary and commissions)
payroll.get(
  '/calculate', 
  validateQuery(dateRangeSchema), 
  PayrollController.calculatePayroll
);

// Get only commissions (purely performance-based from orders)
payroll.get(
  '/commissions', 
  validateQuery(dateRangeSchema), 
  PayrollController.getCommissions
);

// Get list of saved payroll runs
payroll.get('/runs', PayrollController.getPayrollRuns);

// Generate a new payroll run
payroll.post(
  '/runs', 
  PayrollController.generatePayrollRun
);

// Mark a payroll run as paid
payroll.put('/runs/:id/pay', PayrollController.markAsPaid);

export default payroll;
