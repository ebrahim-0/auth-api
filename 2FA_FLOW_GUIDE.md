# Two-Factor Authentication Flow Guide

## Overview
This API supports two different 2FA verification flows:
1. **Setup Flow**: Verify 2FA immediately after setup
2. **Login Flow**: Verify 2FA during login when already enabled

Both flows use the same `/api/auth/2fa/verify` endpoint but with different token types.

---

## Flow 1: Setup & Immediate Verification

This flow allows users to setup and verify 2FA in one seamless experience.

### Step 1: Setup 2FA
**Endpoint:** `POST /api/auth/2fa/setup`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Two-factor authentication setup completed",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP...",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhE...",
    "backupCodes": [
      "A1B2C3D4E5",
      "F6G7H8I9J0",
      "..."
    ],
    "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**What to do:**
1. Save the backup codes in a secure location
2. Scan the QR code with Google Authenticator, Authy, or similar app
3. Get the 6-digit code from your authenticator app
4. Proceed to Step 2

### Step 2: Verify 2FA Setup
**Endpoint:** `POST /api/auth/2fa/verify`

**Headers:**
```
Authorization: Bearer <tempToken>
```

**Body:**
```json
{
  "code": "123456",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Two-factor authentication successful",
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "isVerified": true,
      "twoFactorEnabled": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6...",
    "sessionId": "..."
  }
}
```

**Result:**
- 2FA setup is now verified and active
- Full session is created with access token and refresh token
- User is logged in and can use the API

---

## Flow 2: Login with 2FA

This flow is used when 2FA is already enabled and user is logging in.

### Step 1: Login
**Endpoint:** `POST /api/auth/login`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "YourPassword123!",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

**Response (when 2FA is enabled):**
```json
{
  "success": true,
  "message": "Two-factor authentication required",
  "data": {
    "requiresTwoFactor": true,
    "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Step 2: Verify 2FA Code
**Endpoint:** `POST /api/auth/2fa/verify`

**Headers:**
```
Authorization: Bearer <tempToken>
```

**Body:**
```json
{
  "code": "123456",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Two-factor authentication successful",
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "isVerified": true,
      "twoFactorEnabled": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6...",
    "sessionId": "..."
  }
}
```

**Result:**
- User is fully authenticated
- Session is created
- Can now use API with access token

---

## Using Backup Codes

If you lose access to your authenticator app, you can use a backup code instead of the 6-digit TOTP code.

**Endpoint:** `POST /api/auth/2fa/verify`

**Body:**
```json
{
  "code": "A1B2C3D4E5",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

**Important:**
- Backup codes are 10 characters long (vs. 6-digit TOTP codes)
- Each backup code can only be used once
- After using a backup code, it becomes invalid
- Generate new backup codes if you run out

---

## Temp Token Details

### What is a tempToken?
A temporary JWT token that contains only the user ID and is valid for **10 minutes**.

### When is it issued?
1. After successful login when 2FA is enabled
2. After completing 2FA setup

### What can it be used for?
- Only for verifying 2FA codes at `/api/auth/2fa/verify`
- Cannot be used for any other API endpoints

### Security considerations:
- Short expiration (10 minutes)
- Single-use in practice (becomes useless after verification)
- Contains minimal payload (only userId and type='temp')
- Must be paired with valid 2FA code

---

## Disabling 2FA

**Endpoint:** `POST /api/auth/2fa/disable`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "password": "YourPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Two-factor authentication disabled successfully"
}
```

**Result:**
- 2FA is disabled for your account
- Future logins will not require 2FA codes
- All backup codes are invalidated

---

## Testing with Swagger UI

1. **Navigate to Swagger UI:**
   ```
   http://localhost:5000/api-docs
   ```

2. **Setup 2FA Flow:**
   - First login normally to get an access token
   - Click "Authorize" and enter your access token
   - Execute `POST /api/auth/2fa/setup`
   - Copy the `tempToken` from the response
   - Scan the QR code with your authenticator app
   - Save the backup codes
   - Click "Authorize" again and replace access token with `tempToken`
   - Execute `POST /api/auth/2fa/verify` with the code from your app
   - You now have a new access token and refresh token

3. **Login with 2FA Flow:**
   - Execute `POST /api/auth/login`
   - Copy the `tempToken` from response
   - Click "Authorize" and enter the `tempToken`
   - Get code from your authenticator app
   - Execute `POST /api/auth/2fa/verify` with the code
   - You now have full access

---

## Error Handling

### Common Errors:

**Invalid or expired tempToken:**
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "statusCode": 401
}
```

**Invalid 2FA code:**
```json
{
  "success": false,
  "message": "Invalid two-factor authentication code",
  "statusCode": 401
}
```

**2FA already enabled:**
```json
{
  "success": false,
  "message": "Two-factor authentication is already enabled",
  "statusCode": 400
}
```

**Missing required fields:**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "code",
      "message": "Code is required"
    }
  ],
  "statusCode": 422
}
```

---

## Best Practices

1. **Save Backup Codes Immediately:**
   - Store in password manager
   - Print and keep in secure location
   - Never share with anyone

2. **Test 2FA Before Logging Out:**
   - Use the setup flow to verify it works
   - Ensure your authenticator app is properly synced

3. **Token Management:**
   - Never expose tempToken to client-side JavaScript
   - Store access tokens securely (httpOnly cookies recommended)
   - Implement token refresh before expiration

4. **User Experience:**
   - Show clear instructions during setup
   - Display QR code prominently
   - Provide backup codes download option
   - Remind users to save backup codes

5. **Security:**
   - Require password to disable 2FA
   - Log all 2FA events (setup, verify, disable)
   - Monitor failed verification attempts
   - Consider IP-based restrictions for sensitive accounts
