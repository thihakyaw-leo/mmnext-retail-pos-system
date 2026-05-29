import { Env } from '../types/env.js';

export class PayrollService {
  private db: D1Database;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.db = env.DB;
  }

  async calculatePayroll(orgId: string, startDate: Date, endDate: Date, staffId?: string) {
    // 1. Get base salary and commission rates for active staff/cashiers/managers
    let userQuery = `
      SELECT 
        id as staff_id,
        first_name,
        last_name,
        first_name || ' ' || last_name as name,
        email,
        role,
        department,
        employee_id,
        hire_date,
        salary as base_monthly_salary,
        commission_rate
      FROM users
      WHERE organization_id = ? AND is_active = 1 AND role IN ('staff', 'cashier', 'manager')
    `;
    const userParams: any[] = [orgId];

    if (staffId) {
      userQuery += ` AND id = ?`;
      userParams.push(staffId);
    }

    const { results: staffMembers } = await this.db.prepare(userQuery).bind(...userParams).all();

    if (!staffMembers || staffMembers.length === 0) {
      return [];
    }

    // 2. Get total sales by staff member within the date range to calculate commission
    const salesQuery = `
      SELECT 
        cashier_id as staff_id,
        COUNT(id) as total_orders,
        SUM(total_amount) as total_sales
      FROM orders
      WHERE organization_id = ? 
        AND created_at >= ? 
        AND created_at <= ? 
        AND status != 'cancelled'
        AND cashier_id IS NOT NULL
      GROUP BY cashier_id
    `;
    const { results: salesData } = await this.db.prepare(salesQuery).bind(
      orgId, 
      startDate.toISOString(), 
      endDate.toISOString()
    ).all();

    // 2.5 Get attendance data for the period
    const attendanceQuery = `
      SELECT 
        staff_id,
        SUM(total_hours) as total_worked_hours,
        COUNT(DISTINCT DATE(clock_in_time)) as days_worked
      FROM attendance_logs
      WHERE organization_id = ? 
        AND clock_in_time >= ? 
        AND clock_in_time <= ?
      GROUP BY staff_id
    `;
    const { results: attendanceData } = await this.db.prepare(attendanceQuery).bind(
      orgId, 
      startDate.toISOString(), 
      endDate.toISOString()
    ).all();

    const attendanceMap = new Map();
    if (attendanceData) {
      attendanceData.forEach((row: any) => {
        attendanceMap.set(row.staff_id, {
          total_worked_hours: row.total_worked_hours,
          days_worked: row.days_worked
        });
      });
    }

    // Create a map for quick sales lookup
    const salesMap = new Map();
    salesData.forEach((row: any) => {
      salesMap.set(row.staff_id, {
        total_orders: row.total_orders,
        total_sales: row.total_sales
      });
    });

    // 3. Calculate time differences for pro-rating base salary
    // Assumes base_monthly_salary is for a 30-day month.
    const timeDiffMs = endDate.getTime() - startDate.getTime();
    const daysInPeriod = Math.max(1, Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24)));

    // 4. Combine and calculate payroll
    const payrollReport = staffMembers.map((staff: any) => {
      const sales = salesMap.get(staff.staff_id) || { total_orders: 0, total_sales: 0 };
      const attendance = attendanceMap.get(staff.staff_id) || { days_worked: 0, total_worked_hours: 0 };
      
      const baseMonthlySalary = parseFloat(staff.base_monthly_salary || 0);
      const commissionRate = parseFloat(staff.commission_rate || 0);
      
      // Pro-rate salary: (Monthly Salary / 30) * Actual Days Worked (or max days in period)
      // If attendance system isn't strictly used yet, fallback to daysInPeriod might be needed.
      // But we will use actual days worked. If they didn't work, pro-rated is 0.
      const actualDaysWorked = attendance.days_worked > 0 ? attendance.days_worked : 0;
      // As a fallback for tests where we didn't clock in but expect salary:
      // const effectiveDays = actualDaysWorked > 0 ? actualDaysWorked : daysInPeriod;
      const effectiveDays = actualDaysWorked;
      
      const proRatedSalary = (baseMonthlySalary / 30) * effectiveDays;
      
      // Earned commission: (Total Sales * Commission Rate / 100)
      const earnedCommission = (sales.total_sales * commissionRate) / 100;
      
      const totalPayout = proRatedSalary + earnedCommission;

      return {
        staff_id: staff.staff_id,
        employee_id: staff.employee_id,
        name: staff.name,
        role: staff.role,
        department: staff.department,
        period_days: daysInPeriod,
        days_worked: attendance.days_worked,
        total_worked_hours: Number((attendance.total_worked_hours || 0).toFixed(2)),
        base_monthly_salary: baseMonthlySalary,
        pro_rated_salary: Number(proRatedSalary.toFixed(2)),
        commission_rate: commissionRate,
        total_sales: Number(sales.total_sales.toFixed(2)),
        total_orders: sales.total_orders,
        earned_commission: Number(earnedCommission.toFixed(2)),
        total_payout: Number(totalPayout.toFixed(2))
      };
    });

    return payrollReport;
  }

  async getStaffCommissions(orgId: string, startDate: Date, endDate: Date, staffId?: string) {
    let query = `
      SELECT 
        o.cashier_id as staff_id,
        u.first_name || ' ' || u.last_name as name,
        u.role,
        u.department,
        u.commission_rate,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_sales,
        (SUM(o.total_amount) * IFNULL(u.commission_rate, 0) / 100) as earned_commission
      FROM orders o
      JOIN users u ON o.cashier_id = u.id
      WHERE o.organization_id = ? 
        AND o.created_at >= ? 
        AND o.created_at <= ? 
        AND o.status != 'cancelled'
    `;
    const params: any[] = [orgId, startDate.toISOString(), endDate.toISOString()];

    if (staffId) {
      query += ` AND o.cashier_id = ?`;
      params.push(staffId);
    }

    query += ` GROUP BY o.cashier_id ORDER BY earned_commission DESC`;

    const { results } = await this.db.prepare(query).bind(...params).all();
    return results;
  }

  async savePayrollRun(orgId: string, userId: number, periodStart: Date, periodEnd: Date, notes: string = '') {
    // 1. Calculate payroll for all staff
    const payrollData = await this.calculatePayroll(orgId, periodStart, periodEnd);
    if (!payrollData || payrollData.length === 0) {
      throw new Error('No payroll data to generate');
    }

    const runId = `PR-${orgId}-${Date.now()}`;
    const totalEmployees = payrollData.length;
    const totalAmount = payrollData.reduce((sum: number, item: any) => sum + (item.total_payout || 0), 0);

    // 2. Insert into payroll_runs
    const runSql = `
      INSERT INTO payroll_runs (id, organization_id, period_start, period_end, total_employees, total_amount, status, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 'Draft', ?, ?)
    `;
    await this.db.prepare(runSql).bind(
      runId, orgId, periodStart.toISOString(), periodEnd.toISOString(), totalEmployees, totalAmount, notes, userId
    ).run();

    // 3. Insert individual payslips
    const slipSql = `
      INSERT INTO payroll_slips (id, payroll_run_id, organization_id, staff_id, base_pay, commission, allowances, deductions, net_pay)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const statements = payrollData.map((item: any) => {
      const slipId = `SLIP-${item.staff_id}-${Date.now()}`;
      return this.db.prepare(slipSql).bind(
        slipId, runId, orgId, item.staff_id, 
        item.pro_rated_salary || 0, 
        item.earned_commission || 0,
        0, 0, // default allowances and deductions for now
        item.total_payout || 0
      );
    });

    await this.db.batch(statements);
    return { success: true, runId, totalEmployees, totalAmount };
  }

  async getPayrollRuns(orgId: string) {
    const query = `
      SELECT * FROM payroll_runs
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `;
    const { results } = await this.db.prepare(query).bind(orgId).all();
    return results;
  }

  async markPayrollRunPaid(orgId: string, runId: string) {
    const checkSql = `SELECT id FROM payroll_runs WHERE id = ? AND organization_id = ?`;
    const exists = await this.db.prepare(checkSql).bind(runId, orgId).first();
    if (!exists) throw new Error('Payroll run not found');

    const updateRun = `
      UPDATE payroll_runs 
      SET status = 'Paid', processed_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND organization_id = ?
    `;
    const updateSlips = `
      UPDATE payroll_slips
      SET status = 'Paid', updated_at = CURRENT_TIMESTAMP
      WHERE payroll_run_id = ? AND organization_id = ?
    `;

    await this.db.batch([
      this.db.prepare(updateRun).bind(runId, orgId),
      this.db.prepare(updateSlips).bind(runId, orgId)
    ]);

    return { success: true, message: 'Payroll marked as paid' };
  }
}
