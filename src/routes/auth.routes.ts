import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
} from '../middlewares/rateLimit';
import {
  registerValidation,
  loginValidation,
  verifyEmailValidation,
  resendVerificationValidation,
  passwordResetRequestValidation,
  passwordResetConfirmValidation,
  refreshTokenValidation,
  verify2FAValidation,
  disable2FAValidation,
  changePasswordValidation,
} from '../validators/authValidators';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Create a new user account. An email verification link will be sent to the provided email address.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - username
 *               - age
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecureP@ssw0rd123!
 *                 description: Must contain uppercase, lowercase, number, and special character
 *               name:
 *                 type: string
 *                 maxLength: 120
 *                 example: Jane Doe
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *                 example: jane_doe
 *               age:
 *                 type: integer
 *                 minimum: 13
 *                 maximum: 120
 *                 example: 25
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User registered successfully. Please check your email to verify your account.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     username:
 *                       type: string
 *                     age:
 *                       type: integer
 *                     isVerified:
 *                       type: boolean
 *       400:
 *         description: Registration failed (user already exists or validation error)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post(
  '/register',
  authLimiter,
  validate(registerValidation),
  authController.register.bind(authController)
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login user
 *     description: Authenticate user and receive access and refresh tokens. If 2FA is enabled, a temporary token will be returned instead.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecureP@ssw0rd123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Successful login without 2FA
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Login successful
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         accessToken:
 *                           type: string
 *                           description: JWT access token (valid for 15 minutes)
 *                         refreshToken:
 *                           type: string
 *                           description: Refresh token (valid for 7 days)
 *                         sessionId:
 *                           type: string
 *                           description: Session identifier
 *                 - type: object
 *                   description: 2FA required
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Two-factor authentication required
 *                     data:
 *                       type: object
 *                       properties:
 *                         requiresTwoFactor:
 *                           type: boolean
 *                           example: true
 *                         tempToken:
 *                           type: string
 *                           description: Temporary token for 2FA verification (valid for 10 minutes)
 *       401:
 *         description: Invalid credentials or account locked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post(
  '/login',
  authLimiter,
  validate(loginValidation),
  authController.login.bind(authController)
);

/**
 * @swagger
 * /api/auth/2fa/verify:
 *   post:
 *     tags:
 *       - Two-Factor Authentication
 *     summary: Verify 2FA code and create session
 *     description: |
 *       Complete 2FA verification and create an authenticated session. This endpoint supports two flows:
 *       
 *       **Flow 1: After 2FA Setup**
 *       - After calling /api/auth/2fa/setup, use the returned tempToken
 *       - Verify the code from your authenticator app
 *       - Receive full authentication (accessToken + refreshToken + session)
 *       
 *       **Flow 2: During Login**
 *       - If account has 2FA enabled, login returns a tempToken
 *       - Use that tempToken with your 2FA code
 *       - Complete login and receive session tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tempToken
 *               - code
 *             properties:
 *               tempToken:
 *                 type: string
 *                 description: Temporary token from /api/auth/login or /api/auth/2fa/setup
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               code:
 *                 type: string
 *                 example: "123456"
 *                 description: 6-digit code from authenticator app or 10-character backup code
 *     responses:
 *       200:
 *         description: 2FA verification successful - session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Two-factor authentication successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token (valid for 15 minutes)
 *                     refreshToken:
 *                       type: string
 *                       description: Refresh token (valid for 7 days)
 *                     sessionId:
 *                       type: string
 *                       description: Session identifier
 *       401:
 *         description: Invalid 2FA code or expired temp token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post(
  '/2fa/verify',
  authLimiter,
  validate(verify2FAValidation),
  authController.verify2FA.bind(authController)
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout current session
 *     description: Revoke the current access token and end the session
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/logout',
  authenticate,
  authController.logout.bind(authController)
);

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout all sessions
 *     description: Revoke all active sessions for the current user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All sessions terminated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: All sessions terminated successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/logout-all',
  authenticate,
  authController.logoutAll.bind(authController)
);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify email address
 *     description: Verify user email using the token sent via email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Verification token from email
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Email verified successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/verify-email',
  emailVerificationLimiter,
  validate(verifyEmailValidation),
  authController.verifyEmail.bind(authController)
);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Resend verification email
 *     description: Request a new email verification link
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Verification email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Verification email sent successfully
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post(
  '/resend-verification',
  emailVerificationLimiter,
  validate(resendVerificationValidation),
  authController.resendVerification.bind(authController)
);

/**
 * @swagger
 * /api/auth/password-reset/request:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request password reset
 *     description: Send password reset link to user email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent (generic response for security)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: If the email exists, a password reset link has been sent
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post(
  '/password-reset/request',
  passwordResetLimiter,
  validate(passwordResetRequestValidation),
  authController.passwordResetRequest.bind(authController)
);

/**
 * @swagger
 * /api/auth/password-reset/confirm:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Confirm password reset
 *     description: Reset password using the token from email. All existing sessions will be terminated.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token from email
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewSecureP@ssw0rd123!
 *                 description: Must contain uppercase, lowercase, number, and special character
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password reset successful. All sessions have been terminated.
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/password-reset/confirm',
  authLimiter,
  validate(passwordResetConfirmValidation),
  authController.passwordResetConfirm.bind(authController)
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     description: Get a new access token using a valid refresh token. Old refresh token will be revoked.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: New JWT access token
 *                     refreshToken:
 *                       type: string
 *                       description: New refresh token
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/refresh',
  validate(refreshTokenValidation),
  authController.refreshToken.bind(authController)
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Change password
 *     description: |
 *       Change the authenticated user's password. Requires the current password for verification.
 *       All other active sessions are terminated after a successful change.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: The user's current password
 *                 example: CurrentP@ssw0rd123!
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: Must contain uppercase, lowercase, number, and special character
 *                 example: NewSecureP@ssw0rd456!
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password changed successfully. All other sessions have been terminated.
 *       400:
 *         description: Current password incorrect or new password same as current
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post(
  '/change-password',
  authenticate,
  authLimiter,
  validate(changePasswordValidation),
  authController.changePassword.bind(authController)
);

/**
 * @swagger
 * /api/auth/2fa/setup:
 *   post:
 *     tags:
 *       - Two-Factor Authentication
 *     summary: Setup 2FA and get tempToken
 *     description: |
 *       Generate 2FA secret, QR code, and tempToken for immediate verification.
 *       
 *       **Complete Flow:**
 *       1. Call this endpoint to setup 2FA
 *       2. Scan QR code with Google Authenticator app
 *       3. Save backup codes securely (you'll need one if you lose your device)
 *       4. Use the returned tempToken with /api/auth/2fa/verify to complete setup
 *       5. Enter the 6-digit code from your authenticator app
 *       6. Receive full authentication (no need to logout/login)
 *       
 *       **Note:** The tempToken is valid for 10 minutes.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup successful - now verify with /api/auth/2fa/verify
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Two-factor authentication setup successful. Use tempToken with /api/auth/2fa/verify to complete setup.
 *                 data:
 *                   type: object
 *                   properties:
 *                     secret:
 *                       type: string
 *                       description: 2FA secret (base32 encoded) - keep secure
 *                       example: JBSWY3DPEHPK3PXP
 *                     qrCode:
 *                       type: string
 *                       description: QR code as data URL - scan with Google Authenticator
 *                       example: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 8 backup codes for account recovery - save these securely!
 *                       example: ["ABCD1234EF", "GHIJ5678KL", "MNOP9012QR"]
 *                     tempToken:
 *                       type: string
 *                       description: Temporary token to verify 2FA setup (valid 10 minutes)
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/2fa/setup',
  authenticate,
  authController.setup2FA.bind(authController)
);

/**
 * @swagger
 * /api/auth/2fa/disable:
 *   post:
 *     tags:
 *       - Two-Factor Authentication
 *     summary: Disable 2FA
 *     description: Disable two-factor authentication for the account. Requires password confirmation.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Current account password
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Two-factor authentication disabled successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/2fa/disable',
  authenticate,
  validate(disable2FAValidation),
  authController.disable2FA.bind(authController)
);

export default router;
