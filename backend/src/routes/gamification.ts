import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware as auth } from '../middleware/auth.js';
import { rbacMiddleware as rbac } from '../middleware/rbac.js';
import { zValidator } from '@hono/zod-validator';
import { GamificationController } from '../controllers/gamificationController.js';

const gamification = new Hono();

const achievementSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  badge_color: z.string().optional().default('#1890ff'),
  category: z.string().optional().nullable(),
  condition_type: z.string().min(1, 'Condition type is required'),
  condition_value: z.number().min(0, 'Condition value must be >= 0'),
  condition_period: z.string().optional().nullable(),
  points_reward: z.number().min(0).default(0),
  is_active: z.boolean().default(true)
});

const progressSchema = z.object({
  achievementId: z.union([z.string(), z.number()]),
  valueToAdd: z.number().min(0, 'Progress value to add must be >= 0')
});

// Protect all routes
gamification.use('*', auth);

// --- LEADERBOARD ---
// Accessible by all authenticated staff
gamification.get('/leaderboard', rbac(['admin', 'manager', 'cashier']), GamificationController.getLeaderboard);

// --- ACHIEVEMENTS MANAGEMENT ---
// Only Admin/Manager can view the list of configured achievements
gamification.get('/achievements', rbac(['admin', 'manager']), GamificationController.getAchievements);

// Only Admin can create or update achievements
gamification.post('/achievements', rbac(['admin']), zValidator('json', achievementSchema), GamificationController.createAchievement);
gamification.put('/achievements/:id', rbac(['admin']), zValidator('json', achievementSchema.partial()), GamificationController.updateAchievement);

// --- USER PROGRESS ---
// Anyone can view their own or others' badges
gamification.get('/users/:userId', rbac(['admin', 'manager', 'cashier']), GamificationController.getUserAchievements);

// Recording progress is done by automated scripts or managers
gamification.post('/users/:userId/progress', rbac(['admin', 'manager']), zValidator('json', progressSchema), GamificationController.recordProgress);

export default gamification;
