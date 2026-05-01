# Change Password Guide

## Overview

Change password allows an **authenticated** user to update their password while logged in. Unlike password reset, no email token is needed — the user must provide their current password to confirm identity.

After a successful change, all **other** active sessions and their refresh tokens are revoked. The session used to make the request stays active so the user is not logged out.

---

## Flow

```
POST /api/auth/change-password
  Authorization: Bearer <access_token>
  Body: { currentPassword, newPassword }
        ↓
  Current password verified
        ↓
  New password must differ from current
        ↓
  Password updated
        ↓
  All other sessions + refresh tokens revoked (current session kept)
        ↓
  Confirmation email sent
```

---

## Endpoint

**`POST /api/auth/change-password`**

**Authentication:** Required — `Authorization: Bearer <access_token>`

**Rate limit:** 10 failed attempts per 15 minutes per IP

**Body:**
```json
{
  "currentPassword": "CurrentP@ssw0rd123!",
  "newPassword": "NewSecureP@ssw0rd456!"
}
```

**Password requirements for `newPassword`:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (`@$!%*?&`)

**Success response:**
```json
{
  "success": true,
  "message": "Password changed successfully. All other sessions have been terminated."
}
```

**Error responses:**

| Status | Message |
|--------|---------|
| `400` | `Current password is incorrect` |
| `400` | `New password must be different from current password` |
| `401` | `Authentication required` (missing or invalid token) |
| `422` | Validation error (missing/invalid fields) |
| `429` | Too many attempts — try again after 15 minutes |

---

## Session Behaviour

| Session | After change |
|---|---|
| Session used to change password | **Kept active** |
| All other sessions | **Revoked** |
| Refresh tokens of other sessions | **Revoked** |

Other devices will be logged out and cannot use their refresh tokens to regain access.

---

## Security Notes

- Requires a valid access token — unauthenticated users cannot use this endpoint
- The current password is verified before any change is made
- The new password cannot be the same as the current password
- All other sessions **and their refresh tokens** are revoked — other devices cannot silently re-authenticate
- The session that performed the change remains active — no forced re-login on the current device
- A confirmation email is sent to the account's email address
- Rate limited to prevent brute-force attempts on the current password

---

## Example

```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "currentPassword": "CurrentP@ssw0rd123!",
    "newPassword": "NewSecureP@ssw0rd456!"
  }'
```

```json
{
  "success": true,
  "message": "Password changed successfully. All other sessions have been terminated."
}
```

---

## Error Handling

### Wrong current password
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```
→ Provide the correct current password. If forgotten, use the [password reset flow](./PASSWORD_RESET_GUIDE.md) instead.

### Same password
```json
{
  "success": false,
  "message": "New password must be different from current password"
}
```
→ Choose a different new password.

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

### Unauthenticated
```json
{
  "success": false,
  "message": "Authentication required"
}
```
→ Include a valid `Authorization: Bearer <access_token>` header. If the token is expired, refresh it first via `POST /api/auth/refresh`.

### Rate limited
```json
{
  "success": false,
  "message": "Too many authentication attempts, please try again after 15 minutes"
}
```
→ Wait 15 minutes before retrying.

---

## Difference from Password Reset

| | Change Password | Password Reset |
|---|---|---|
| Requires login | Yes | No |
| Requires current password | Yes | No |
| Uses email token | No | Yes |
| Keeps current session | Yes | No (all sessions revoked) |
| Use case | User knows current password | User forgot password |
| Endpoint | `POST /api/auth/change-password` | `POST /api/auth/password-reset/request` + `confirm` |
