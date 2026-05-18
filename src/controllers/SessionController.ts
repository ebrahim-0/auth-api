import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { userRepository } from '../repositories/UserRepository';
import { sessionService } from '../services/SessionService';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '../utils/response';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';

export class SessionController {
  async getCurrentUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const lang = req.lang || 'en';
    try {
      if (!req.user) {
        unauthorizedResponse(res, t(lang, 'middleware.unauthorizedAccess'));
        return;
      }

      const user = await userRepository.findById(req.user.userId);

      if (!user) {
        notFoundResponse(res, t(lang, 'middleware.userNotFound'));
        return;
      }

      successResponse(res, {
        id: user._id,
        email: user.email,
        name: user.name,
        username: user.username,
        age: user.age,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
      }, t(lang, 'session.userDataSuccess'));
    } catch (error: any) {
      logger.error('Get current user error:', error);
      errorResponse(res, t(lang, 'session.userDataFailed'), 500);
    }
  }

  async getCurrentSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const lang = req.lang || 'en';
    try {
      if (!req.user) {
        unauthorizedResponse(res, t(lang, 'middleware.unauthorizedAccess'));
        return;
      }

      const sessions = await sessionService.getUserSessions(req.user.userId, req.user.sessionId);
      const currentSession = sessions.find(s => s.isCurrent);

      if (!currentSession) {
        notFoundResponse(res, t(lang, 'session.sessionNotFound'));
        return;
      }

      successResponse(res, currentSession, t(lang, 'session.currentSessionSuccess'));
    } catch (error: any) {
      logger.error('Get current session error:', error);
      errorResponse(res, t(lang, 'session.sessionDataFailed'), 500);
    }
  }

  async listSessions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const lang = req.lang || 'en';
    try {
      if (!req.user) {
        unauthorizedResponse(res, t(lang, 'middleware.unauthorizedAccess'));
        return;
      }

      const sessions = await sessionService.getUserSessions(req.user.userId, req.user.sessionId);

      successResponse(res, {
        sessions,
        total: sessions.length,
      }, t(lang, 'session.sessionsSuccess'));
    } catch (error: any) {
      logger.error('List sessions error:', error);
      errorResponse(res, t(lang, 'session.sessionsFailed'), 500);
    }
  }

  async revokeSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const lang = req.lang || 'en';
    try {
      if (!req.user) {
        unauthorizedResponse(res, t(lang, 'middleware.unauthorizedAccess'));
        return;
      }

      const { sessionId } = req.params;

      if (!sessionId || typeof sessionId !== 'string') {
        errorResponse(res, t(lang, 'session.invalidSessionId'), 400);
        return;
      }

      const sessions = await sessionService.getUserSessions(req.user.userId);
      const sessionToRevoke = sessions.find(s => s.sessionId === sessionId);

      if (!sessionToRevoke) {
        notFoundResponse(res, t(lang, 'session.sessionNotFoundOrUnauthorized'));
        return;
      }

      const revoked = await sessionService.revokeSession(sessionId);

      if (!revoked) {
        errorResponse(res, t(lang, 'session.sessionRevokeFailed'), 400);
        return;
      }

      successResponse(res, null, t(lang, 'session.sessionRevokedSuccess'));
    } catch (error: any) {
      logger.error('Revoke session error:', error);
      errorResponse(res, t(lang, 'session.sessionRevokeFailed'), 500);
    }
  }

  async revokeAllSessions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const lang = req.lang || 'en';
    try {
      if (!req.user) {
        unauthorizedResponse(res, t(lang, 'middleware.unauthorizedAccess'));
        return;
      }

      const count = await sessionService.revokeAllUserSessionsExcept(
        req.user.userId,
        req.user.sessionId
      );

      successResponse(res, {
        revokedCount: count,
      }, `${count} ${t(lang, 'session.revokeAllSuccess')}`);
    } catch (error: any) {
      logger.error('Revoke all sessions error:', error);
      errorResponse(res, t(lang, 'session.revokeAllFailed'), 500);
    }
  }

}

export const sessionController = Object.freeze(new SessionController());
