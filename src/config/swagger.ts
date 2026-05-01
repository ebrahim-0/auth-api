import path from 'path';
import fs from 'fs';
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

/** Resolve JSDoc source files — cwd-relative globs break on Vercel; tsc dist/*.js keeps @swagger comments. */
function getSwaggerApiGlobs(): string[] {
  const routesDir = path.join(__dirname, '..', 'routes');
  const tsRoutes = path.join(routesDir, 'auth.routes.ts');
  const jsRoutes = path.join(routesDir, 'auth.routes.js');

  if (fs.existsSync(tsRoutes)) {
    return [path.join(routesDir, '*.ts'), path.join(__dirname, '..', 'app.ts')];
  }
  if (fs.existsSync(jsRoutes)) {
    return [path.join(routesDir, '*.js'), path.join(__dirname, '..', 'app.js')];
  }

  const cwdDistRoutes = path.join(process.cwd(), 'dist', 'routes', '*.js');
  const cwdDistApp = path.join(process.cwd(), 'dist', 'app.js');
  return [cwdDistRoutes, cwdDistApp];
}

const swaggerDevServer = {
  url: `http://localhost:${env.PORT}`,
  description: 'Development server',
};

const swaggerProdServer = {
  url: 'https://auth-api-umber-ten.vercel.app',
  description: 'Production server',
};

const swaggerServers =
  env.NODE_ENV === 'production'
    ? [swaggerProdServer, swaggerDevServer]
    : [swaggerDevServer, swaggerProdServer];

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Secure Authentication API",
    version: "1.0.0",
    description: `
Production-ready authentication API with comprehensive security features.

## Features
- User registration with email verification
- Secure login with JWT tokens
- Two-factor authentication (TOTP)
- Session management with tracking
- Password reset functionality
- Account lockout protection
- Rate limiting on all endpoints

## Security
- Bcrypt password hashing (12 rounds)
- Short-lived access tokens (15 min)
- Long-lived refresh tokens (7 days)
- Session tracking in MongoDB
- IP address and user agent logging

## Rate Limits
- General API: 100 requests per 15 minutes
- Authentication: 5 requests per 15 minutes
- Password Reset: 3 requests per hour
- Email Verification: 5 requests per hour
    `,
    contact: {
      name: "API Support",
      email: "support@example.com",
    },
    license: {
      name: "ISC",
      url: "https://opensource.org/licenses/ISC",
    },
  },
  servers: swaggerServers,
  tags: [
    {
      name: "Authentication",
      description:
        "User authentication endpoints (register, login, logout, password reset)",
    },
    {
      name: "Two-Factor Authentication",
      description: "TOTP-based 2FA setup and verification",
    },
    {
      name: "Session Management",
      description: "Manage active sessions and retrieve user data",
    },
    {
      name: "Health",
      description: "Server health check endpoint",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT access token",
      },
    },
    schemas: {
      User: {
        type: "object",
        required: [
          "id",
          "email",
          "name",
          "username",
          "age",
          "isVerified",
          "twoFactorEnabled",
        ],
        properties: {
          id: {
            type: "string",
            description: "User ID",
          },
          email: {
            type: "string",
            format: "email",
            description: "User email address",
          },
          name: {
            type: "string",
            description: "Display name",
          },
          username: {
            type: "string",
            description: "Unique username (lowercase)",
          },
          age: {
            type: "integer",
            minimum: 13,
            maximum: 120,
            description: "User age",
          },
          isVerified: {
            type: "boolean",
            description: "Email verification status",
          },
          twoFactorEnabled: {
            type: "boolean",
            description: "2FA enabled status",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Account creation timestamp",
          },
        },
      },
      Session: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID",
          },
          ipAddress: {
            type: "string",
            description: "IP address of the session",
          },
          userAgent: {
            type: "string",
            description: "User agent string",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Session creation time",
          },
          expiresAt: {
            type: "string",
            format: "date-time",
            description: "Session expiration time",
          },
          isActive: {
            type: "boolean",
            description: "Session active status",
          },
          isCurrent: {
            type: "boolean",
            description: "Whether this is the current session",
          },
        },
      },
      Error: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          message: {
            type: "string",
            description: "Error message",
          },
          error: {
            type: "string",
            description: "Detailed error information",
          },
        },
      },
      ValidationError: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          message: {
            type: "string",
            example: "Validation failed",
          },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                msg: {
                  type: "string",
                  description: "Validation error message",
                },
                param: {
                  type: "string",
                  description: "Parameter that failed validation",
                },
                location: {
                  type: "string",
                  description: "Location of the parameter",
                },
              },
            },
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: "Authentication required or invalid token",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/Error",
            },
            example: {
              success: false,
              message: "Unauthorized access",
            },
          },
        },
      },
      ValidationError: {
        description: "Request validation failed",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ValidationError",
            },
          },
        },
      },
      RateLimitError: {
        description: "Rate limit exceeded",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/Error",
            },
            example: {
              success: false,
              message: "Too many requests, please try again later",
            },
          },
        },
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  apis: getSwaggerApiGlobs(),
};

export const swaggerSpec = swaggerJsdoc(options);
