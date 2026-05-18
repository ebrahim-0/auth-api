# WebSocket Real-Time Session Events — Frontend Integration Guide

## What changed from SSE

The real-time layer was migrated from Server-Sent Events to **WebSocket**.

| | Old (SSE) | New (WebSocket) |
|---|---|---|
| Endpoint | `GET /api/session/events` | `ws[s]://host/ws/session` |
| Auth | `Authorization` header | `?token=` query param |
| Message format | `event: name\ndata: {...}` | `JSON.stringify({ event, data })` |
| Library needed | `@microsoft/fetch-event-source` | Native `WebSocket` (no library) |
| Direction | Server → Client only | Both (but backend only pushes) |

---

## Endpoint

```
ws://localhost:3000/ws/session?token=<accessToken>
```

Production:
```
wss://your-domain.com/ws/session?token=<accessToken>
```

**Auth:** Pass the `accessToken` as a query parameter `token`.
The `Accept-Language` header (`ar` or `en`) is also read during the handshake for translated messages.

---

## Connection close codes

| Code | Reason string | Meaning |
|---|---|---|
| `4001` | `no_token` | No token was provided |
| `4001` | `invalid_token` | Token is invalid or expired |
| `4001` | `user_not_found` | User no longer exists |
| `1000` | `session_revoked` | Server closed the socket after a revoke event |

---

## Events

All messages from the server are JSON with this shape:

```ts
{ event: string; data: object }
```

### `connected`
Sent immediately after the handshake is authenticated.

```json
{
  "event": "connected",
  "data": { "message": "Connected to real-time session events" }
}
```

### `session_revoked`
Sent when **this** session is terminated. The server closes the socket right after.

```json
{
  "event": "session_revoked",
  "data": { "sessionId": "64f1a2b3c4d5e6f7a8b9c0d1" }
}
```

**Action required:** log the user out immediately.

### `new_session`
Sent to all **other** connected sessions when a new login happens on the account.

```json
{
  "event": "new_session",
  "data": {
    "sessionId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "ipAddress": "41.234.12.88",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 ...)",
    "createdAt": "2026-05-04T22:10:00.000Z"
  }
}
```

**Action required:** show a security alert with device and IP info.

---

## Triggers

| Action | Event sent | Recipients |
|---|---|---|
| `POST /api/auth/login` | `new_session` | All other active sessions |
| `POST /api/auth/2fa/verify` | `new_session` | All other active sessions |
| `DELETE /api/session/:sessionId` | `session_revoked` | The specific revoked session |
| `DELETE /api/session/revoke/all` | `session_revoked` | All sessions except the current one |
| `POST /api/auth/logout` | `session_revoked` | The current session |
| `POST /api/auth/logout/all` | `session_revoked` | All sessions of the user |

---

## Implementation

### Vanilla JavaScript

```js
class SessionSocket {
  constructor({ token, onRevoked, onNewSession }) {
    this.token = token;
    this.onRevoked = onRevoked;
    this.onNewSession = onNewSession;
    this.ws = null;
    this.reconnectDelay = 1000;
    this.shouldReconnect = true;
    this.connect();
  }

  connect() {
    const url = `wss://your-domain.com/ws/session?token=${this.token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000; // reset on successful connect
    };

    this.ws.onmessage = (e) => {
      const { event, data } = JSON.parse(e.data);

      if (event === 'connected') {
        console.log('[WS]', data.message);
      }

      if (event === 'session_revoked') {
        this.shouldReconnect = false; // do NOT reconnect after a revoke
        this.onRevoked();
      }

      if (event === 'new_session') {
        this.onNewSession(data);
      }
    };

    this.ws.onclose = (e) => {
      // 4001 = auth failure — do not retry
      if (e.code === 4001 || !this.shouldReconnect) return;

      // Exponential back-off reconnect
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
    };

    this.ws.onerror = () => {
      this.ws.close();
    };
  }

  close() {
    this.shouldReconnect = false;
    this.ws?.close();
  }
}

// Usage
const socket = new SessionSocket({
  token: localStorage.getItem('accessToken'),

  onRevoked: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  },

  onNewSession: (data) => {
    showSecurityAlert({
      sessionId: data.sessionId,
      ip: data.ipAddress,
      device: data.userAgent,
      time: new Date(data.createdAt).toLocaleString(),
    });
  },
});

// On voluntary logout
socket.close();
```

---

### React Hook (TypeScript)

```tsx
// hooks/useSessionSocket.ts
import { useEffect, useRef, useCallback } from 'react';

interface NewSessionData {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

interface Options {
  accessToken: string | null;
  onRevoked: () => void;
  onNewSession?: (data: NewSessionData) => void;
}

export function useSessionSocket({ accessToken, onRevoked, onNewSession }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const shouldReconnect = useRef(true);
  const reconnectDelay = useRef(1000);

  const connect = useCallback(() => {
    if (!accessToken) return;

    const ws = new WebSocket(
      `wss://your-domain.com/ws/session?token=${accessToken}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = 1000;
    };

    ws.onmessage = (e) => {
      const { event, data } = JSON.parse(e.data);

      if (event === 'session_revoked') {
        shouldReconnect.current = false;
        onRevoked();
      }

      if (event === 'new_session') {
        onNewSession?.(data);
      }
    };

    ws.onclose = (e) => {
      if (e.code === 4001 || !shouldReconnect.current) return;
      const delay = reconnectDelay.current;
      reconnectDelay.current = Math.min(delay * 2, 30_000);
      setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    shouldReconnect.current = true;
    connect();

    return () => {
      shouldReconnect.current = false;
      wsRef.current?.close();
    };
  }, [accessToken]);
}
```

```tsx
// In your root component or auth context
function App() {
  const { accessToken, logout } = useAuth();
  const [newSessionAlert, setNewSessionAlert] = useState(null);

  useSessionSocket({
    accessToken,
    onRevoked: () => {
      logout();          // clear tokens from state / storage
      navigate('/login');
    },
    onNewSession: (data) => {
      setNewSessionAlert(data); // show security banner
    },
  });

  return (
    <>
      {newSessionAlert && (
        <SecurityAlert
          data={newSessionAlert}
          onRevoke={() => revokeSession(newSessionAlert.sessionId)}
          onDismiss={() => setNewSessionAlert(null)}
        />
      )}
      <Router />
    </>
  );
}
```

---

### Next.js App Router

```tsx
// hooks/useSessionSocket.ts
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function useSessionSocket(accessToken: string | null) {
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);
  const shouldReconnect = useRef(true);

  useEffect(() => {
    if (!accessToken) return;

    const connect = () => {
      const ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/ws/session?token=${accessToken}`
      );
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const { event, data } = JSON.parse(e.data);

        if (event === 'session_revoked') {
          shouldReconnect.current = false;
          document.cookie = 'accessToken=; Max-Age=0; path=/';
          localStorage.clear();
          router.replace('/login');
        }

        if (event === 'new_session') {
          // dispatch to global state / toast system
          window.dispatchEvent(new CustomEvent('new_session', { detail: data }));
        }
      };

      ws.onclose = (e) => {
        if (e.code !== 4001 && shouldReconnect.current) {
          setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      shouldReconnect.current = false;
      wsRef.current?.close();
    };
  }, [accessToken]);
}
```

---

## When to open and close the connection

| Moment | Action |
|---|---|
| User logs in successfully | Open the WebSocket connection |
| App loads and tokens exist in storage | Open the WebSocket connection |
| User logs out voluntarily | Close the connection (`ws.close()`), then call `POST /api/auth/logout` |
| `session_revoked` event received | Do NOT reconnect — clear tokens and redirect to login |
| Network drops | Reconnect with exponential back-off (built into the examples above) |
| Auth fails on connect (`code 4001`) | Do NOT retry — treat as a logout |

---

## Environment variable

Set this in your `.env` / `.env.local`:

```
NEXT_PUBLIC_WS_URL=wss://your-domain.com
# or for local dev:
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

---

## Security alert component (example)

When `new_session` fires, show something like this to the user:

```
⚠️  New sign-in detected on your account

   Device : Chrome on Windows
   IP      : 41.234.12.88
   Time    : 4 May 2026, 10:10 PM

   [ Revoke this session ]   [ Dismiss ]
```

The "Revoke this session" button calls:
```
DELETE /api/session/<data.sessionId>
Authorization: Bearer <accessToken>
```

When that revoke completes, the backend automatically pushes `session_revoked`
to that session's WebSocket — no extra work needed on your side.

---

## Full message flow

```
Device A (laptop) — already connected via WebSocket
Device B (phone)  — logs in now

Device A WebSocket open:
  ← { "event": "connected", "data": { "message": "..." } }
  ← ping every 30s (invisible, handled by browser)

Device B logs in:
  POST /api/auth/login → 200 OK

Device A receives instantly:
  ← { "event": "new_session", "data": { "sessionId":"...", "ipAddress":"...", "userAgent":"...", "createdAt":"..." } }
  → Show security alert

User on Device A clicks "Revoke this session":
  DELETE /api/session/<sessionIdB> → 200 OK

Device B receives instantly:
  ← { "event": "session_revoked", "data": { "sessionId":"..." } }
  → Clear tokens → redirect to /login
  → Server closes the socket (code 1000)
```
