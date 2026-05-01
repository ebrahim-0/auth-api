import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { sessionService } from '../services/SessionService';
import { userRepository } from '../repositories/UserRepository';
import { unauthorizedResponse } from '../utils/response';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const lang = req.lang || 'en';
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      unauthorizedResponse(res, t(lang, 'middleware.noTokenProvided'));
      return;
    }

    const token = authHeader.substring(7);

    const session = await sessionService.validateSession(token);

    if (!session) {
      unauthorizedResponse(res, t(lang, 'middleware.invalidOrExpiredToken'));
      return;
    }

    const user = await userRepository.findById(session.userId);

    if (!user) {
      unauthorizedResponse(res, t(lang, 'middleware.userNotFound'));
      return;
    }

    req.user = {
      userId: user._id.toString(),
      sessionId: session._id.toString(),
      email: user.email,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    unauthorizedResponse(res, t(lang, 'middleware.authenticationFailed'));
  }
};

export const optionalAuthenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    const session = await sessionService.validateSession(token);

    if (session) {
      const user = await userRepository.findById(session.userId);

      if (user) {
        req.user = {
          userId: user._id.toString(),
          sessionId: session._id.toString(),
          email: user.email,
        };
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next();
  }
};

export const requireEmailVerification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const lang = req.lang || 'en';

  if (!req.user) {
    unauthorizedResponse(res, t(lang, 'auth.authenticationRequired'));
    return;
  }

  const user = await userRepository.findById(req.user.userId);

  if (!user) {
    unauthorizedResponse(res, t(lang, 'middleware.userNotFound'));
    return;
  }

  if (!user.isVerified) {
    unauthorizedResponse(res, t(lang, 'middleware.emailVerificationRequired'));
    return;
  }

  next();
};
