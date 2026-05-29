import { Hono } from 'hono';
import { AuthController } from '../controllers/authController.js';
import { zValidator } from '@hono/zod-validator';
import { loginSchema, registerSchema, verify2faSchema, resetPasswordSchema, verifyEmailSchema } from '../schemas/auth.schema.js';
import { authMiddleware } from '../middleware/auth.js';

const authRoutes = new Hono();
const authController = new AuthController();

// Public routes
authRoutes.post('/login', zValidator('json', loginSchema), (c) => authController.login(c));
authRoutes.post('/verify-2fa', zValidator('json', verify2faSchema), (c) => authController.verify2fa(c));
authRoutes.post('/forgot-password', (c) => authController.forgotPassword(c));
authRoutes.post('/reset-password', zValidator('json', resetPasswordSchema), (c) => authController.resetPassword(c));
authRoutes.post('/verify-email', zValidator('json', verifyEmailSchema), (c) => authController.verifyEmail(c));

// Protected routes (require auth)
authRoutes.post('/logout', authMiddleware, (c) => authController.logout(c));
authRoutes.post('/logout-all', authMiddleware, (c) => authController.logoutAll(c));
authRoutes.get('/profile', authMiddleware, (c) => authController.getProfile(c));
authRoutes.put('/profile', authMiddleware, (c) => authController.updateProfile(c));
authRoutes.post('/change-password', authMiddleware, (c) => authController.changePassword(c));
authRoutes.get('/permissions', authMiddleware, (c) => authController.getPermissions(c));
authRoutes.post('/setup-2fa', authMiddleware, (c) => authController.setup2FA(c));

// Admin routes
authRoutes.post('/register', authMiddleware, zValidator('json', registerSchema), (c) => authController.register(c));

export default authRoutes;
