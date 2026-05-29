import { Env } from '../types/env.js';

export class ShiftService {
  private db: D1Database;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.db = env.DB;
  }

  async getShifts(orgId: string) {
    const query = `
      SELECT s.*, u.first_name || ' ' || u.last_name as cashier
      FROM shifts s
      JOIN users u ON s.user_id = u.id
      WHERE s.organization_id = ?
      ORDER BY s.created_at DESC
    `;
    const { results } = await this.db.prepare(query).bind(orgId).all();
    return results;
  }

  async openShift(orgId: string, userId: number, registerName: string, startingCash: number, notes?: string) {
    // Check if there is already an open shift for this register or user
    const checkQuery = `SELECT id FROM shifts WHERE organization_id = ? AND (user_id = ? OR register_name = ?) AND status = 'Open'`;
    const existing = await this.db.prepare(checkQuery).bind(orgId, userId, registerName).first();
    if (existing) {
      throw new Error('An open shift already exists for this user or register');
    }

    const shiftId = `SHF-${Date.now()}`;
    const insertQuery = `
      INSERT INTO shifts (id, organization_id, user_id, register_name, starting_cash, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Open')
    `;
    
    await this.db.prepare(insertQuery).bind(shiftId, orgId, userId, registerName, startingCash, notes || null).run();
    
    return { success: true, shiftId };
  }

  async addCashMovement(orgId: string, shiftId: string, type: 'pay_in' | 'pay_out', amount: number, reason: string) {
    // Verify shift is open
    const shift = await this.db.prepare(`SELECT status FROM shifts WHERE id = ? AND organization_id = ?`).bind(shiftId, orgId).first();
    if (!shift || shift.status !== 'Open') {
      throw new Error('Shift not found or already closed');
    }

    const moveId = `MOV-${Date.now()}`;
    const query = `
      INSERT INTO cash_movements (id, shift_id, organization_id, movement_type, amount, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await this.db.prepare(query).bind(moveId, shiftId, orgId, type, amount, reason).run();

    return { success: true, moveId };
  }

  async closeShift(orgId: string, shiftId: string, actualEndingCash: number, notes?: string) {
    // Get shift details
    const shift: any = await this.db.prepare(`SELECT * FROM shifts WHERE id = ? AND organization_id = ? AND status = 'Open'`).bind(shiftId, orgId).first();
    if (!shift) {
      throw new Error('Shift not found or already closed');
    }

    // 1. Calculate Cash Sales from Orders table for this cashier within shift time
    const salesQuery = `
      SELECT SUM(total_amount) as cash_sales
      FROM orders
      WHERE organization_id = ? 
        AND cashier_id = ? 
        AND payment_method = 'cash' 
        AND status = 'completed'
        AND created_at >= ?
    `;
    const salesResult: any = await this.db.prepare(salesQuery).bind(orgId, shift.user_id, shift.start_time).first();
    const cashSales = parseFloat(salesResult?.cash_sales || 0);

    // 2. Calculate total pay_ins and pay_outs
    const movementsQuery = `
      SELECT movement_type, SUM(amount) as total_amount
      FROM cash_movements
      WHERE shift_id = ? AND organization_id = ?
      GROUP BY movement_type
    `;
    const { results: movements } = await this.db.prepare(movementsQuery).bind(shiftId, orgId).all();
    
    let payIns = 0;
    let payOuts = 0;
    movements.forEach((m: any) => {
      if (m.movement_type === 'pay_in') payIns = parseFloat(m.total_amount);
      if (m.movement_type === 'pay_out') payOuts = parseFloat(m.total_amount);
    });

    // 3. Expected Cash = Starting + Cash Sales + Pay Ins - Pay Outs
    const startingCash = parseFloat(shift.starting_cash);
    const expectedCash = startingCash + cashSales + payIns - payOuts;

    // 4. Discrepancy = Actual - Expected
    const discrepancy = actualEndingCash - expectedCash;

    // Update Shift
    const updateQuery = `
      UPDATE shifts 
      SET end_time = CURRENT_TIMESTAMP, 
          cash_sales = ?, 
          expected_cash = ?, 
          actual_ending_cash = ?, 
          discrepancy = ?, 
          status = 'Closed', 
          notes = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND organization_id = ?
    `;
    
    await this.db.prepare(updateQuery).bind(
      cashSales, 
      expectedCash, 
      actualEndingCash, 
      discrepancy, 
      notes || shift.notes, 
      shiftId, 
      orgId
    ).run();

    return { 
      success: true, 
      cashSales, 
      payIns, 
      payOuts, 
      expectedCash, 
      actualEndingCash, 
      discrepancy 
    };
  }
}
