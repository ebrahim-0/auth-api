import { createApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import dotenv from "dotenv";

dotenv.config();

import { env } from "./config/env";
import { logger } from "./utils/logger";
import { sessionService } from "./services/SessionService";
import { createWsServer } from "./utils/wsServer";

const app = createApp();

let server: any;

const startServer = async () => {
  try {
    await connectDatabase();

    // Check if running under IIS/iisnode
    const isUnderIIS = process.env.IISNODE_VERSION !== undefined;

    if (!isUnderIIS) {
      // Normal Node.js execution - create HTTP server
      server = app.listen(env.PORT, () => {
        logger.info(
          `Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`,
        );
        logger.info(`Health check: http://localhost:${env.PORT}/health`);
        logger.info(
          `📚 API Documentation: http://localhost:${env.PORT}/api-docs`,
        );
        logger.info(`WebSocket: ws://localhost:${env.PORT}/ws/session`);
      });

      createWsServer(server);
    } else {
      // Running under IIS - iisnode handles the HTTP server
      logger.info(`Server initialized under IIS/iisnode (${env.NODE_ENV} mode)`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
      logger.info(
        `📚 API Documentation: http://localhost:${env.PORT}/api-docs`,
      );
      // WebSocket not available under IIS/iisnode
    }

    const cleanupInterval = setInterval(
      () => {
        sessionService.cleanupExpiredSessions().catch((error) => {
          logger.error("Cleanup error:", error);
        });
      },
      60 * 60 * 1000,
    );

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      clearInterval(cleanupInterval);

      if (server) {
        server.close(async () => {
          logger.info("HTTP server closed");

          await disconnectDatabase();

          logger.info("Graceful shutdown completed");
          process.exit(0);
        });
      } else {
        await disconnectDatabase();
        process.exit(0);
      }

      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    });

    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      gracefulShutdown("UNCAUGHT_EXCEPTION");
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
