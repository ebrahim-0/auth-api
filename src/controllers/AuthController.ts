import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { authService } from '../services/AuthService';
import { sessionService } from '../services/SessionService';
import {
  successResponse,
  createdResponse,
  errorResponse,
  serverErrorResponse,
} from '../utils/response';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    const lang = (req as AuthRequest).lang || 'en';
    try {
      const { email, password, name, username, age } = req.body;

      const user = await authService.register(email, password, { name, username, age: Number(age) });

      createdResponse(res, {
        id: user._id,
        email: user.email,
        name: user.name,
        username: user.username,
        age: user.age,
        isVerified: user.isVerified,
      }, t(lang, 'auth.registerSuccess'));
    } catch (error: any) {
      logger.error('Registration error:', error);
      errorResponse(res, error.message || t(lang, 'auth.registrationFailed'), 400);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    const lang = (req as AuthRequest).lang || 'en';
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const loginResponse = await authService.login(email, password, ipAddress, userAgent);

      if (loginResponse.requiresTwoFactor) {
        successResponse(res, {
          requiresTwoFactor: true,
          tempToken: loginResponse.tempToken,
        }, t(lang, 'auth.twoFactorRequired'));
        return;
      }

      successResponse(res, {
        user: loginResponse.user,
        accessToken: loginResponse.tokens.accessToken,
        refreshToken: loginResponse.tokens.refreshToken,
        sessionId: loginResponse.sessionId,
      }, t(lang, 'auth.loginSuccess'));
    } catch (error: any) {
      logger.error('Login error:', error);
      errorResponse(res, error.message || t(lang, 'auth.loginFailed'), 401);
    }
  }

  async verify2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    const lang = (req as AuthRequest).lang || 'en';
    try {
      const { tempToken, code } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const loginResponse = await authService.verify2FA(tempToken, code, ipAddress, userAgent);

      successResponse(res, {
        user: loginResponse.user,
        accessToken: loginResponse.tokens.accessToken,
        refreshToken: loginResponse.tokens.refreshToken,
        sessionId: loginResponse.sessionId,
      }, t(lang, 'auth.twoFactorSuccess'));
    } catch (error: any) {
      logger.error('2FA verification error:', error);
      errorResponse(res, error.message || t(lang, 'auth.twoFactorFailed'), 401);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const lang = req.lang || 'en';
    try {
      if (!req.user) {
        errorResponse(res, t(lang, 'auth.authenticationRequired'), 401);
        return;
      }

      await authService.logout(req.user.sessionId);

      successResponse(res, null, t(lang, 'auth.logoutSuccess'));
    } catch (error: any) {
      logger.error('Logout error:', error);
      serverErrorResponse(res, t(lang, 'auth.logoutFailed'));
    }
  }

  async logoutAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const lang = req.lang || 'en';
    try {
      if (!req.user) {
        errorResponse(res, t(lang, 'auth.authenticationRequired'), 401);
        return;
      }

      await authService.logoutAll(req.user.userId);

      successResponse(res, null, t(lang, 'auth.logoutAllSuccess'));
    } catch (error: any) {
      logger.error('Logout all error:', error);
      serverErrorResponse(res, t(lang, 'auth.logoutFailed'));
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    const lang = (req as AuthRequest).lang || 'en';
    try {
      const { token } = req.body;

      const user = await authService.verifyEmail(token);

      successResponse(res, {
        id: user._id,
        email: user.email,
        name: user.name,
        username: user.username,
        age: user.age,
        isVerified: user.isVerified,
      }, t(lang, 'auth.emailVerifiedSuccess'));
    } catch (error: any) {
      logger.error('Email verification error:', error);
      errorResponse(res, error.message || t(lang, 'auth.emailVerificationFailed'), 400);
    }
  }

  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    const lang = (req as AuthRequest).lang || 'en';
    try {
      const { email } = req.body;

      await authService.resendVerificationEmail(email);

      successResponse(res, null, t(lang, 'auth.resendVerificationSuccess'));
    } catch (error: any) {
      logger.error('Resend verification error:', error);
      errorResponse(res, error.message || t(lang, 'auth.resendVerificationFailed'), 400);
    }
  }

  async passwordResetRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    const lang = (req as AuthRequest).lang || 'en';
    try {
      const { email } = req.body;

      await authService.requestPasswordReset(email);

      successResponse(res, null, t(lang, 'auth.passwordResetRequestSuccess'));
    } catch (error: any) {
      logger.error('Password reset request error:', error);
      successResponse(res, null, t(lang, 'auth.passwordResetRequestSuccess'));
    }
  }

  async passwordResetConfirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    const lang = (req as AuthRequest).lang || 'en';
    try {
      const { token, newPassword } = req.body;

      await authService.confirmPasswordReset(token, newPassword);

      successResponse(res, null, t(lang, 'auth.passwordResetSuccess'));
    } catch (error: any) {
      logger.error('Password reset confirm error:', error);
      errorResponse(res, error.message || t(lang, 'auth.passwordResetFailed'), 400);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    const lang = (req as AuthRequest).lang || 'en';
    try {
      const { refreshToken } = req.body;

      const tokens = await sessionService.refreshSession(refreshToken);

      if (!tokens) {
        errorResponse(res, t(lang, 'auth.invalidRefreshToken'), 401);
        return;
      }

      successResponse(res, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }, t(lang, 'auth.tokenRefreshedSuccess'));
    } catch (error: any) {
      logger.error('Token refresh error:', error);
      errorResponse(res, t(lang, 'auth.tokenRefreshFailed'), 401);
    }
  }

  async setup2FA(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const lang = req.lang || 'en';
    try {
      if (!req.user) {
        errorResponse(res, t(lang, 'auth.authenticationRequired'), 401);
        return;
      }

      const setup = await authService.setup2FA(req.user.userId);

      successResponse(res, {
        secret: setup.secret,
        qrCode: setup.qrCode,
        backupCodes: setup.backupCodes,
        tempToken: setup.tempToken,
      }, t(lang, 'auth.twoFactorSetupSuccess'));
    } catch (error: any) {
      logger.error('2FA setup error:', error);
      errorResponse(res, error.message || t(lang, 'auth.twoFactorSetupFailed'), 400);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const lang = req.lang || 'en';
    try {
      if (!req.user) {
        errorResponse(res, t(lang, 'auth.authenticationRequired'), 401);
        return;
      }

      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(req.user.userId, req.user.sessionId, currentPassword, newPassword);

      successResponse(res, null, t(lang, 'auth.passwordChangedSuccess'));
    } catch (error: any) {
      logger.error('Change password error:', error);
      errorResponse(res, error.message || t(lang, 'auth.passwordChangeFailed'), 400);
    }
  }

  async disable2FA(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const lang = req.lang || 'en';
    try {
      if (!req.user) {
        errorResponse(res, t(lang, 'auth.authenticationRequired'), 401);
        return;
      }

      const { password } = req.body;

      await authService.disable2FA(req.user.userId, password);

      successResponse(res, null, t(lang, 'auth.twoFactorDisabledSuccess'));
    } catch (error: any) {
      logger.error('2FA disable error:', error);
      errorResponse(res, error.message || t(lang, 'auth.twoFactorDisableFailed'), 400);
    }
  }
}

export const authController = new AuthController();
