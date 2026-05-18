import { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { sessionService } from '../services/SessionService';
import { userRepository } from '../repositories/UserRepository';
import { wsManager } from './wsManager';
import { t } from './i18n';
import { logger } from './logger';

/** Extract Bearer token from the WS upgrade request query string or headers */
const extractToken = (req: IncomingMessage): string | null => {
  // Primary: ?token=<accessToken>
  const url = new URL(req.url || '', 'ws://localhost');
  const queryToken = url.searchParams.get('token');
  if (queryToken) return queryToken;

  // Fallback: Authorization: Bearer <token>
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.substring(7);

  return null;
};

/** Attach a WebSocket server to the existing http.Server */
export const createWsServer = (server: HttpServer): WebSocketServer => {
  const wss = new WebSocketServer({ server, path: '/ws/session' });

  wss.on('connection', async (socket: WebSocket, req: IncomingMessage) => {
    const lang = (req.headers['accept-language'] || '').toLowerCase().startsWith('ar') ? 'ar' : 'en';

    const token = extractToken(req);

    if (!token) {
      socket.close(4401, 'no_token');
      return;
    }

    // Validate the session token
    const session = await sessionService.validateSession(token).catch(() => null);

    if (!session) {
      socket.close(4401, 'invalid_token');
      return;
    }

    const user = await userRepository.findById(session.userId).catch(() => null);

    if (!user) {
      socket.close(4401, 'user_not_found');
      return;
    }

    const sessionId = session._id.toString();
    const userId = user._id.toString();

    wsManager.add(sessionId, userId, socket);

    // Send connected confirmation
    socket.send(JSON.stringify({
      event: 'connected',
      data: { message: t(lang, 'sse.connected') },
    }));

    // Heartbeat — keeps the connection alive through proxies
    const heartbeat = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.ping();
      }
    }, 30_000);

    socket.on('pong', () => {
      // connection alive — no action needed
    });

    socket.on('close', () => {
      clearInterval(heartbeat);
      wsManager.remove(sessionId);
    });

    socket.on('error', (err) => {
      logger.error(`WS error — session ${sessionId}:`, err);
      clearInterval(heartbeat);
      wsManager.remove(sessionId);
    });
  });

  wss.on('error', (err) => {
    logger.error('WebSocket server error:', err);
  });

  logger.info('WebSocket server attached at /ws/session');

  return wss;
};
