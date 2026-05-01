# API Documentation with Swagger

## Accessing the Documentation

Once the server is running, you can access the interactive Swagger API documentation at:

```
http://localhost:3000/api-docs
```

## Features of Swagger UI

### 🎯 **Interactive Testing**
- Test all API endpoints directly from the browser
- No need for Postman or curl
- See real-time responses

### 🔐 **Authentication**
1. Click the **"Authorize"** button at the top right
2. Enter your JWT access token in the format: `Bearer YOUR_TOKEN`
3. Click "Authorize"
4. All subsequent requests will include the authentication header

### 📝 **Complete Documentation**
- Full request/response schemas
- Example values for all fields
- Detailed descriptions
- HTTP status codes
- Error responses

### 🏷️ **Organized by Tags**
- **Authentication** - Register, login, logout, password reset
- **Two-Factor Authentication** - Setup and verify 2FA
- **Session Management** - Manage active sessions
- **Health** - Server health check

## Quick Start Guide

### 1. Start the Server
```bash
npm run dev
```

### 2. Open Swagger UI
Navigate to: http://localhost:3000/api-docs

### 3. Register a User
1. Expand `POST /api/auth/register`
2. Click "Try it out"
3. Enter email and password:
```json
{
  "email": "test@example.com",
  "password": "SecureP@ssw0rd123!"
}
```
4. Click "Execute"
5. Check the response

### 4. Login
1. Expand `POST /api/auth/login`
2. Click "Try it out"
3. Enter credentials
4. Copy the `accessToken` from the response

### 5. Authorize Swagger
1. Click the **"Authorize"** button (🔒 icon)
2. Paste the token
3. Click "Authorize"
4. Close the dialog

### 6. Test Protected Endpoints
Now you can test any protected endpoint like:
- `GET /api/session/me` - Get your user data
- `GET /api/session/list` - List all sessions
- `POST /api/auth/2fa/setup` - Setup two-factor authentication

## API Workflow Examples

### Complete Authentication Flow

#### 1. Register → Verify Email → Login
```
POST /api/auth/register
  ↓
POST /api/auth/verify-email (with token from email)
  ↓
POST /api/auth/login
  ↓
Use accessToken for protected routes
```

#### 2. Login with 2FA
```
POST /api/auth/login
  ↓ (if 2FA enabled)
POST /api/auth/2fa/verify (with tempToken + code)
  ↓
Receive accessToken + refreshToken
```

#### 3. Refresh Token Flow
```
POST /api/auth/refresh (with refreshToken)
  ↓
Receive new accessToken + refreshToken
```

### Session Management Flow

#### View and Manage Sessions
```
GET /api/session/me
  ↓ Get user info
  
GET /api/session/list
  ↓ See all active sessions
  
DELETE /api/session/{sessionId}
  ↓ Revoke specific session
  
DELETE /api/session/revoke/all
  ↓ Revoke all except current
```

### Two-Factor Authentication Setup

#### Enable 2FA
```
POST /api/auth/2fa/setup
  ↓ Receive QR code + backup codes
  
Scan QR code with Google Authenticator
Save backup codes securely
  
Next login will require 2FA code
```

## Understanding Responses

### Success Response (2xx)
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response (4xx/5xx)
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error info"
}
```

### Validation Error (422)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Invalid email address",
      "param": "email",
      "location": "body"
    }
  ]
}
```

## Rate Limiting

Swagger shows rate limits in the documentation. Watch for:
- **429 Too Many Requests** - You've hit the rate limit
- Wait for the specified time before retrying

### Rate Limits:
- General API: 100 requests / 15 minutes
- Authentication: 5 requests / 15 minutes
- Password Reset: 3 requests / hour
- Email Verification: 5 requests / hour

## Tips for Using Swagger

1. **Try Example Values** - Click "Execute" with default values to see how endpoints work

2. **Check Schemas** - Expand the schema sections to see all available fields

3. **Status Codes** - Each endpoint shows all possible HTTP status codes and their meanings

4. **Copy as curl** - After executing, Swagger shows the curl command for the same request

5. **Download OpenAPI Spec** - Export the API specification for other tools (Postman, Insomnia)

## Exporting for Other Tools

### For Postman:
1. In Swagger UI, copy the URL: `http://localhost:3000/api-docs/swagger.json`
2. In Postman: Import → Link → Paste URL

### For Insomnia:
1. Same as Postman
2. Or download the JSON spec and import as file

## Production Deployment

When deploying to production:
1. Update the server URL in `src/config/swagger.ts`
2. Consider restricting Swagger access in production
3. Swagger UI will be available at: `https://your-domain.com/api-docs`

## Troubleshooting

**Swagger page not loading?**
- Make sure server is running: `npm run dev`
- Check console for errors
- Try rebuilding: `npm run build`

**Authorization not working?**
- Make sure to include "Bearer " before the token
- Check if token is expired (15 minutes)
- Use `/api/auth/refresh` to get a new token

**Can't see new endpoints?**
- Restart the server
- Clear browser cache
- Rebuild: `npm run build && npm run dev`

## Additional Resources

- OpenAPI Specification: https://swagger.io/specification/
- Swagger UI Docs: https://swagger.io/tools/swagger-ui/
- JWT.io: https://jwt.io/ (decode your tokens)
