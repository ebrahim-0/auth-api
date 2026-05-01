import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { t } from '../utils/i18n';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    for (const validation of validations) {
      await validation.run(req);
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const lang = (req as any).lang || 'en';
      res.status(422).json({
        success: false,
        message: t(lang, 'middleware.validationFailed'),
        errors: errors.array(),
      });
      return;
    }

    next();
  };
};
