import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { sanitize } from "express-mongo-sanitize";
import hpp from "hpp";
import swaggerUi from "swagger-ui-express";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const swaggerUiDist = require("swagger-ui-dist") as {
  getAbsoluteFSPath: () => string;
};
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { generalLimiter } from "./middlewares/rateLimit";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { i18nMiddleware } from "./middlewares/i18n";
import authRoutes from "./routes/auth.routes";
import sessionRoutes from "./routes/session.routes";
import oauthRoutes from "./routes/oauth.routes";
import { logger } from "./utils/logger";
import { setCsrfCookie } from "./middlewares/csrf";

export const createApp = (): Application => {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // swagger-ui requires inline styles
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginOpenerPolicy: false,
      crossOriginEmbedderPolicy: false, // swagger-ui loads cross-origin assets
      originAgentCluster: false,
    }),
  );

  // Support comma-separated origins e.g. "https://app.vercel.app,http://localhost:3000"
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true, // allow credentials
    }),
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());
  // Express 5 makes req.query read-only — sanitize body and params only
  app.use((req, _res, next) => {
    if (req.body) req.body = sanitize(req.body);
    if (req.params) req.params = sanitize(req.params) as Record<string, string>;
    next();
  });
  app.use(hpp()); // prevents HTTP parameter pollution attacks
  app.use(i18nMiddleware);

  // log the requests
  if (env.NODE_ENV !== "test") {
    app.use(
      morgan("combined", {
        stream: {
          write: (message: string) => logger.info(message.trim()),
        },
      }),
    );
  }

  app.use(generalLimiter);

  app.get("/", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Auth API is running",
      health: "/health",
      docs: "/api-docs",
      timestamp: new Date().toLocaleString(),
    });
  });

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
  app.get("/health", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Server is healthy",
      timestamp: new Date().toLocaleString(),
    });
  });

  const swaggerDistPath = swaggerUiDist.getAbsoluteFSPath();

  app.get("/api-docs/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Serve CSS/JS from dist first (Vercel/serverless: setup alone returns HTML for every path)
  app.use("/api-docs", express.static(swaggerDistPath, { index: false }));

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Auth API Documentation",
    }),
  );

  /**
   * @swagger
   * /api/csrf-token:
   *   get:
   *     tags:
   *       - Security
   *     summary: Get CSRF token
   *     description: Issues a new CSRF token as a cookie and returns it in the response body. Call this before any state-mutating request and attach the token as X-CSRF-Token header.
   *     responses:
   *       200:
   *         description: CSRF token issued
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     csrfToken:
   *                       type: string
   */
  app.get("/api/csrf-token", (req, res) => {
    const token = setCsrfCookie(res);
    res.status(200).json({ success: true, data: { csrfToken: token } });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/auth/oauth", oauthRoutes);
  app.use("/api/session", sessionRoutes);

  app.use(notFoundHandler);

  app.use(errorHandler);

  return app;
};
