import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { serverErrorResponse } from '../utils/response';
import { t } from '../utils/i18n';

export interface CustomError extends Error {
  statusCode?: number;
  errors?: any[];
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  const lang = (req as any).lang || 'en';
  const statusCode = err.statusCode || 500;
  const message = err.message || t(lang, 'middleware.internalServerError');

  if (statusCode === 500) {
    serverErrorResponse(res, t(lang, 'middleware.unexpectedError'), err.message);
  } else {
    res.status(statusCode).json({
      success: false,
      message,
      errors: err.errors,
    });
  }
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const lang = (req as any).lang || 'en';
  const message = t(lang, 'middleware.routeNotFound', { method: req.method, url: req.url });
  logger.error(`Route ${req.method} ${req.url} not found`);
  res.status(404).json({ success: false, message });
};
