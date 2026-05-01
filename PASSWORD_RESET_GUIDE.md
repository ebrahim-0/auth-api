# Password Reset Guide

## Overview

The password reset flow is a two-step process:

1. **Request** — user submits their email and receives a reset link
2. **Confirm** — user submits the token from the email along with their new password

All active sessions are terminated after a successful reset.

---

## Flow

```
POST /api/auth/password-reset/request
        ↓
  Email sent with reset token (valid 1 hour)
        ↓
POST /api/auth/password-reset/confirm
        ↓
  Password updated + all sessions revoked
```

---

## Step 1: Request Password Reset

**Endpoint:** `POST /api/auth/password-reset/request`

**Rate limit:** 3 requests per hour per IP

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (always 200 for security — does not reveal if email exists):**
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent"
}
```

**What happens internally:**
- If the email exists, a reset token is generated and stored (expires in 1 hour)
- A reset email is sent to the address
- If the email does not exist, the request is silently ignored (same response)

---

## Step 2: Confirm Password Reset

**Endpoint:** `POST /api/auth/password-reset/confirm`

**Rate limit:** 10 failed attempts per 15 minutes per IP (`authLimiter`)

**Body:**
```json
{
  "token": "<reset_token_from_email>",
  "newPassword": "NewSecureP@ssw0rd123!"
}
```

**Password requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (`@$!%*?&`)

**Success response:**
```json
{
  "success": true,
  "message": "Password reset successful. All sessions have been terminated."
}
```

**Error responses:**

| Status | Message |
|--------|---------|
| `400` | `Invalid or expired password reset token` |
| `422` | Validation error (missing/invalid fields) |
| `429` | Too many attempts — try again after 15 minutes |

---

## Security Notes

- The reset token is **single-use** — it is marked as used immediately after a successful reset
- The token **expires after 1 hour**
- **All active sessions are revoked** on success, forcing re-login on all devices
- The request endpoint always returns the same message regardless of whether the email exists, preventing user enumeration
- The password reset limiter allows only **3 requests per hour** to prevent abuse

---

## Example: Full Flow

### 1. Request reset

```bash
curl -X POST http://localhost:3000/api/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent"
}
```

### 2. Confirm reset (use token from email)

```bash
curl -X POST http://localhost:3000/api/auth/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6...",
    "newPassword": "NewSecureP@ssw0rd123!"
  }'
```

```json
{
  "success": true,
  "message": "Password reset successful. All sessions have been terminated."
}
```

### 3. Login with new password

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "NewSecureP@ssw0rd123!"
  }'
```

---

## Error Handling

### Token expired or already used
```json
{
  "success": false,
  "message": "Invalid or expired password reset token"
}
```
→ Start over from Step 1.

### Validation error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "newPassword",
      "message": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    }
  ]
}
```
→ Fix the field and retry.

### Rate limited
```json
{
  "success": false,
  "message": "Too many password reset requests, please try again after 1 hour"
}
```
→ Wait 1 hour before requesting again.
