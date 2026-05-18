# OAuth & Social Login — Frontend Integration Guide

**API base URL**: `http://localhost:3000` (set via `FRONTEND_URL` env var on the backend)  
**Providers supported**: `google`, `github`

---

## How the Flow Works

This is a **server-side Authorization Code flow** — the backend handles all token exchange with Google/GitHub. The frontend only needs to:

1. Redirect the user to the backend initiation URL.
2. Handle the redirect the backend sends back to your app.

```
Browser → GET /api/auth/oauth/google
       ← 302 redirect to Google consent screen
         (user logs in on Google)
Google → 302 redirect to /api/auth/oauth/google/callback
       ← 302 redirect to YOUR_APP/auth/callback?accessToken=...
```

---

## 1. Initiate OAuth Login

Just navigate (or redirect) the browser to:

```
GET /api/auth/oauth/{provider}
```

| Provider | URL |
|---|---|
| Google | `GET /api/auth/oauth/google` |
| GitHub | `GET /api/auth/oauth/github` |

**This is a browser redirect — not an API call.** Use `window.location.href` or an `<a>` tag.

```tsx
// React example
<a href="http://localhost:3000/api/auth/oauth/google">
  Continue with Google
</a>

// Or programmatically
window.location.href = 'http://localhost:3000/api/auth/oauth/google';
```

---

## 2. Handle the Callback

After the user authorises on the provider's consent screen, the backend redirects the browser back to:

### Success

```
GET {YOUR_APP}/auth/callback?accessToken=<JWT>&refreshToken=<token>&sessionId=<id>
```

Your app must have a page/route at `/auth/callback` that reads these query params and stores the tokens.

```tsx
// pages/auth/callback.tsx (Next.js example)
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const accessToken  = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const sessionId    = searchParams.get('sessionId');

    if (accessToken && refreshToken) {
      // Store tokens however your app manages auth state
      // e.g. cookies, localStorage, Zustand, next-auth session, etc.
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      router.replace('/dashboard');
    } else {
      router.replace('/login?error=oauth_failed');
    }
  }, []);

  return <p>Signing you in...</p>;
}
```

### Error

```
GET {YOUR_APP}/auth/oauth-error?reason=<code>
```

| `reason` | What it means | Suggested UI |
|---|---|---|
| `denied` | User clicked "Cancel" on consent screen | "Login cancelled. Try again." |
| `invalid_state` | CSRF / expired flow (e.g. tab was open too long) | "Session expired. Please try again." |
| `no_email` | Provider returned no verified email | "Your GitHub account has no public email. Please add a verified email and try again." |
| `provider_error` | Network or API error with the provider | "Something went wrong. Please try again." |

```tsx
// e.g. app/.../auth/oauth-error/page.tsx
import { useSearchParams } from 'next/navigation';

const ERROR_MESSAGES: Record<string, string> = {
  denied:        'Login was cancelled.',
  invalid_state: 'Your session expired. Please try again.',
  no_email:      'No verified email found on your account.',
  provider_error:'Something went wrong. Please try again.',
};

export default function OAuthErrorPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') ?? 'provider_error';

  return (
    <div>
      <p>{ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.provider_error}</p>
      <a href="/login">Back to login</a>
    </div>
  );
}
```

---

## 3. Link a Provider to an Existing Account (Authenticated)

If a user is already logged in and wants to connect their Google/GitHub account:

```
GET /api/auth/oauth/{provider}/link
Authorization: Bearer <accessToken>
```

> This follows the same redirect flow. The backend detects the authenticated user and links the provider instead of creating a new account.

**Important**: because this is a browser redirect, you cannot pass the `Authorization` header directly. Instead, the backend must detect the session via a cookie or you need to temporarily store the token in a short-lived cookie before redirecting.

Alternatively, redirect the user to the same `/auth/callback` endpoint — the backend will link the provider if the email matches an existing account automatically (no special header needed).

---

## 4. List Linked Providers

Show the user which social accounts they have connected on their account settings page.

```
GET /api/auth/oauth/providers
Authorization: Bearer <accessToken>
```

**Response**:
```json
{
  "success": true,
  "message": "Linked providers retrieved successfully",
  "data": [
    {
      "provider": "google",
      "email": "user@gmail.com",
      "name": "Jane Doe",
      "linkedAt": "2026-05-04T14:00:00.000Z"
    }
  ]
}
```

> Note: `data` is an array. Check `data.length === 0` for "no providers linked".

---

## 5. Unlink a Provider

```
DELETE /api/auth/oauth/providers/{provider}
Authorization: Bearer <accessToken>
```

| Provider | URL |
|---|---|
| Google | `DELETE /api/auth/oauth/providers/google` |
| GitHub | `DELETE /api/auth/oauth/providers/github` |

**Success — 200**:
```json
{
  "success": true,
  "message": "Provider unlinked successfully",
  "data": null
}
```

**Error responses**:

| Status | `message` | When |
|---|---|---|
| `409` | Cannot unlink: no other login method available | User has no password and no other provider |
| `404` | Provider not linked to this account | Provider was never linked |
| `401` | Authentication required | Missing/invalid token |

> After a successful unlink, any sessions created via that provider are revoked server-side. If the user has the app open in another tab with a session from that provider, they will be disconnected (WebSocket `session_revoked` event fired).

---

## 6. Token Usage After OAuth

The tokens returned from OAuth are **identical in format** to credential login tokens. Use them the same way:

```http
Authorization: Bearer <accessToken>
```

- `accessToken` — short-lived JWT (15 min default). Use for all authenticated API calls.
- `refreshToken` — long-lived token (7 days). Use `POST /api/auth/refresh-token` to get a new access token.
- `sessionId` — use to identify the current session in the sessions list.

Refer to the existing auth integration docs for token refresh and session management.

---

## 7. User Object Shape

After OAuth login, the user object inside the decoded JWT and in API responses may have `username` and `age` as `null` / absent — OAuth users are created without these fields.

```ts
interface User {
  id: string;
  email: string;
  name: string;
  username?: string;   // may be absent for OAuth-only users
  age?: number;        // may be absent for OAuth-only users
  isVerified: boolean; // always true for OAuth users
  twoFactorEnabled: boolean;
}
```

If your UI requires `username` or `age`, prompt the user to complete their profile after the first OAuth login.

---

## 8. Environment Setup Checklist

These must be configured by the backend before OAuth works:

| Variable | Example |
|---|---|
| `GOOGLE_CLIENT_ID` | from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `http://localhost:5000/api/auth/oauth/google/callback` (must match API origin + provider console) |
| `GITHUB_CLIENT_ID` | from GitHub OAuth App settings |
| `GITHUB_CLIENT_SECRET` | from GitHub OAuth App settings |
| `GITHUB_REDIRECT_URI` | `http://localhost:5000/api/auth/oauth/github/callback` (must match API origin + provider console) |
| `FRONTEND_URL` | `http://localhost:3000` ← **frontend app origin** (success/error redirects) |

The `FRONTEND_URL` value is used as the base for the success/error redirects. Make sure it matches your frontend dev/prod URL.

---

## 9. Quick Route Reference

| Method | URL | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/auth/oauth/google` | ❌ | Start Google login |
| `GET` | `/api/auth/oauth/github` | ❌ | Start GitHub login |
| `GET` | `/api/auth/oauth/google/callback` | ❌ | Google redirect (backend only) |
| `GET` | `/api/auth/oauth/github/callback` | ❌ | GitHub redirect (backend only) |
| `GET` | `/api/auth/oauth/google/link` | ✅ | Link Google to existing account |
| `GET` | `/api/auth/oauth/github/link` | ✅ | Link GitHub to existing account |
| `GET` | `/api/auth/oauth/providers` | ✅ | List linked providers |
| `DELETE` | `/api/auth/oauth/providers/google` | ✅ | Unlink Google |
| `DELETE` | `/api/auth/oauth/providers/github` | ✅ | Unlink GitHub |

> **Callback URLs** (`/callback`) are called by the provider, not by your frontend — do not call them directly.
