import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  MONGODB_TEST_URI: string;
  JWT_SECRET: string;
  JWT_ACCESS_TOKEN_EXPIRY: string;
  JWT_REFRESH_TOKEN_EXPIRY: string;
  BCRYPT_ROUNDS: number;
  SESSION_EXPIRY_MINUTES: number;
  REFRESH_TOKEN_EXPIRY_DAYS: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  AUTH_RATE_LIMIT_MAX_REQUESTS: number;
  MAX_LOGIN_ATTEMPTS: number;
  LOCK_TIME_MINUTES: number;
  EMAIL_SERVICE: string;
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_SECURE: boolean;
  EMAIL_USER: string;
  EMAIL_PASSWORD: string;
  EMAIL_FROM: string;
  FRONTEND_URL: string;
  LOG_LEVEL: string;
  LOG_FILE: string;
  CORS_ORIGIN: string;
}

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return (value ?? defaultValue!).trim();
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value ? parseInt(value, 10) : defaultValue!;
};

const getEnvBoolean = (key: string, defaultValue = false): boolean => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const env: EnvConfig = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: getEnvNumber('PORT', 3000),
  MONGODB_URI: getEnv('MONGODB_URI', 'mongodb://localhost:27017/auth-api'),
  MONGODB_TEST_URI: getEnv('MONGODB_TEST_URI', 'mongodb://localhost:27017/auth-api-test'),
  JWT_SECRET: getEnv('JWT_SECRET'),
  JWT_ACCESS_TOKEN_EXPIRY: getEnv('JWT_ACCESS_TOKEN_EXPIRY', '15m'),
  JWT_REFRESH_TOKEN_EXPIRY: getEnv('JWT_REFRESH_TOKEN_EXPIRY', '7d'),
  BCRYPT_ROUNDS: getEnvNumber('BCRYPT_ROUNDS', 12),
  SESSION_EXPIRY_MINUTES: getEnvNumber('SESSION_EXPIRY_MINUTES', 15),
  REFRESH_TOKEN_EXPIRY_DAYS: getEnvNumber('REFRESH_TOKEN_EXPIRY_DAYS', 7),
  RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000),
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  AUTH_RATE_LIMIT_MAX_REQUESTS: getEnvNumber('AUTH_RATE_LIMIT_MAX_REQUESTS', 5),
  MAX_LOGIN_ATTEMPTS: getEnvNumber('MAX_LOGIN_ATTEMPTS', 5),
  LOCK_TIME_MINUTES: getEnvNumber('LOCK_TIME_MINUTES', 15),
  EMAIL_SERVICE: getEnv('EMAIL_SERVICE', 'smtp'),
  EMAIL_HOST: getEnv('EMAIL_HOST', 'smtp.gmail.com'),
  EMAIL_PORT: getEnvNumber('EMAIL_PORT', 587),
  EMAIL_SECURE: getEnvBoolean('EMAIL_SECURE', false),
  EMAIL_USER: getEnv('EMAIL_USER', ''),
  EMAIL_PASSWORD: getEnv('EMAIL_PASSWORD', ''),
  EMAIL_FROM: getEnv('EMAIL_FROM', 'noreply@example.com'),
  FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:3000'),
  LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),
  LOG_FILE: getEnv('LOG_FILE', 'logs/app.log'),
  CORS_ORIGIN: getEnv('CORS_ORIGIN', 'http://localhost:3000'),
};
