import { sessionRepository } from '../repositories/SessionRepository';
import { tokenRepository } from '../repositories/TokenRepository';
import { tokenService } from './TokenService';
import { ISession, SessionInfo, TokenPair } from '../types';
import { logger } from '../utils/logger';

export class SessionService {
  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ session: ISession; tokens: TokenPair; sessionId: string }> {
    const expiresAt = tokenService.getAccessTokenExpiry();

    // Create session first to get the real _id, then sign tokens with it
    const placeholderSession = await sessionRepository.create(
      userId,
      'pending',
      'pending',
      ipAddress,
      userAgent,
      expiresAt
    );

    const sessionId = placeholderSession._id.toString();
    const tokens = tokenService.generateTokenPair(userId, sessionId);

    // Update session with real tokens
    await sessionRepository.updateAccessToken(sessionId, tokens.accessToken);
    await sessionRepository.updateRefreshToken(sessionId, tokens.refreshToken);

    const refreshTokenExpiry = tokenService.getRefreshTokenExpiry();
    await tokenRepository.createRefreshToken(
      userId,
      tokens.refreshToken,
      sessionId,
      refreshTokenExpiry
    );

    logger.info(`Session created for user ${userId}`);

    return {
      session: placeholderSession,
      tokens,
      sessionId,
    };
  }

  async validateSession(accessToken: string): Promise<ISession | null> {
    const payload = tokenService.verifyAccessToken(accessToken);
    if (!payload) {
      return null;
    }

    const session = await sessionRepository.findByAccessToken(accessToken);
    if (!session || !session.isActive) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      await sessionRepository.revokeSession(session._id.toString());
      return null;
    }

    return session;
  }

  async refreshSession(refreshToken: string): Promise<TokenPair | null> {
    const tokenRecord = await tokenRepository.findRefreshToken(refreshToken);
    console.log("🚀 ~ SessionService ~ refreshSession ~ tokenRecord:", tokenRecord)
    if (!tokenRecord || tokenRecord.isRevoked) {
      logger.warn('Invalid or revoked refresh token');
      return null;
    }

    if (tokenRecord.expiresAt < new Date()) {
      logger.warn('Expired refresh token');
      return null;
    }

    const session = await sessionRepository.findById(tokenRecord.sessionId);
    if (!session || !session.isActive) {
      logger.warn('Session not found or inactive');
      return null;
    }

    // Revoke old token
    await tokenRepository.revokeRefreshToken(refreshToken);

    // Generate new token pair
    const newTokens = tokenService.generateTokenPair(session.userId, session._id.toString());
    const newSessionExpiry = tokenService.getAccessTokenExpiry();

    await sessionRepository.updateAccessToken(session._id.toString(), newTokens.accessToken);
    await sessionRepository.updateRefreshToken(session._id.toString(), newTokens.refreshToken);
    await sessionRepository.updateExpiry(session._id.toString(), newSessionExpiry);

    const newExpiresAt = tokenService.getRefreshTokenExpiry();
    await tokenRepository.createRefreshToken(
      session.userId,
      newTokens.refreshToken,
      session._id.toString(),
      newExpiresAt
    );

    logger.info(`Session refreshed for user ${session.userId}`);

    console.log("🚀 ~ SessionService ~ refreshSession ~ newTokens:", newTokens)
    return newTokens;
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    const revoked = await sessionRepository.revokeSession(sessionId);
    if (revoked) {
      await tokenRepository.revokeRefreshTokensBySessionId(sessionId);
      logger.info(`Session ${sessionId} revoked`);
    }
    return revoked;
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const count = await sessionRepository.revokeAllUserSessions(userId);
    await tokenRepository.revokeAllUserRefreshTokens(userId);
    logger.info(`All sessions revoked for user ${userId}`);
    return count;
  }

  async revokeAllUserSessionsExcept(userId: string, currentSessionId: string): Promise<number> {
    const count = await sessionRepository.revokeAllUserSessionsExcept(userId, currentSessionId);
    await tokenRepository.revokeRefreshTokensExceptSession(userId, currentSessionId);
    logger.info(`All sessions except current revoked for user ${userId}`);
    return count;
  }

  async getUserSessions(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
    const sessions = await sessionRepository.findActiveSessionsByUserId(userId);

    return sessions.map((session) => ({
      sessionId: session._id.toString(),
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isActive: session.isActive,
      isCurrent: session._id.toString() === currentSessionId,
    }));
  }

  async cleanupExpiredSessions(): Promise<void> {
    const deletedSessions = await sessionRepository.deleteExpiredSessions();
    const deletedTokens = await tokenRepository.deleteExpiredRefreshTokens();
    const deletedPasswordResets = await tokenRepository.deleteExpiredPasswordResets();

    logger.info(
      `Cleanup completed: ${deletedSessions} sessions, ${deletedTokens} tokens, ${deletedPasswordResets} password resets`
    );
  }
}

export const sessionService = new SessionService();
