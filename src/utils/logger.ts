import winston from 'winston';
import { env } from '../config/env';
import path from 'path';
import fs from 'fs';

const isServerless = env.NODE_ENV === 'production' || !!process.env.VERCEL;

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({ format: consoleFormat }),
];

if (!isServerless) {
  // Each server start gets its own log folder: logs/2026-03-25_18-30-00/
  const startedAt = new Date()
    .toISOString()
    .replace('T', '_')
    .replace(/:/g, '-')
    .slice(0, 19);

  const baseLogDir = path.dirname(env.LOG_FILE);
  const sessionLogDir = path.join(baseLogDir, startedAt);

  if (!fs.existsSync(sessionLogDir)) {
    fs.mkdirSync(sessionLogDir, { recursive: true });
  }

  transports.push(
    new winston.transports.File({ filename: path.join(sessionLogDir, 'app.log'), level: 'info' }),
    new winston.transports.File({ filename: path.join(sessionLogDir, 'error.log'), level: 'error' })
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  transports,
});
