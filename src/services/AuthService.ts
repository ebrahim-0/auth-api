import { userRepository } from '../repositories/UserRepository';
import { tokenRepository } from '../repositories/TokenRepository';
import { sessionService } from './SessionService';
import { tokenService } from './TokenService';
import { emailService } from './EmailService';
import { twoFactorService } from './TwoFactorService';
import { IUser, LoginResponse, TwoFactorSetup } from '../types';
import { logger } from '../utils/logger';

export class AuthService {
  private toPublicUser(user: IUser): LoginResponse['user'] {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      username: user.username,
      age: user.age,
      isVerified: user.isVerified,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }

  async register(
    email: string,
    password: string,
    profile: { name: string; username: string; age: number }
  ): Promise<IUser> {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const existingUsername = await userRepository.findByUsername(profile.username);
    if (existingUsername) {
      throw new Error('Username is already taken');
    }

    const user = await userRepository.create(email, password, profile);

    const verificationToken = tokenService.generateVerificationToken();
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24);

    await userRepository.update(user._id.toString(), {
      verificationToken,
      verificationTokenExpiry,
    });

    await emailService.sendVerificationEmail(email, verificationToken);

    logger.info(`User registered: ${email}`);

    return user;
  }

  async login(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResponse> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (user.isLocked()) {
      const lockTime = Math.ceil((user.lockUntil!.getTime() - Date.now()) / 60000);
      throw new Error(`Account is locked. Try again in ${lockTime} minutes`);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      throw new Error('Invalid email or password');
    }

    await user.resetLoginAttempts();

    if (user.twoFactorEnabled) {
      const tempToken = tokenService.generateTempToken(user._id.toString());

      logger.info(`2FA required for user: ${email}`);

      return {
        user: this.toPublicUser(user),
        tokens: { accessToken: '', refreshToken: '' },
        sessionId: '',
        requiresTwoFactor: true,
        tempToken,
      };
    }

    const { session, tokens, sessionId } = await sessionService.createSession(
      user._id.toString(),
      ipAddress,
      userAgent
    );

    logger.info(`User logged in: ${email}`);

    return {
      user: this.toPublicUser(user),
      tokens,
      sessionId,
    };
  }

  async verify2FA(
    tempToken: string,
    code: string,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResponse> {
    const decoded = tokenService.verifyTempToken(tempToken);
    if (!decoded) {
      throw new Error('Invalid or expired temporary token');
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isSetupFlow = !user.twoFactorEnabled && !!user.twoFactorSecret;
    const isLoginFlow = user.twoFactorEnabled && !!user.twoFactorSecret;

    if (!isSetupFlow && !isLoginFlow) {
      throw new Error('Two-factor authentication is not configured');
    }

    const isValidToken = twoFactorService.verifyToken(user.twoFactorSecret!, code);

    if (!isValidToken) {
      if (user.backupCodes && user.backupCodes.length > 0) {
        const matchingCode = await twoFactorService.findMatchingBackupCode(code, user.backupCodes);

        if (matchingCode) {
          await userRepository.useBackupCode(user._id.toString(), matchingCode);
          logger.info(`Backup code used for user: ${user.email}`);
        } else {
          throw new Error('Invalid verification code');
        }
      } else {
        throw new Error('Invalid verification code');
      }
    }

    // Setup flow: activate 2FA now that the user has verified their first code
    if (isSetupFlow) {
      await userRepository.activate2FA(user._id.toString());
      await emailService.send2FAEnabledEmail(user.email);
      logger.info(`2FA activated for user: ${user.email}`);
    }

    const { session, tokens, sessionId } = await sessionService.createSession(
      user._id.toString(),
      ipAddress,
      userAgent
    );

    logger.info(`2FA verified and user logged in: ${user.email}`);

    return {
      user: this.toPublicUser(user),
      tokens,
      sessionId,
    };
  }

  async logout(sessionId: string): Promise<void> {
    await sessionService.revokeSession(sessionId);
    logger.info(`User logged out, session: ${sessionId}`);
  }

  async logoutAll(userId: string): Promise<void> {
    await sessionService.revokeAllUserSessions(userId);
    logger.info(`All sessions logged out for user: ${userId}`);
  }

  async verifyEmail(token: string): Promise<IUser> {
    const user = await userRepository.findByVerificationToken(token);
    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    const verifiedUser = await userRepository.markEmailAsVerified(user._id.toString());
    if (!verifiedUser) {
      throw new Error('Failed to verify email');
    }

    await emailService.sendWelcomeEmail(user.email);

    logger.info(`Email verified for user: ${user.email}`);

    return verifiedUser;
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isVerified) {
      throw new Error('Email is already verified');
    }

    const verificationToken = tokenService.generateVerificationToken();
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24);

    await userRepository.update(user._id.toString(), {
      verificationToken,
      verificationTokenExpiry,
    });

    await emailService.sendVerificationEmail(email, verificationToken);

    logger.info(`Verification email resent to: ${email}`);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    const resetToken = tokenService.generatePasswordResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await tokenRepository.createPasswordReset(user._id.toString(), resetToken, expiresAt);

    await emailService.sendPasswordResetEmail(email, resetToken);

    logger.info(`Password reset requested for: ${email}`);
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const passwordReset = await tokenRepository.findPasswordResetByToken(token);
    if (!passwordReset) {
      throw new Error('Invalid or expired password reset token');
    }

    const user = await userRepository.updatePassword(passwordReset.userId, newPassword);
    if (!user) {
      throw new Error('User not found');
    }

    await tokenRepository.markPasswordResetAsUsed(passwordReset._id.toString());

    await sessionService.revokeAllUserSessions(user._id.toString());

    logger.info(`Password reset completed for user: ${user.email}`);
  }

  async changePassword(
    userId: string,
    currentSessionId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    if (currentPassword === newPassword) {
      throw new Error('New password must be different from current password');
    }

    await userRepository.changePassword(userId, newPassword);

    await sessionService.revokeAllUserSessionsExcept(userId, currentSessionId);

    await emailService.sendPasswordChangedEmail(user.email);

    logger.info(`Password changed for user: ${user.email}`);
  }

  async setup2FA(userId: string): Promise<TwoFactorSetup> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new Error('Two-factor authentication is already enabled');
    }

    const setup = await twoFactorService.generateSecret(user.email);

    const hashedBackupCodes = await twoFactorService.hashBackupCodes(setup.backupCodes);

    // Store secret but keep twoFactorEnabled=false until user verifies
    await userRepository.store2FASecret(userId, setup.secret, hashedBackupCodes);

    const tempToken = tokenService.generateTempToken(user._id.toString());

    logger.info(`2FA setup completed for user: ${user.email}`);

    return {
      ...setup,
      tempToken,
    };
  }

  async disable2FA(userId: string, password: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new Error('Two-factor authentication is not enabled');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    await userRepository.disable2FA(userId);

    await emailService.send2FADisabledEmail(user.email);

    logger.info(`2FA disabled for user: ${user.email}`);
  }
}

export const authService = new AuthService();
