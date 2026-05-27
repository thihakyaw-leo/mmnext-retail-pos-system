import { Hono } from 'hono';
import { AuthController } from '../controllers/authController.js';
import { zValidator } from '@hono/zod-validator';
import { loginSchema, registerSchema } from '../schemas/auth.schema.js';
import { authMiddleware } from '../middleware/auth.js';

const authRoutes = new Hono();
const authController = new AuthController();

// Public routes
authRoutes.post('/login', zValidator('json', loginSchema), (c) => authController.login(c));
authRoutes.post('/forgot-password', (c) => authController.forgotPassword(c));

// Protected routes (require auth)
authRoutes.post('/logout', authMiddleware, (c) => authController.logout(c));
authRoutes.post('/logout-all', authMiddleware, (c) => authController.logoutAll(c));
authRoutes.get('/profile', authMiddleware, (c) => authController.getProfile(c));
authRoutes.put('/profile', authMiddleware, (c) => authController.updateProfile(c));
authRoutes.post('/change-password', authMiddleware, (c) => authController.changePassword(c));
authRoutes.get('/permissions', authMiddleware, (c) => authController.getPermissions(c));

// Admin routes
authRoutes.post('/register', authMiddleware, zValidator('json', registerSchema), (c) => authController.register(c));

export default authRoutes;
