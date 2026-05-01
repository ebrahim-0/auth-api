import { Router } from 'express';
import { sessionController } from '../controllers/SessionController';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * @swagger
 * /api/session/me:
 *   get:
 *     tags:
 *       - Session Management
 *     summary: Get current user data
 *     description: Retrieve authenticated user's profile information
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User data retrieved successfully
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
 *                   example: User data retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/me',
  authenticate,
  sessionController.getCurrentUser.bind(sessionController)
);

/**
 * @swagger
 * /api/session/current:
 *   get:
 *     tags:
 *       - Session Management
 *     summary: Get current session details
 *     description: Retrieve information about the current active session
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current session retrieved successfully
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
 *                   example: Current session retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Session'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/current',
  authenticate,
  sessionController.getCurrentSession.bind(sessionController)
);

/**
 * @swagger
 * /api/session/list:
 *   get:
 *     tags:
 *       - Session Management
 *     summary: List all active sessions
 *     description: Get a list of all active sessions for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
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
 *                   example: Sessions retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Session'
 *                     total:
 *                       type: integer
 *                       description: Total number of active sessions
 *                       example: 2
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/list',
  authenticate,
  sessionController.listSessions.bind(sessionController)
);

/**
 * @swagger
 * /api/session/{sessionId}:
 *   delete:
 *     tags:
 *       - Session Management
 *     summary: Revoke specific session
 *     description: Terminate a specific session by its ID. Can only revoke your own sessions.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID to revoke
 *     responses:
 *       200:
 *         description: Session revoked successfully
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
 *                   example: Session revoked successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Session not found or does not belong to you
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/:sessionId',
  authenticate,
  sessionController.revokeSession.bind(sessionController)
);

/**
 * @swagger
 * /api/session/revoke/all:
 *   delete:
 *     tags:
 *       - Session Management
 *     summary: Revoke all other sessions
 *     description: Terminate all active sessions except the current one. Useful when you suspect unauthorized access.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Other sessions revoked successfully
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
 *                   example: 2 session(s) revoked successfully. Current session remains active.
 *                 data:
 *                   type: object
 *                   properties:
 *                     revokedCount:
 *                       type: integer
 *                       description: Number of sessions that were revoked
 *                       example: 2
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.delete(
  '/revoke/all',
  authenticate,
  sessionController.revokeAllSessions.bind(sessionController)
);

export default router;
