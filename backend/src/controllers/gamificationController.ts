import { Context } from 'hono';
import { GamificationService } from '../services/gamificationService.js';
import { AppError, ValidationError } from '../utils/errorHandler.js';

export class GamificationController {
  
  // --- ADMIN: MANAGE ACHIEVEMENTS ---

  static async getAchievements(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const gamificationService = new GamificationService(c.env);
      const achievements = await gamificationService.getAchievements(orgId);

      return c.json({ data: achievements });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch achievements', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async createAchievement(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const data = await c.req.json();
      const gamificationService = new GamificationService(c.env);
      const achievement = await gamificationService.createAchievement(orgId, data);

      return c.json({ data: achievement }, 201);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create achievement', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async updateAchievement(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const id = c.req.param('id');
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const data = await c.req.json();
      const gamificationService = new GamificationService(c.env);
      const achievement = await gamificationService.updateAchievement(orgId, id, data);

      return c.json({ data: achievement });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update achievement', 'INTERNAL_ERROR', 500, error);
    }
  }

  // --- STAFF: VIEW PROGRESS & LEADERBOARD ---

  static async getUserAchievements(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const targetUserId = c.req.param('userId');
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const gamificationService = new GamificationService(c.env);
      const achievements = await gamificationService.getUserAchievements(orgId, targetUserId);

      return c.json({ data: achievements });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch user achievements', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async recordProgress(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      const targetUserId = c.req.param('userId');
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const { achievementId, valueToAdd } = await c.req.json();
      if (!achievementId || valueToAdd === undefined) {
        throw new ValidationError('achievementId and valueToAdd are required');
      }

      const gamificationService = new GamificationService(c.env);
      const result = await gamificationService.recordProgress(orgId, targetUserId, achievementId, Number(valueToAdd));

      return c.json(result);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to record progress', 'INTERNAL_ERROR', 500, error);
    }
  }

  static async getLeaderboard(c: Context) {
    try {
      const user = c.get('user');
      const orgId = user?.orgId || user?.organization_id;
      if (!orgId) throw new ValidationError('Organization ID is missing');

      const gamificationService = new GamificationService(c.env);
      const leaderboard = await gamificationService.getLeaderboard(orgId);

      return c.json({ data: leaderboard });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch leaderboard', 'INTERNAL_ERROR', 500, error);
    }
  }
}
