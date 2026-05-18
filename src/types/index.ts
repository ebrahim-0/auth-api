import { Request } from 'express';
import { Document, Types } from 'mongoose';

export type OAuthProvider = 'google' | 'github';

export interface IOAuthProvider extends Document {
  _id: Types.ObjectId;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  name?: string;
  accessToken?: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password?: string;
  hasPassword: boolean;
  name: string;
  username?: string;
  age?: number;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  backupCodes?: string[];
  loginAttempts: number;
  lockUntil?: Date;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
}

export interface ISession extends Document {
  _id: Types.ObjectId;
  userId: string;
  accessToken: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  provider?: OAuthProvider;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  userId: string;
  token: string;
  sessionId: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPasswordReset extends Document {
  _id: Types.ObjectId;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    sessionId: string;
    email: string;
  };
  lang?: string;
}

export interface JWTPayload {
  userId: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    username?: string;
    age?: number;
    isVerified: boolean;
    twoFactorEnabled: boolean;
  };
  tokens: TokenPair;
  sessionId: string;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

export interface SessionInfo {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  isCurrent: boolean;
  provider?: OAuthProvider;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

export interface TwoFactorSecret {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorSetup extends TwoFactorSecret {
  tempToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  username: string;
  age: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface PasswordResetRequestInput {
  email: string;
}

export interface PasswordResetConfirmInput {
  token: string;
  newPassword: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface TwoFactorVerifyInput {
  tempToken: string;
  code: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface TwoFactorDisableInput {
  password: string;
}

export interface OAuthStateEntry {
  provider: OAuthProvider;
  createdAt: number;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  picture?: string;
}

export interface GitHubTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  scope: string;
}

export interface GitHubUserInfo {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
}

export interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export interface OAuthUserProfile {
  providerUserId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken?: string;
}
