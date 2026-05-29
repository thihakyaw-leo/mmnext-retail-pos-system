import { Hono } from 'hono';
import { attendanceController } from '../controllers/attendanceController';
import { authMiddleware } from '../middleware/auth';

const router = new Hono();

router.use('/*', authMiddleware);

router.post('/clock-in', attendanceController.clockIn);
router.post('/clock-out', attendanceController.clockOut);
router.get('/history', attendanceController.getHistory);
router.get('/status', attendanceController.getStatus);

export default router;
