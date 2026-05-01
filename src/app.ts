import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const swaggerUiDist = require('swagger-ui-dist') as { getAbsoluteFSPath: () => string };
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { generalLimiter } from './middlewares/rateLimit';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { i18nMiddleware } from './middlewares/i18n';
import authRoutes from './routes/auth.routes';
import sessionRoutes from './routes/session.routes';
import { logger } from './utils/logger';

export const createApp = (): Application => {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: false, // disable content security policy
  }));

  // Support comma-separated origins e.g. "https://app.vercel.app,http://localhost:3000"
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true, // allow credentials
    })
  );

  app.use(express.json({ limit: '10mb' })); // limit the size of the request body
  app.use(express.urlencoded({ extended: true, limit: '10mb' })); // limit the size of the request body
  app.use(i18nMiddleware);

  // log the requests
  if (env.NODE_ENV !== 'test') {
    app.use(
      morgan('combined', {
        stream: {
          write: (message: string) => logger.info(message.trim()),
        },
      })
    );
  }

  app.use(generalLimiter);

  /**
   * @swagger
   * /health:
   *   get:
   *     tags:
   *       - Health
   *     summary: Health check endpoint
   *     description: Check if the server is running and healthy
   *     responses:
   *       200:
   *         description: Server is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Server is healthy
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toLocaleString(),
    });
  });

  const swaggerDistPath = swaggerUiDist.getAbsoluteFSPath();

  app.get('/api-docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve CSS/JS from dist first (Vercel/serverless: setup alone returns HTML for every path)
  app.use('/api-docs', express.static(swaggerDistPath, { index: false }));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Auth API Documentation',
  }));

  app.use('/api/auth', authRoutes);
  app.use('/api/session', sessionRoutes);

  app.use(notFoundHandler);

  app.use(errorHandler);

  return app;
};
