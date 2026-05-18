import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JWTPayload, TokenPair } from '../types';
import { generateRandomToken } from '../utils/crypto';

export class TokenService {
  generateAccessToken(userId: string, sessionId: string): string {
    const payload: JWTPayload = {
      userId,
      sessionId,
      type: 'access',
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_TOKEN_EXPIRY as any,
    });
  }

  generateRefreshToken(): string {
    return generateRandomToken(64);
  }

  generateTokenPair(userId: string, sessionId: string): TokenPair {
    const accessToken = this.generateAccessToken(userId, sessionId);
    const refreshToken = this.generateRefreshToken();

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      if (decoded.type !== 'access') {
        return null;
      }
      return decoded;
    } catch (error) {
      return null;
    }
  }

  getAccessTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + env.SESSION_EXPIRY_MINUTES);
    return expiry;
  }

  getRefreshTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + env.REFRESH_TOKEN_EXPIRY_DAYS);
    return expiry;
  }

  generateVerificationToken(): string {
    return generateRandomToken(32);
  }

  generatePasswordResetToken(): string {
    return generateRandomToken(32);
  }

  generateTempToken(userId: string): string {
    const payload = {
      userId,
      type: 'temp',
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '10m' as any,
    });
  }

  verifyTempToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      if (decoded.type !== 'temp') {
        return null;
      }
      return { userId: decoded.userId };
    } catch (error) {
      return null;
    }
  }
}

export const tokenService = Object.freeze(new TokenService());
