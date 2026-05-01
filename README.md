# Secure Authentication API

A production-ready authentication API built with Node.js, Express, TypeScript, and MongoDB. Features JWT-based authentication with database-backed session tracking, two-factor authentication, email verification, and comprehensive security measures.

## 📚 **Interactive API Documentation**

**Swagger UI is available at: `http://localhost:3000/api-docs`**

The API includes full OpenAPI/Swagger documentation with:
- ✅ Interactive endpoint testing
- ✅ Complete request/response schemas
- ✅ Example values for all fields
- ✅ Built-in authentication support
- ✅ Try-it-out functionality

See [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md) for detailed usage instructions.

## Features

### Core Authentication
- ✅ User registration with email verification
- ✅ Secure login with JWT access tokens
- ✅ Refresh token rotation for extended sessions
- ✅ Session management with IP and user agent tracking
- ✅ Logout (single session or all sessions)
- ✅ Password reset with secure tokens

### Two-Factor Authentication (2FA)
- ✅ TOTP-based 2FA with Google Authenticator
- ✅ QR code generation for easy setup
- ✅ Immediate verification after setup (no logout required)
- ✅ Backup codes for account recovery
- ✅ Enable/disable 2FA with password confirmation

📖 **See [2FA_FLOW_GUIDE.md](./2FA_FLOW_GUIDE.md) for detailed 2FA setup and usage instructions.**

### Session Management
- ✅ Get current user data by access token
- ✅ View all active sessions
- ✅ Revoke individual sessions
- ✅ Revoke all sessions except current
- ✅ Automatic session cleanup

### Security Features
- ✅ Bcrypt password hashing (12 rounds)
- ✅ Short-lived access tokens (15 min)
- ✅ Long-lived refresh tokens (7 days)
- ✅ Account lockout after failed login attempts
- ✅ Rate limiting on all endpoints
- ✅ Input validation and sanitization
- ✅ Helmet.js for secure HTTP headers
- ✅ CORS configuration
- ✅ Comprehensive logging and audit trails
- ✅ Graceful shutdown handling

## Architecture

### Design Patterns
- **Repository Pattern**: Data access abstraction
- **Service Layer Pattern**: Business logic separation
- **Middleware Pattern**: Request processing pipeline
- **Factory Pattern**: Token and object creation
- **Strategy Pattern**: Multiple authentication methods

### Project Structure
```
auth-api/
├── src/
│   ├── config/          # Configuration (env, database, email)
│   ├── models/          # Mongoose models
│   ├── repositories/    # Data access layer
│   ├── services/        # Business logic
│   ├── controllers/     # Request handlers
│   ├── middlewares/     # Express middlewares
│   ├── validators/      # Request validation
│   ├── routes/          # API routes
│   ├── types/           # TypeScript interfaces
│   ├── utils/           # Helper functions
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── tests/               # Test files
├── .env                 # Environment variables (create from .env.example)
├── .env.example         # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB 4.4+
- npm or yarn

### Installation

1. **Clone the repository or navigate to the project directory**
   ```bash
   cd auth-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env and update the following:
   # - JWT_SECRET (use a strong random string)
   # - MONGODB_URI (your MongoDB connection string)
   # - Email configuration (if using email features)
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or use MongoDB Atlas (cloud)
   # Update MONGODB_URI in .env with your Atlas connection string
   ```

5. **Run the application**

   **Development mode:**
   ```bash
   npm run dev
   ```

   **Production mode:**
   ```bash
   npm run build
   npm start
   ```

6. **Health Check**
   ```
   http://localhost:3000/health
   ```

7. **Access API Documentation**
   ```
   http://localhost:3000/api-docs
   ```
   
   Interactive Swagger UI for testing all endpoints!

## API Endpoints

**📚 For interactive documentation and testing, visit: http://localhost:3000/api-docs**

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "...",
    "sessionId": "..."
  }
}
```

#### Verify 2FA (if enabled)
```http
POST /api/auth/2fa/verify
Content-Type: application/json

{
  "tempToken": "...",
  "code": "123456"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

#### Logout All Sessions
```http
POST /api/auth/logout-all
Authorization: Bearer <access_token>
```

#### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "<verification_token>"
}
```

#### Resend Verification Email
```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Request Password Reset
```http
POST /api/auth/password-reset/request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Confirm Password Reset
```http
POST /api/auth/password-reset/confirm
Content-Type: application/json

{
  "token": "<reset_token>",
  "newPassword": "NewSecureP@ssw0rd"
}
```

#### Refresh Access Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "..."
}
```

### Two-Factor Authentication Endpoints

#### Setup 2FA
```http
POST /api/auth/2fa/setup
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "data": {
    "secret": "...",
    "qrCode": "data:image/png;base64,...",
    "backupCodes": ["...", "..."]
  }
}
```

#### Disable 2FA
```http
POST /api/auth/2fa/disable
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "password": "SecureP@ssw0rd"
}
```

### Session Management Endpoints

#### Get Current User
```http
GET /api/session/me
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "data": {
    "id": "...",
    "email": "user@example.com",
    "isVerified": true,
    "twoFactorEnabled": false
  }
}
```

#### Get Current Session
```http
GET /api/session/current
Authorization: Bearer <access_token>
```

#### List All Sessions
```http
GET /api/session/list
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "...",
        "ipAddress": "...",
        "userAgent": "...",
        "createdAt": "...",
        "isCurrent": true
      }
    ],
    "total": 1
  }
}
```

#### Revoke Session
```http
DELETE /api/session/:sessionId
Authorization: Bearer <access_token>
```

#### Revoke All Sessions (Except Current)
```http
DELETE /api/session/revoke/all
Authorization: Bearer <access_token>
```

## Security Best Practices

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Expiry
- Access tokens: 15 minutes
- Refresh tokens: 7 days
- Email verification: 24 hours
- Password reset: 1 hour

### Rate Limiting
- General API: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- Password reset: 3 requests per hour
- Email verification: 5 requests per hour

### Account Lockout
- Maximum failed login attempts: 5
- Lockout duration: 15 minutes

## Environment Variables

See `.env.example` for all available configuration options.

**Critical Variables:**
- `JWT_SECRET` - Secret key for JWT signing (MUST be changed in production)
- `MONGODB_URI` - MongoDB connection string
- `EMAIL_USER` & `EMAIL_PASSWORD` - Email service credentials (for verification/reset emails)

## Development

### Available Scripts
```bash
npm run dev        # Run in development mode with nodemon
npm run build      # Compile TypeScript to JavaScript
npm start          # Run compiled JavaScript
npm run lint       # Type check without emitting
npm test           # Run tests (when configured)
```

### API Documentation
Access the interactive Swagger documentation at `http://localhost:3000/api-docs` when the server is running.

### Testing the API

**Option 1: Swagger UI (Recommended)**
1. Start server: `npm run dev`
2. Open browser: `http://localhost:3000/api-docs`
3. Test endpoints interactively with built-in authentication

**Option 2: Postman or Insomnia**
- Import OpenAPI spec from: `http://localhost:3000/api-docs/swagger.json`

**Option 3: curl**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecureP@ssw0rd123!"}'
```

## Deployment

### Production Checklist
1. ✅ Change `JWT_SECRET` to a strong random value
2. ✅ Set `NODE_ENV=production`
3. ✅ Configure MongoDB connection (Atlas recommended)
4. ✅ Set up email service (SendGrid, AWS SES, or SMTP)
5. ✅ Configure CORS origin
6. ✅ Enable HTTPS/TLS
7. ✅ Set up monitoring and logging
8. ✅ Configure firewall rules
9. ✅ Set up automated backups

### Docker (Optional)
A Dockerfile can be added for containerized deployment.

## Logging

Logs are stored in:
- `logs/app.log` - Info and above
- `logs/error.log` - Errors only

Console logging is enabled in development mode.

## Troubleshooting

### Common Issues

**"JWT_SECRET is required but not set"**
- Create a `.env` file based on `.env.example`
- Set a strong random string for `JWT_SECRET`

**"MongoDB connection error"**
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env`

**"Email service not configured"**
- This is a warning, not an error
- Email links will be logged instead
- Configure email credentials in `.env` to enable email sending

## Contributing

This is a template/starter project. Feel free to customize for your needs.

## License

ISC

## Author

Created with TypeScript, Express, and MongoDB
