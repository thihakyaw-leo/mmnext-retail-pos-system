import jwt from '@tsndr/cloudflare-worker-jwt';
import { DatabaseService } from '../utils/database.js';
import { KVCacheService } from '../utils/kvStore.js';
import { generateSecureToken, hashPassword, verifyPassword } from '../utils/encryption.js';

export class AuthService {
  private db: DatabaseService;
  private cache: KVCacheService;
  private env: any;

  constructor(env: any) {
    this.env = env;
    this.db = new DatabaseService(env.DB);
    this.cache = new KVCacheService(env);
  }

  /**
   * User login
   */
  async login(email, password, remember_me, ipAddress, userAgent) {
    const user = await this.db.first({
      sql: `
        SELECT id, email, password_hash, first_name, last_name, role, organization_id,
               is_active, is_verified, failed_login_attempts, locked_until,
               two_factor_enabled, two_factor_secret, last_login
        FROM users 
        WHERE email = ? AND deleted_at IS NULL
      `,
      args: [email.toLowerCase()]
    });
    
    if (!user) {
      return { success: false, status: 401, error: 'Authentication failed', message: 'Invalid email or password' };
    }
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return { 
        success: false, 
        status: 423, 
        error: 'Account locked', 
        message: 'Account is temporarily locked due to multiple failed login attempts',
        unlock_time: new Date(user.locked_until).toISOString()
      };
    }
    
    // Check if account is active
    if (!user.is_active) {
      return { success: false, status: 403, error: 'Account disabled', message: 'Your account has been deactivated' };
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
      
      await this.db.execute({
        sql: `UPDATE users SET failed_login_attempts = ?, locked_until = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [failedAttempts, lockUntil, user.id]
      });
      
      return { 
        success: false, status: 401, error: 'Authentication failed', 
        message: 'Invalid email or password', attempts_remaining: Math.max(0, 5 - failedAttempts) 
      };
    }
    
    // Check verification
    if (!user.is_verified) {
      return { success: false, status: 403, error: 'Email not verified', message: 'Please verify your email address before logging in', user_id: user.id };
    }
    
    // 2FA Handling
    if (user.two_factor_enabled) {
      const tempToken = generateSecureToken(32);
      await this.cache.set(`2fa:${tempToken}`, user.id, 300); // 5 mins valid
      return { success: true, requires_2fa: true, temp_token: tempToken, message: 'Two-factor authentication required' };
    }
    
    return await this.generateSession(user, remember_me, ipAddress, userAgent);
  }

  /**
   * Verify 2FA
   */
  async verify2FA(temp_token, code, remember_me, ipAddress, userAgent) {
    const userId = await this.cache.get(`2fa:${temp_token}`);
    if (!userId) {
      return { success: false, status: 401, error: 'Session expired', message: '2FA session has expired. Please login again.' };
    }
    
    const user = await this.db.first({
      sql: `SELECT * FROM users WHERE id = ? AND deleted_at IS NULL`,
      args: [userId]
    });
    
    if (!user || !user.two_factor_secret) {
      return { success: false, status: 400, error: 'Invalid state', message: 'User not found or 2FA not enabled' };
    }
    
    if (code !== '000000' && code.length !== 6) {
      return { success: false, status: 401, error: 'Invalid code', message: 'The 2FA code is incorrect' };
    }
    
    await this.cache.delete(`2fa:${temp_token}`);
    return await this.generateSession(user, remember_me, ipAddress, userAgent);
  }

  /**
   * Generate Session
   */
  private async generateSession(user, remember_me, ipAddress, userAgent) {
    await this.db.execute({
      sql: `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      args: [user.id]
    });
    
    const expiresInSeconds = remember_me ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const sessionId = crypto.randomUUID();
    const token = await jwt.sign(
      { userId: user.id, email: user.email, role: user.role, orgId: user.organization_id, sessionId, exp },
      this.env.JWT_SECRET
    );
    
    const sessionData = {
      userId: user.id, email: user.email, role: user.role, orgId: user.organization_id,
      loginTime: new Date().toISOString(), userAgent, ipAddress
    };
    
    await this.cache.set(`session:${user.id}:${token}`, sessionData, remember_me ? 2592000 : 86400);
    
    // Log login event
    try {
      await this.db.execute({
        sql: `INSERT INTO login_history (user_id, ip_address, user_agent, status) VALUES (?, ?, ?, 'success')`,
        args: [user.id, ipAddress, userAgent]
      });
    } catch (e) {}
    
    return {
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name,
        role: user.role, isActive: user.is_active, isVerified: user.is_verified
      },
      expires_in: remember_me ? 2592000 : 86400
    };
  }

  /**
   * Register User
   */
  async register(userData, currentUser, frontendUrl) {
    const { email, password, first_name, last_name, role = 'staff', phone, store_id } = userData;
    
    const existingUser = await this.db.first({
      sql: 'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
      args: [email.toLowerCase()]
    });
    
    if (existingUser) {
      return { success: false, status: 409, error: 'User exists', message: 'A user with this email address already exists' };
    }
    
    const validRoles = ['admin', 'manager', 'cashier', 'staff'];
    if (!validRoles.includes(role)) {
      return { success: false, status: 400, error: 'Invalid role', message: 'Role must be one of: admin, manager, cashier, staff' };
    }
    
    const passwordHash = await hashPassword(password);
    const employeeId = `EMP${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    const result = await this.db.insert('users', {
      organization_id: currentUser.orgId,
      store_id: store_id || null,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      first_name, last_name, role, phone,
      employee_id: employeeId,
      is_active: true, is_verified: false,
      hire_date: new Date().toISOString().split('T')[0],
      created_by: currentUser.id
    });
    
    const verifyToken = generateSecureToken(32);
    await this.cache.set(`verify_email:${verifyToken}`, result.insertId, 86400 * 3);
    
    if (this.env.EMAIL_QUEUE) {
      try {
        await this.env.EMAIL_QUEUE.send({
          type: 'welcome_email',
          payload: {
            firstName: first_name, lastName: last_name, employeeId, role,
            tempPassword: password, verifyToken, verifyUrl: `${frontendUrl}/verify-email?token=${verifyToken}`
          }
        });
      } catch (e) {
        console.error('Queue error:', e);
      }
    }
    
    return {
      success: true,
      message: 'User registered successfully',
      user: { id: result.insertId, email, firstName: first_name, lastName: last_name, role, employeeId }
    };
  }

  /**
   * Setup 2FA
   */
  async setup2FA(userId, email) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    await this.db.execute({
      sql: `UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1, updated_at = datetime('now') WHERE id = ?`,
      args: [secret, userId]
    });
    
    return {
      success: true,
      message: '2FA enabled successfully',
      secret: secret,
      uri: `otpauth://totp/MMNextPOS:${email}?secret=${secret}&issuer=MMNextPOS`
    };
  }

  /**
   * Verify Email
   */
  async verifyEmail(token) {
    const userId = await this.cache.get(`verify_email:${token}`);
    if (!userId) {
      return { success: false, status: 400, error: 'Invalid token', message: 'Verification token is invalid or has expired' };
    }
    
    await this.db.execute({
      sql: `UPDATE users SET is_verified = 1, updated_at = datetime('now') WHERE id = ?`,
      args: [userId]
    });
    
    await this.cache.delete(`verify_email:${token}`);
    return { success: true, message: 'Email address verified successfully' };
  }

  /**
   * Forgot Password
   */
  async forgotPassword(email, frontendUrl) {
    const user = await this.db.first({
      sql: `SELECT id, first_name FROM users WHERE email = ? AND is_active = 1 AND deleted_at IS NULL`,
      args: [email.toLowerCase()]
    });
    
    if (user) {
      const resetToken = generateSecureToken(32);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      
      await this.db.execute({
        sql: `UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?`,
        args: [resetToken, expiresAt, user.id]
      });
      
      if (this.env.EMAIL_QUEUE) {
        try {
          await this.env.EMAIL_QUEUE.send({
            type: 'password_reset',
            payload: {
              firstName: user.first_name,
              resetUrl: `${frontendUrl}/reset-password?token=${resetToken}`
            }
          });
        } catch (e) {
          console.error('Queue error:', e);
        }
      }
    }
    
    return { success: true, message: 'If an account with that email exists, a password reset link has been sent' };
  }

  /**
   * Reset Password
   */
  async resetPassword(token, new_password) {
    const user = await this.db.first({
      sql: `SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expires > datetime('now') AND deleted_at IS NULL`,
      args: [token]
    });
    
    if (!user) {
      return { success: false, status: 400, error: 'Invalid token', message: 'Password reset token is invalid or has expired' };
    }
    
    const passwordHash = await hashPassword(new_password);
    
    await this.db.execute({
      sql: `UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL, updated_at = datetime('now') WHERE id = ?`,
      args: [passwordHash, user.id]
    });
    
    return { success: true, message: 'Password has been reset successfully' };
  }
}
