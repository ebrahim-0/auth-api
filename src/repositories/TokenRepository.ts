import { RefreshToken } from '../models/RefreshToken';
import { PasswordReset } from '../models/PasswordReset';
import { IRefreshToken, IPasswordReset } from '../types';

export class TokenRepository {
  async createRefreshToken(
    userId: string,
    token: string,
    sessionId: string,
    expiresAt: Date
  ): Promise<IRefreshToken> {
    const refreshToken = new RefreshToken({
      userId,
      token,
      sessionId,
      expiresAt,
      isRevoked: false,
    });
    return refreshToken.save();
  }

  async findRefreshToken(token: string): Promise<IRefreshToken | null> {
    return RefreshToken.findOne({ token, isRevoked: false });
  }

  async revokeRefreshToken(token: string): Promise<boolean> {
    const result = await RefreshToken.updateOne(
      { token },
      { isRevoked: true }
    );
    return result.modifiedCount > 0;
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<number> {
    const result = await RefreshToken.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true }
    );
    return result.modifiedCount;
  }

  async revokeRefreshTokensBySessionId(sessionId: string): Promise<number> {
    const result = await RefreshToken.updateMany(
      { sessionId, isRevoked: false },
      { isRevoked: true }
    );
    return result.modifiedCount;
  }

  async revokeRefreshTokensExceptSession(userId: string, currentSessionId: string): Promise<number> {
    const result = await RefreshToken.updateMany(
      { userId, sessionId: { $ne: currentSessionId }, isRevoked: false },
      { isRevoked: true }
    );
    return result.modifiedCount;
  }

  async deleteExpiredRefreshTokens(): Promise<number> {
    const result = await RefreshToken.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    return result.deletedCount;
  }

  async createPasswordReset(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<IPasswordReset> {
    const passwordReset = new PasswordReset({
      userId,
      token,
      expiresAt,
      used: false,
    });
    return passwordReset.save();
  }

  async findPasswordResetByToken(token: string): Promise<IPasswordReset | null> {
    return PasswordReset.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    });
  }

  async markPasswordResetAsUsed(tokenId: string): Promise<boolean> {
    const result = await PasswordReset.updateOne(
      { _id: tokenId },
      { used: true }
    );
    return result.modifiedCount > 0;
  }

  async deleteExpiredPasswordResets(): Promise<number> {
    const result = await PasswordReset.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    return result.deletedCount;
  }
}

export const tokenRepository = new TokenRepository();
