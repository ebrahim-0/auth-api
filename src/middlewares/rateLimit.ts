import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { errorResponse } from '../utils/response';
import { t } from '../utils/i18n';

export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const lang = (req as any).lang || 'en';
    errorResponse(res, t(lang, 'rateLimit.tooManyRequests'), 429);
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    const lang = (req as any).lang || 'en';
    errorResponse(res, t(lang, 'rateLimit.tooManyAuthAttempts'), 429);
  },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const lang = (req as any).lang || 'en';
    errorResponse(res, t(lang, 'rateLimit.tooManyPasswordResets'), 429);
  },
});

export const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const lang = (req as any).lang || 'en';
    errorResponse(res, t(lang, 'rateLimit.tooManyVerificationRequests'), 429);
  },
});
