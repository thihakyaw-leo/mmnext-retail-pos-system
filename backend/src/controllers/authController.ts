// @ts-nocheck
/**
 * ============================================================================
 * AUTHENTICATION CONTROLLER
 * ============================================================================
 * Handles all authentication-related business logic
 */

import jwt from 'jsonwebtoken';
import { DatabaseService } from '../utils/database.js';
import { KVCacheService } from '../utils/kvStore.js';
import { blacklistToken } from '../middleware/auth.js';
import { getUserPermissions } from '../middleware/rbac.js';
import { AuthService } from '../services/authService.js';
import { generateSecureToken, hashPassword, verifyPassword } from '../utils/encryption.js';

export class AuthController {
  /**
   * User login
   */
  async login(c) {
    try {
      const { email, password, remember_me = false } = await c.req.json();
      const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
      const userAgent = c.req.header('user-agent') || 'unknown';
      
      const authService = new AuthService(c.env);
      const result = await authService.login(email, password, remember_me, ipAddress, userAgent);
      
      if (!result.success) {
        return c.json({ error: result.error, message: result.message, ...result }, result.status);
      }
      return c.json(result);
    } catch (error) {
      console.error('Login error:', error);
      return c.json({ error: 'Internal server error', message: 'An error occurred during login' }, 500);
    }
  }

  /**
   * User registration (admin only)
   */
  async register(c) {
    try {
      const currentUser = c.get('user');
      if (currentUser.role !== 'admin') {
        return c.json({ error: 'Forbidden', message: 'Only administrators can register new users' }, 403);
      }
      
      const userData = await c.req.json();
      const frontendUrl = c.env.FRONTEND_URL || 'https://pos.mmnext.net';
      
      const authService = new AuthService(c.env);
      const result = await authService.register(userData, currentUser, frontendUrl);
      
      if (!result.success) {
        return c.json({ error: result.error, message: result.message }, result.status);
      }
      return c.json(result, 201);
    } catch (error) {
      console.error('Registration error:', error);
      return c.json({ error: 'Internal server error', message: 'An error occurred during registration' }, 500);
    }
  }

  /**
   * User logout
   */
  async logout(c) {
    try {
      const token = c.get('token');
      const user = c.get('user');
      const decoded = c.get('tokenDecoded');
      const cache = new KVCacheService(c.env);
      const db = new DatabaseService(c.env.DB);
      
      // Blacklist the token
      await blacklistToken(cache, token, decoded.exp);
      
      // Remove session from cache
      await cache.delete(`session:${user.id}:${token}`);
      
      // Log logout event
      await this.logLoginEvent(db, user.id, 'logout', {
        userAgent: c.req.header('User-Agent') || 'Unknown',
        ipAddress: c.req.header('CF-Connecting-IP') || 'Unknown'
      });
      
      return c.json({
        success: true,
        message: 'Logged out successfully'
      });
      
    } catch (error) {
      console.error('Logout error:', error);
      return c.json({
        error: 'Internal server error',
        message: 'An error occurred during logout'
      }, 500);
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(c) {
    try {
      const user = c.get('user');
      const cache = new KVCacheService(c.env);
      const db = new DatabaseService(c.env.DB);
      
      // Invalidate all user sessions
      await db.execute({
        sql: `
          UPDATE user_sessions 
          SET is_active = 0
          WHERE user_id = ?
        `,
        args: [user.id]
      });

      // Update users table timestamp
      await db.execute({
        sql: `
          UPDATE users 
          SET updated_at = datetime('now')
          WHERE id = ?
        `,
        args: [user.id]
      });
      
      // Log logout all event
      await this.logLoginEvent(db, user.id, 'logout_all', {
        userAgent: c.req.header('User-Agent') || 'Unknown',
        ipAddress: c.req.header('CF-Connecting-IP') || 'Unknown'
      });
      
      return c.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });
      
    } catch (error) {
      console.error('Logout all error:', error);
      return c.json({
        error: 'Internal server error',
        message: 'An error occurred during logout'
      }, 500);
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(c) {
    try {
      const user = c.get('user');
      const db = new DatabaseService(c.env.DB);
      
      // Get complete user profile
      const profile = await db.first({
        sql: `
          SELECT u.*, 
                 (SELECT COUNT(*) FROM orders WHERE cashier_id = u.id AND status = 'completed') as completed_orders,
                 (SELECT SUM(total_amount) FROM orders WHERE cashier_id = u.id AND status = 'completed') as total_sales_amount
          FROM users u
          WHERE u.id = ? AND u.deleted_at IS NULL
        `,
        args: [user.id]
      });
      
      if (!profile) {
        return c.json({
          error: 'User not found',
          message: 'User profile not found'
        }, 404);
      }
      
      return c.json({
        success: true,
        user: {
          id: profile.id,
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          displayName: `${profile.first_name} ${profile.last_name}`,
          role: profile.role,
          isActive: profile.is_active,
          isVerified: profile.is_verified,
          phone: profile.phone,
          address: profile.address,
          avatarUrl: profile.avatar_url,
          bio: profile.bio,
          employeeId: profile.employee_id,
          hireDate: profile.hire_date,
          department: profile.department,
          position: profile.position,
          
          // Gamification data
          totalPoints: profile.total_points || 0,
          currentLevel: profile.current_level || 1,
          totalSales: profile.total_sales || 0,
          totalOrders: profile.total_orders || 0,
          
          // Performance data
          completedOrders: profile.completed_orders || 0,
          totalSalesAmount: profile.total_sales_amount || 0,
          
          // Security info
          twoFactorEnabled: profile.two_factor_enabled || false,
          lastLogin: profile.last_login,
          createdAt: profile.created_at,
          
          // Permissions
          permissions: getUserPermissions(profile.role)
        }
      });
      
    } catch (error) {
      console.error('Get profile error:', error);
      return c.json({
        error: 'Internal server error',
        message: 'An error occurred while fetching profile'
      }, 500);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(c) {
    try {
      const user = c.get('user');
      const updates = await c.req.json();
      const db = new DatabaseService(c.env.DB);
      
      // Define allowed update fields
      const allowedFields = [
        'first_name', 'last_name', 'phone', 'address', 
        'bio', 'avatar_url', 'notification_preferences'
      ];
      
      // Filter and validate updates
      const validUpdates = {};
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          validUpdates[key] = value;
        }
      }
      
      if (Object.keys(validUpdates).length === 0) {
        return c.json({
          error: 'No valid updates',
          message: 'No valid fields provided for update'
        }, 400);
      }
      
      // Update user profile
      await db.update('users', validUpdates, 'id = ?', [user.id]);
      
      // Get updated profile
      const updatedProfile = await db.first({
        sql: 'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL',
        args: [user.id]
      });
      
      return c.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedProfile.id,
          email: updatedProfile.email,
          firstName: updatedProfile.first_name,
          lastName: updatedProfile.last_name,
          displayName: `${updatedProfile.first_name} ${updatedProfile.last_name}`,
          phone: updatedProfile.phone,
          address: updatedProfile.address,
          bio: updatedProfile.bio,
          avatarUrl: updatedProfile.avatar_url
        }
      });
      
    } catch (error) {
      console.error('Update profile error:', error);
      return c.json({
        error: 'Internal server error',
        message: 'An error occurred while updating profile'
      }, 500);
    }
  }

  /**
   * Change password
   */
  async changePassword(c) {
    try {
      const user = c.get('user');
      const { current_password, new_password, confirm_password } = await c.req.json();
      const db = new DatabaseService(c.env.DB);
      
      // Validate new password confirmation
      if (new_password !== confirm_password) {
        return c.json({
          error: 'Password mismatch',
          message: 'New password and confirmation do not match'
        }, 400);
      }
      
      // Get current user data
      const userData = await db.first({
        sql: 'SELECT password_hash FROM users WHERE id = ? AND deleted_at IS NULL',
        args: [user.id]
      });
      
      if (!userData) {
        return c.json({
          error: 'User not found',
          message: 'User not found'
        }, 404);
      }
      
      // Verify current password
      const isValidPassword = await verifyPassword(current_password, userData.password_hash);
      
      if (!isValidPassword) {
        return c.json({
          error: 'Invalid password',
          message: 'Current password is incorrect'
        }, 401);
      }
      
      // Hash new password
      const newPasswordHash = await hashPassword(new_password);
      
      // Update password
      await db.execute({
        sql: `
          UPDATE users 
          SET password_hash = ?, updated_at = datetime('now')
          WHERE id = ?
        `,
        args: [newPasswordHash, user.id]
      });
      
      // Log password change event
      await this.logLoginEvent(db, user.id, 'password_changed', {
        userAgent: c.req.header('User-Agent') || 'Unknown',
        ipAddress: c.req.header('CF-Connecting-IP') || 'Unknown'
      });
      
      return c.json({
        success: true,
        message: 'Password changed successfully'
      });
      
    } catch (error) {
      console.error('Change password error:', error);
      return c.json({
        error: 'Internal server error',
        message: 'An error occurred while changing password'
      }, 500);
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(c) {
    try {
      const { email } = await c.req.json();
      const frontendUrl = c.env.FRONTEND_URL || 'https://pos.mmnext.net';
      
      const authService = new AuthService(c.env);
      const result = await authService.forgotPassword(email, frontendUrl);
      
      return c.json(result);
    } catch (error) {
      console.error('Forgot password error:', error);
      return c.json({ error: 'Internal server error', message: 'An error occurred processing the request' }, 500);
    }
  }

  /**
   * Reset Password
   */
  async resetPassword(c) {
    try {
      const { token, new_password } = await c.req.json();
      
      if (new_password.length < 8) {
        return c.json({ error: 'Invalid password', message: 'Password must be at least 8 characters long' }, 400);
      }
      
      const authService = new AuthService(c.env);
      const result = await authService.resetPassword(token, new_password);
      
      if (!result.success) {
        return c.json({ error: result.error, message: result.message }, result.status);
      }
      return c.json(result);
    } catch (error) {
      console.error('Reset password error:', error);
      return c.json({ error: 'Internal server error', message: 'An error occurred resetting the password' }, 500);
    }
  }

  /**
   * Verify Email
   */
  async verifyEmail(c) {
    try {
      const { token } = await c.req.json();
      
      const authService = new AuthService(c.env);
      const result = await authService.verifyEmail(token);
      
      if (!result.success) {
        return c.json({ error: result.error, message: result.message }, result.status);
      }
      return c.json(result);
    } catch (error) {
      console.error('Email verification error:', error);
      return c.json({ error: 'Internal server error', message: 'An error occurred verifying the email' }, 500);
    }
  }

  /**
   * Verify 2FA and Login
   */
  async verify2fa(c) {
    try {
      const { temp_token, code, remember_me = false } = await c.req.json();
      const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
      const userAgent = c.req.header('user-agent') || 'unknown';
      
      const authService = new AuthService(c.env);
      const result = await authService.verify2FA(temp_token, code, remember_me, ipAddress, userAgent);
      
      if (!result.success) {
        return c.json({ error: result.error, message: result.message }, result.status);
      }
      return c.json(result);
    } catch (error) {
      console.error('2FA verification error:', error);
      return c.json({ error: 'Internal server error', message: 'An error occurred during 2FA verification' }, 500);
    }
  }

  /**
   * Setup 2FA
   */
  async setup2FA(c) {
    try {
      const user = c.get('user');
      const authService = new AuthService(c.env);
      const result = await authService.setup2FA(user.id, user.email);
      
      return c.json(result);
    } catch (error) {
      console.error('Setup 2FA error:', error);
      return c.json({ error: 'Internal server error', message: 'An error occurred setting up 2FA' }, 500);
    }
  }

  /**
   * Get user permissions
   */
  async getPermissions(c) {
    try {
      const user = c.get('user');
      const permissions = getUserPermissions(user.role);
      
      return c.json({
        success: true,
        permissions,
        role: user.role
      });
      
    } catch (error) {
      console.error('Get permissions error:', error);
      return c.json({
        error: 'Internal server error',
        message: 'An error occurred while fetching permissions'
      }, 500);
    }
  }

  /**
   * Log login/security events
   */
  async logLoginEvent(db, userId, eventType, metadata = {}) {
    try {
      await db.insert('login_logs', {
        user_id: userId,
        event_type: eventType,
        ip_address: metadata.ipAddress,
        user_agent: metadata.userAgent,
        metadata: JSON.stringify(metadata),
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log login event:', error);
    }
  }
}
