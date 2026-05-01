import { Session } from '../models/Session';
import { ISession } from '../types';

export class SessionRepository {
  async create(
    userId: string,
    accessToken: string,
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
    expiresAt: Date
  ): Promise<ISession> {
    const session = new Session({
      userId,
      accessToken,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt,
      isActive: true,
    });
    return session.save();
  }

  async findById(sessionId: string): Promise<ISession | null> {
    return Session.findById(sessionId);
  }

  async findByAccessToken(accessToken: string): Promise<ISession | null> {
    return Session.findOne({ accessToken, isActive: true });
  }

  async findByRefreshToken(refreshToken: string): Promise<ISession | null> {
    return Session.findOne({ refreshToken, isActive: true });
  }

  async findActiveSessionsByUserId(userId: string): Promise<ISession[]> {
    return Session.find({ userId, isActive: true }).sort({ createdAt: -1 });
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    const result = await Session.updateOne(
      { _id: sessionId },
      { isActive: false }
    );
    return result.modifiedCount > 0;
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await Session.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );
    return result.modifiedCount;
  }

  async revokeAllUserSessionsExcept(userId: string, currentSessionId: string): Promise<number> {
    const result = await Session.updateMany(
      { userId, isActive: true, _id: { $ne: currentSessionId } },
      { isActive: false }
    );
    return result.modifiedCount;
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await Session.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    return result.deletedCount;
  }

  async updateAccessToken(sessionId: string, newAccessToken: string): Promise<boolean> {
    const result = await Session.updateOne(
      { _id: sessionId },
      { accessToken: newAccessToken }
    );
    return result.modifiedCount > 0;
  }

  async updateRefreshToken(sessionId: string, refreshToken: string): Promise<boolean> {
    const result = await Session.updateOne(
      { _id: sessionId },
      { refreshToken }
    );
    return result.modifiedCount > 0;
  }

  async updateExpiry(sessionId: string, expiresAt: Date): Promise<boolean> {
    const result = await Session.updateOne(
      { _id: sessionId },
      { expiresAt }
    );
    return result.modifiedCount > 0;
  }
}

export const sessionRepository = new SessionRepository();
