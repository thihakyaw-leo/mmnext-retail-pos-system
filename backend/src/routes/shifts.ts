import { Hono } from 'hono';
import { authMiddleware as auth } from '../middleware/auth.js';
import { ShiftController } from '../controllers/shiftController.js';

const shifts = new Hono();

// Protect all shift routes
shifts.use('*', auth);

// Get list of all shifts
shifts.get('/', ShiftController.getShifts);

// Open a new shift
shifts.post('/open', ShiftController.openShift);

// Add cash movement (pay in / pay out) to an open shift
shifts.post('/:id/movement', ShiftController.addMovement);

// Close an open shift and generate Z-Report
shifts.post('/:id/close', ShiftController.closeShift);

export default shifts;
