import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { forbiddenResponse } from '../utils/response';
import { t } from '../utils/i18n';
import { AuthRequest } from '../types';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const TOKEN_BYTES = 32;

/** Generates a cryptographically random hex token and sets it as a readable cookie. */
export const setCsrfCookie = (res: Response): string => {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,   // must be readable by JS so the client can attach it to headers
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 h
  });
  return token;
};

/**
 * Validates X-CSRF-Token header against the csrf_token cookie.
 * Apply only to state-mutating routes (POST/PUT/PATCH/DELETE).
 * Safe methods (GET/HEAD/OPTIONS) are skipped automatically.
 */
export const csrfProtect = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  const lang = req.lang || 'en';
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;
  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;

  if (!headerToken || !cookieToken) {
    forbiddenResponse(res, t(lang, 'csrf.missingToken'));
    return;
  }

  // Constant-time comparison prevents timing attacks
  const headerBuf = Buffer.from(headerToken);
  const cookieBuf = Buffer.from(cookieToken);

  if (
    headerBuf.length !== cookieBuf.length ||
    !crypto.timingSafeEqual(headerBuf, cookieBuf)
  ) {
    forbiddenResponse(res, t(lang, 'csrf.invalidToken'));
    return;
  }

  next();
};
