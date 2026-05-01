import { Response } from 'express';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export const successResponse = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };

  return res.status(statusCode).json(response);
};

export const errorResponse = (
  res: Response,
  message: string,
  statusCode = 400,
  error?: string
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    error,
  };

  return res.status(statusCode).json(response);
};

export const createdResponse = <T>(
  res: Response,
  data: T,
  message = 'Resource created successfully'
): Response => {
  return successResponse(res, data, message, 201);
};

export const noContentResponse = (res: Response): Response => {
  return res.status(204).send();
};

export const unauthorizedResponse = (
  res: Response,
  message = 'Unauthorized access'
): Response => {
  return errorResponse(res, message, 401);
};

export const forbiddenResponse = (
  res: Response,
  message = 'Forbidden access'
): Response => {
  return errorResponse(res, message, 403);
};

export const notFoundResponse = (
  res: Response,
  message = 'Resource not found'
): Response => {
  return errorResponse(res, message, 404);
};

export const conflictResponse = (
  res: Response,
  message = 'Resource already exists'
): Response => {
  return errorResponse(res, message, 409);
};

export const validationErrorResponse = (
  res: Response,
  errors: any[]
): Response => {
  return res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors,
  });
};

export const serverErrorResponse = (
  res: Response,
  message = 'Internal server error',
  error?: string
): Response => {
  return errorResponse(res, message, 500, error);
};
