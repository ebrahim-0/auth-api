import { Request, Response, NextFunction } from 'express';

/** Attaches req.lang from Accept-Language header. Defaults to 'en'. */
export const i18nMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const header = req.headers['accept-language'] || '';
  const lang = header.trim().toLowerCase().startsWith('ar') ? 'ar' : 'en';
  (req as any).lang = lang;
  next();
};
