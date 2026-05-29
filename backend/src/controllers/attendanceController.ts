import { Context } from 'hono';

export const attendanceController = {
  // Clock In
  clockIn: async (c: Context) => {
    try {
      const db = c.env.DB;
      const user = c.get('user');
      const { notes } = await c.req.json().catch(() => ({ notes: '' }));

      // Check if already clocked in and not clocked out
      const activeLog = await db.prepare(
        'SELECT id FROM attendance_logs WHERE staff_id = ? AND clock_out_time IS NULL ORDER BY clock_in_time DESC LIMIT 1'
      ).bind(user.id).first();

      if (activeLog) {
        return c.json({ error: 'Already clocked in. Please clock out first.' }, 400);
      }

      const now = new Date().toISOString();
      const result = await db.prepare(
        'INSERT INTO attendance_logs (organization_id, staff_id, clock_in_time, status, notes) VALUES (?, ?, ?, ?, ?) RETURNING *'
      ).bind(user.organization_id || 1, user.id, now, 'Present', notes || null).first();

      return c.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Clock In error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  },

  // Clock Out
  clockOut: async (c: Context) => {
    try {
      const db = c.env.DB;
      const user = c.get('user');
      const { notes } = await c.req.json().catch(() => ({ notes: '' }));

      // Find the active clock-in log
      const activeLog = await db.prepare(
        'SELECT * FROM attendance_logs WHERE staff_id = ? AND clock_out_time IS NULL ORDER BY clock_in_time DESC LIMIT 1'
      ).bind(user.id).first();

      if (!activeLog) {
        return c.json({ error: 'No active clock-in found. Please clock in first.' }, 400);
      }

      const now = new Date();
      const clockInTime = new Date(activeLog.clock_in_time as string);
      const diffMs = now.getTime() - clockInTime.getTime();
      const totalHours = diffMs / (1000 * 60 * 60);

      const combinedNotes = activeLog.notes ? `${activeLog.notes}\n${notes || ''}` : (notes || null);

      const result = await db.prepare(
        'UPDATE attendance_logs SET clock_out_time = ?, total_hours = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *'
      ).bind(now.toISOString(), totalHours, combinedNotes, activeLog.id).first();

      return c.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Clock Out error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  },

  // Get Attendance History
  getHistory: async (c: Context) => {
    try {
      const db = c.env.DB;
      const user = c.get('user');
      const staffIdParam = c.req.query('staff_id');
      
      // If Admin, can view all. If not, only view their own.
      const queryStaffId = (user.role === 'admin' || user.role === 'manager') && staffIdParam 
        ? Number(staffIdParam) 
        : user.id;

      const results = await db.prepare(`
        SELECT a.*, u.full_name as staff_name, u.first_name, u.last_name
        FROM attendance_logs a
        LEFT JOIN users u ON a.staff_id = u.id
        WHERE a.staff_id = ?
        ORDER BY a.clock_in_time DESC
        LIMIT 50
      `).bind(queryStaffId).all();

      return c.json({ success: true, data: results.results });
    } catch (error: any) {
      console.error('Get attendance history error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  },
  
  // Get active status
  getStatus: async (c: Context) => {
    try {
      const db = c.env.DB;
      const user = c.get('user');

      const activeLog = await db.prepare(
        'SELECT * FROM attendance_logs WHERE staff_id = ? AND clock_out_time IS NULL ORDER BY clock_in_time DESC LIMIT 1'
      ).bind(user.id).first();

      return c.json({ success: true, data: activeLog || null });
    } catch (error: any) {
      console.error('Get status error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }
};
