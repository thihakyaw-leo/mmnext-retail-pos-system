import { Env } from '../types/env.js';
import { AppError } from '../utils/errorHandler.js';

export class GamificationService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  // --- ADMIN: MANAGE ACHIEVEMENTS ---

  async getAchievements(orgId: string | number) {
    const query = `SELECT * FROM achievements WHERE organization_id = ? ORDER BY created_at DESC`;
    const { results } = await this.db.prepare(query).bind(orgId).all();
    return results.map(this.parseBooleanFields);
  }

  async createAchievement(orgId: string | number, data: any) {
    const query = `
      INSERT INTO achievements (
        organization_id, name, description, icon, badge_color, 
        category, condition_type, condition_value, condition_period, 
        points_reward, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `;

    const params = [
      orgId,
      data.name,
      data.description || null,
      data.icon || null,
      data.badge_color || '#1890ff',
      data.category || null,
      data.condition_type,
      data.condition_value,
      data.condition_period || null,
      data.points_reward || 0,
      data.is_active !== false ? 1 : 0
    ];

    const { results } = await this.db.prepare(query).bind(...params).all();
    return this.parseBooleanFields(results[0]);
  }

  async updateAchievement(orgId: string | number, achievementId: string | number, data: any) {
    const updates: string[] = [];
    const params: any[] = [];

    const fields = [
      'name', 'description', 'icon', 'badge_color', 'category',
      'condition_type', 'condition_value', 'condition_period', 'points_reward'
    ];

    fields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    });

    if (data.is_active !== undefined) {
      updates.push(`is_active = ?`);
      params.push(data.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 'VALIDATION_ERROR', 400);
    }

    updates.push(`created_at = created_at`); // Dummy to join if needed, but actually we don't have updated_at in schema. Let's just avoid if not needed.
    params.push(achievementId, orgId);

    const query = `
      UPDATE achievements 
      SET ${updates.join(', ')} 
      WHERE id = ? AND organization_id = ?
      RETURNING *
    `;

    const { results } = await this.db.prepare(query).bind(...params).all();
    if (!results || results.length === 0) {
      throw new AppError('Achievement not found', 'NOT_FOUND', 404);
    }

    return this.parseBooleanFields(results[0]);
  }

  // --- STAFF: USER ACHIEVEMENTS & LEADERBOARD ---

  async getUserAchievements(orgId: string | number, userId: string | number) {
    // We join with achievements to get badge details
    const query = `
      SELECT 
        ua.id as user_achievement_id, ua.earned_at, ua.progress_value,
        a.*
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = ? AND a.organization_id = ?
      ORDER BY ua.earned_at DESC
    `;

    const { results } = await this.db.prepare(query).bind(userId, orgId).all();
    return results.map(this.parseBooleanFields);
  }

  async recordProgress(orgId: string | number, userId: string | number, achievementId: string | number, valueToAdd: number) {
    // 1. Fetch the achievement to know the target condition
    const achievementQuery = `SELECT * FROM achievements WHERE id = ? AND organization_id = ? AND is_active = 1`;
    const achievementRecord = await this.db.prepare(achievementQuery).bind(achievementId, orgId).first();

    if (!achievementRecord) {
      throw new AppError('Active achievement not found', 'NOT_FOUND', 404);
    }

    const targetValue = Number(achievementRecord.condition_value);

    // 2. Fetch existing user progress
    const existingProgressQuery = `SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?`;
    const existingRecord = await this.db.prepare(existingProgressQuery).bind(userId, achievementId).first();

    // If already earned, we don't necessarily need to add progress unless it's a repeatable badge (for now schema assumes one-time unlock per badge)
    if (existingRecord && existingRecord.earned_at !== null) {
      return { success: true, message: 'Achievement already earned', earned: true, progress: existingRecord.progress_value };
    }

    const currentProgress = existingRecord ? Number(existingRecord.progress_value || 0) : 0;
    const newProgress = currentProgress + valueToAdd;
    
    // Check if target met
    const isEarned = newProgress >= targetValue;
    const earnedAtQuery = isEarned ? 'CURRENT_TIMESTAMP' : 'NULL';

    if (existingRecord) {
      await this.db.prepare(`
        UPDATE user_achievements 
        SET progress_value = ?, earned_at = ${earnedAtQuery}
        WHERE user_id = ? AND achievement_id = ?
      `).bind(newProgress, userId, achievementId).run();
    } else {
      await this.db.prepare(`
        INSERT INTO user_achievements (user_id, achievement_id, progress_value, earned_at)
        VALUES (?, ?, ?, ${earnedAtQuery})
      `).bind(userId, achievementId, newProgress).run();
    }

    return { 
      success: true, 
      earned: isEarned, 
      progress: newProgress,
      target: targetValue,
      badge: isEarned ? achievementRecord.name : null
    };
  }

  async getLeaderboard(orgId: string | number) {
    // Dynamically calculate total points from earned achievements for each user
    const query = `
      SELECT 
        u.id as user_id, 
        u.name, 
        u.avatar_url,
        COALESCE(SUM(a.points_reward), 0) as total_points,
        COUNT(ua.id) as badges_earned
      FROM users u
      LEFT JOIN user_achievements ua ON u.id = ua.user_id AND ua.earned_at IS NOT NULL
      LEFT JOIN achievements a ON ua.achievement_id = a.id AND a.organization_id = ?
      WHERE u.organization_id = ? AND u.is_active = 1
      GROUP BY u.id
      HAVING total_points > 0
      ORDER BY total_points DESC
      LIMIT 100
    `;

    const { results } = await this.db.prepare(query).bind(orgId, orgId).all();
    return results;
  }

  private parseBooleanFields(record: any) {
    if (!record) return null;
    const parsed = { ...record };
    if (parsed.is_active !== undefined) {
      parsed.is_active = parsed.is_active === 1 || parsed.is_active === true;
    }
    return parsed;
  }
}
