import { Router } from 'express';
import { oauthController } from '../controllers/OAuthController';
import { authenticate, authenticateOAuthLink } from '../middlewares/auth';
import { authLimiter } from '../middlewares/rateLimit';

const router = Router();

// ─── Static routes first (must precede /:provider to avoid shadowing) ──────────

/**
 * @swagger
 * /api/auth/oauth/providers:
 *   get:
 *     tags:
 *       - OAuth
 *     summary: List linked OAuth providers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of linked providers
 *       401:
 *         description: Authentication required
 */
router.get('/providers', authenticate, (req, res) => oauthController.listProviders(req as any, res));

/**
 * @swagger
 * /api/auth/oauth/providers/{provider}:
 *   delete:
 *     tags:
 *       - OAuth
 *     summary: Unlink an OAuth provider
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, github]
 *     responses:
 *       200:
 *         description: Provider unlinked
 *       404:
 *         description: Provider not linked
 *       409:
 *         description: Cannot unlink last login method
 */
router.delete('/providers/:provider', authenticate, (req, res) => oauthController.unlinkProvider(req as any, res));

// ─── Dynamic provider routes ─────────────────────────────────────────────────

/**
 * @swagger
 * /api/auth/oauth/{provider}:
 *   get:
 *     tags:
 *       - OAuth
 *     summary: Initiate OAuth login
 *     description: Redirects the browser to the provider's authorization page
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, github]
 *     responses:
 *       302:
 *         description: Redirect to provider
 *       400:
 *         description: Unsupported provider
 *       503:
 *         description: Provider not configured
 */
router.get('/:provider', authLimiter, (req, res) => oauthController.initiate(req as any, res));

/**
 * @swagger
 * /api/auth/oauth/{provider}/callback:
 *   get:
 *     tags:
 *       - OAuth
 *     summary: OAuth callback
 *     description: Handles the authorization code redirect from the provider
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, github]
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Login or registration successful — returns JWT tokens
 *       400:
 *         description: Invalid state or provider error
 */
router.get('/:provider/callback', (req, res) => oauthController.callback(req as any, res));

/**
 * @swagger
 * /api/auth/oauth/{provider}/link:
 *   get:
 *     tags:
 *       - OAuth
 *     summary: Initiate OAuth account linking (authenticated)
 *     description: |
 *       Starts the OAuth flow to link a provider. Use `Authorization: Bearer` or
 *       `?access_token=` (browser redirect cannot send headers).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, github]
 *       - in: query
 *         name: access_token
 *         required: false
 *         schema:
 *           type: string
 *         description: JWT when opening this URL from a full-page browser navigation
 *     responses:
 *       302:
 *         description: Redirect to provider
 *       401:
 *         description: Authentication required
 */
router.get('/:provider/link', authLimiter, authenticateOAuthLink, (req, res) =>
  oauthController.initiate(req as any, res)
);

export default router;
