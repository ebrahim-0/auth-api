# node.js (express) Project Structure Rules

Auto-generated from the current codebase. Follow these rules exactly when starting a new Express API project.

---

## Stack

| Tool | Notes |
|---|---|
| TypeScript | Strict mode, CommonJS (`"module": "commonjs"`) |
| Node.js | 18+ |
| Express | 5.x |
| Mongoose | 9.x — MongoDB ODM |
| express-validator / Zod | Request validation |
| express-rate-limit | Throttling |
| jsonwebtoken | JWT access + refresh tokens |
| bcrypt | Password hashing |
| nodemailer | Transactional email |
| winston | Structured logging |
| swagger-jsdoc + swagger-ui-express | OpenAPI docs |
| ws | WebSocket (optional, for real-time events) |
| i18n (custom) | EN + AR locale support |

---

## Directory Structure

```
src/
├── app.ts               # Express app factory (no listen)
├── server.ts            # Entry point — calls app.listen()
├── config/
│   ├── env.ts
│   ├── database.ts
│   ├── email.ts
│   └── swagger.ts
├── models/
│   └── [Entity].ts
├── repositories/
│   └── [Entity]Repository.ts
├── services/
│   └── [Domain]Service.ts
├── controllers/
│   └── [Domain]Controller.ts
├── routes/
│   └── [domain].routes.ts
├── middlewares/
│   ├── auth.ts
│   ├── validate.ts
│   ├── rateLimit.ts
│   ├── i18n.ts
│   └── errorHandler.ts
├── validators/
│   └── [domain]Validators.ts
├── utils/
│   ├── response.ts
│   ├── logger.ts
│   ├── crypto.ts
│   └── i18n.ts
├── locales/
│   ├── en.json
│   └── ar.json
└── types/
    └── index.ts
api/
└── index.ts             # Vercel serverless entry (exports Express app as handler)
```

---

## Layered Architecture

```
Request → Route → Controller → Service → Repository → Model → MongoDB
```

**Hard rules:**
- Controllers **never** import repositories directly — always go through a service.
- Services **never** import `req` / `res` — they are pure business logic.
- Repositories **never** contain business logic — only Mongoose queries.
- Models **never** import from other layers — they define schema + instance methods only.

---

## File Naming Conventions

| File type | Convention | Example |
|---|---|---|
| Model | `[Entity].ts` (PascalCase) | `User.ts`, `Session.ts` |
| Repository | `[Entity]Repository.ts` | `UserRepository.ts` |
| Service | `[Domain]Service.ts` | `AuthService.ts`, `EmailService.ts` |
| Controller | `[Domain]Controller.ts` | `AuthController.ts` |
| Route file | `[domain].routes.ts` | `auth.routes.ts` |
| Middleware | `[purpose].ts` | `auth.ts`, `rateLimit.ts` |
| Validator | `[domain]Validators.ts` | `authValidators.ts` |
| Utility | `[name].ts` | `response.ts`, `logger.ts` |
| Config | `[name].ts` | `env.ts`, `database.ts` |

---

## `config/`

### `env.ts`
- Reads all environment variables at startup.
- Throws immediately if any required variable is missing.
- Exports a typed, validated `env` object — never use `process.env` anywhere else.

```ts
import { env } from '../config/env';
// always import from here, never process.env directly
```

### `database.ts`
- Single exported `connectDB()` function.
- Called once in `server.ts` before `app.listen()`.

### `email.ts`
- Creates and exports the Nodemailer transport.
- No business logic — transport config only.

### `swagger.ts`
- OpenAPI spec options + swagger-jsdoc setup.
- Mounted in `app.ts`.

---

## `models/`

- One file per MongoDB collection.
- Each file exports: a Mongoose model + an interface (in `types/index.ts`, not inline).
- Use `Schema<IEntity>` generic for type safety.
- Always include `{ timestamps: true }` in schema options.
- Add indexes directly on the schema (`index: true` on field, or `Schema.index()` for compound/sparse).
- Instance methods (e.g. `comparePassword`, `isLocked`) belong on the schema — keep them here, not in the service.
- Hashing and derived field logic belong in `pre('save')` hooks.

```ts
// Correct — index on frequently queried fields
email: { type: String, unique: true, index: true }
UserSchema.index({ verificationToken: 1 }, { sparse: true });
```

---

## `repositories/`

- All Mongoose queries live here — no Mongoose calls anywhere else.
- Methods must be named clearly and be single-purpose.
- Always return the domain interface (`IEntity | null`) — never raw Mongoose documents.
- Export a **singleton instance** frozen at the bottom of the file.

```ts
export class UserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() });
  }
  // ...
}

export const userRepository = new UserRepository();
```

---

## `services/`

- Business logic only — orchestrate repositories + other services.
- Never import `Request`, `Response`, or anything HTTP-related.
- Throw `Error` with a human-readable message on failure — the controller catches it.
- Use `logger.info()` for important state transitions; never log to console.
- Export a **frozen singleton** at the bottom.
- Private helper methods (e.g. `toPublicUser`) keep sensitive fields out of responses.

```ts
export class AuthService {
  private toPublicUser(user: IUser): PublicUser { /* strip sensitive fields */ }

  async register(email: string, password: string, profile: Profile): Promise<IUser> {
    const existing = await userRepository.findByEmail(email);
    if (existing) throw new Error('User with this email already exists');
    // ...
  }
}

export const authService = Object.freeze(new AuthService());
```

---

## `controllers/`

- HTTP adapters only — read `req`, call the service, write `res`.
- No business logic whatsoever.
- Always wrap in `try/catch` — use `errorResponse` or `serverErrorResponse` from `utils/response.ts`.
- Always read `lang` from `req.lang` (set by i18n middleware) with `'en'` fallback.
- All user-facing strings go through `t(lang, 'key')` — never hardcode strings.
- Export a **frozen singleton** — always use `Object.freeze()`.
- Always `.bind(controller)` when registering routes — avoids `this` context loss with frozen objects.

```ts
export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    const lang = (req as AuthRequest).lang || 'en';
    try {
      const user = await authService.register(/* ... */);
      createdResponse(res, { id: user._id, email: user.email }, t(lang, 'auth.registerSuccess'));
    } catch (error: any) {
      logger.error('Registration error:', error);
      errorResponse(res, error.message || t(lang, 'auth.registrationFailed'), 400);
    }
  }
}

export const authController = Object.freeze(new AuthController());
```

---

## `routes/`

- One file per domain, one Express `Router` per file.
- Route middleware order: **rateLimit → validate → authenticate → controller**
- Always `.bind(controller)` when registering — avoids `this` context loss.
- Swagger JSDoc comments go directly above each `router.xxx()` call.

```ts
router.post(
  '/register',
  authLimiter,           // 1. rate limit
  validate(registerValidation),  // 2. validate body
  authController.register.bind(authController)  // 3. controller
);

router.post(
  '/logout',
  authenticate,          // protected route — auth first
  authController.logout.bind(authController)
);
```

---

## `middlewares/`

### `auth.ts`
Export named functions, not a class:
- `authenticate` — requires `Bearer` token, attaches `req.user`.
- `optionalAuthenticate` — attaches `req.user` if token present, does not block.
- `requireEmailVerification` — blocks unverified users (use after `authenticate`).
- `authenticateOAuthLink` — accepts token via header **or** `?access_token=` query param (for browser redirect flows).

### `validate.ts`
- Single `validate(schema)` factory that returns a middleware.
- On failure, call `validationErrorResponse(res, errors)` (422).

### `rateLimit.ts`
- Export named limiters per sensitivity level, e.g. `authLimiter`, `passwordResetLimiter`, `emailVerificationLimiter`.
- Never use a single global limiter for all routes.

### `i18n.ts`
- Reads `Accept-Language` header.
- Sets `req.lang = 'en' | 'ar'` for downstream use.

### `errorHandler.ts`
- Global Express error handler (4-arg signature).
- Last middleware registered in `app.ts`.

---

## `validators/`

- Validation schemas only — no middleware logic.
- One file per domain.
- Used by `validate()` middleware: `validate(registerValidation)`.

---

## `utils/`

### `response.ts`
All HTTP responses must go through these helpers — never call `res.json()` directly.

| Function | Status | Use for |
|---|---|---|
| `successResponse(res, data, message)` | 200 | Any success |
| `createdResponse(res, data, message)` | 201 | Resource created |
| `errorResponse(res, message, statusCode)` | 4xx | Business rule failure |
| `serverErrorResponse(res, message)` | 500 | Unexpected errors |
| `unauthorizedResponse(res, message)` | 401 | Missing/invalid auth |
| `forbiddenResponse(res, message)` | 403 | Insufficient permissions |
| `notFoundResponse(res, message)` | 404 | Resource not found |
| `conflictResponse(res, message)` | 409 | Duplicate resource |
| `validationErrorResponse(res, errors)` | 422 | Validation failure |

Response shape is always:
```json
{ "success": true|false, "message": "...", "data": {} }
```

### `logger.ts`
- Winston logger — exports a single `logger` instance.
- Use `logger.info()` for state changes, `logger.error()` in catch blocks.
- Never use `console.log` in production code.

### `i18n.ts`
- Exports `t(lang, key)` — looks up `locales/en.json` or `locales/ar.json`.
- All user-facing strings (errors, success messages) come from here.

### `crypto.ts`
- Pure helpers: hash, compare, generate tokens.
- No side effects, no imports from other layers.

---

## `locales/`

- `en.json` + `ar.json` — keys grouped by feature section.
- Every string that ever reaches a user must be here.
- Add to **both** files simultaneously.

```json
{
  "auth": {
    "registerSuccess": "User registered successfully.",
    "loginFailed": "Invalid email or password."
  },
  "middleware": {
    "noTokenProvided": "No token provided.",
    "userNotFound": "User not found."
  }
}
```

---

## `types/index.ts`

- Single file for all shared TypeScript interfaces and types.
- Never define reused interfaces inline in components or services.
- Always extend `Document` for Mongoose documents.
- Extend `Request` for custom Express request types.

```ts
export interface AuthRequest extends Request {
  user?: { userId: string; sessionId: string; email: string; };
  lang?: string;
}

export interface IUser extends Document { /* ... */ }
```

---

## `api/index.ts` — Serverless Entry

```ts
import app from '../src/app';
export default app;
```

- Vercel treats this as the serverless handler.
- Does NOT call `app.listen()` — that's only in `server.ts`.
- `vercel.json` rewrites all routes to this handler.

---

## Singleton Export Pattern

Every class that is instantiated once must be frozen. No exceptions.

```ts
export const authService = Object.freeze(new AuthService());
export const userRepository = Object.freeze(new UserRepository());
export const authController = Object.freeze(new AuthController());
```

`Object.freeze()` prevents accidental property reassignment at runtime.
Always `.bind(instance)` when passing methods to Express routes — frozen objects do not auto-bind `this`.

---

## Security Rules

- Never expose sensitive fields (`password`, `twoFactorSecret`, `backupCodes`) in API responses — use a `toPublicUser()` private method.
- Password reset and "user not found" endpoints always return the same generic response — do not reveal whether an email exists.
- Rate-limit all auth endpoints — higher limits for login/register, tighter for password reset.
- Revoke **all sessions** after password reset. Revoke **all other sessions** after password change.
- Validate all incoming data before it reaches the service layer — never pass `req.body` directly.

---

## Dos and Don'ts

| Do | Don't |
|---|---|
| Throw `new Error('message')` in services | Return `null` for business failures in services |
| Use `t(lang, 'key')` for all user-facing strings | Hardcode any string in controllers or services |
| Use `logger.info/error()` for all logging | Use `console.log` anywhere |
| Import `env` from `config/env.ts` | Access `process.env` directly |
| Call response helpers from `utils/response.ts` | Call `res.json()` or `res.status().send()` directly |
| Export singletons at the bottom of each file | Instantiate classes at call sites |
| Put all Mongoose queries in repositories | Query Mongoose inside services or controllers |
| Put all business rules in services | Put business logic in controllers or repositories |
| `.bind(controller)` on every route | Register unbound controller methods |
| Add Swagger JSDoc above every route | Write a separate swagger file |
| Add indexes on all queried/sorted fields | Leave frequently queried fields unindexed |
| Use `{ timestamps: true }` on all schemas | Manage `createdAt`/`updatedAt` manually |
