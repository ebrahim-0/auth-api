# Quick Start Guide

## Setup (3 Steps)

### 1. Configure Environment
```bash
# Edit the .env file (already created)
# IMPORTANT: Change JWT_SECRET to a secure random string
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-abc123xyz

# If you have MongoDB installed locally, use:
MONGODB_URI=mongodb://localhost:27017/auth-api

# Or use MongoDB Atlas (recommended for production):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/auth-api
```

### 2. Start MongoDB
**Option A: Local MongoDB**
```bash
mongod
```

**Option B: MongoDB Atlas (Cloud)**
- Sign up at https://www.mongodb.com/cloud/atlas
- Create a free cluster
- Get connection string and update MONGODB_URI in .env

### 3. Run the Application
```bash
# Development mode (auto-reloads on changes)
npm run dev

# The server will start on http://localhost:3000
# Health check: http://localhost:3000/health
# API Docs: http://localhost:3000/api-docs
```

## 📚 Interactive API Documentation

**Open your browser and visit: http://localhost:3000/api-docs**

This provides a complete interactive Swagger UI where you can:
- Test all API endpoints
- See request/response examples
- Authenticate and test protected routes
- No Postman or curl needed!

See [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md) for detailed usage.

## Test the API

### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123!"
  }'
```

This returns `accessToken` and `refreshToken`. Use the `accessToken` for protected routes.

### Get Current User (Protected Route)
```bash
curl -X GET http://localhost:3000/api/session/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Next Steps

1. **Email Configuration** (Optional for email verification/password reset)
   - Update EMAIL_USER and EMAIL_PASSWORD in .env
   - Use Gmail, SendGrid, or any SMTP service

2. **Enable 2FA**
   - Setup endpoint: POST /api/auth/2fa/setup
   - Scan QR code with Google Authenticator
   - Save backup codes

3. **Production Deployment**
   - Change JWT_SECRET to a strong random string
   - Set NODE_ENV=production
   - Use MongoDB Atlas or hosted MongoDB
   - Enable HTTPS/TLS
   - Configure CORS_ORIGIN

## Troubleshooting

**MongoDB Connection Error**
- Make sure MongoDB is running: `mongod`
- Check MONGODB_URI in .env

**JWT_SECRET Error**
- Edit .env and set a strong random value

**Email Not Sending**
- This is expected if EMAIL_USER/EMAIL_PASSWORD not configured
- Email links will be logged to console instead
- Configure email credentials in .env to enable sending

## API Documentation

See README.md for complete API documentation with all endpoints.
