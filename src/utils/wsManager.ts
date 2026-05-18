import WebSocket from 'ws';
import { logger } from './logger';

export interface NewSessionPayload {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

type WsEvent =
  | { event: 'connected';       data: { message: string } }
  | { event: 'session_revoked'; data: { sessionId: string } }
  | { event: 'new_session';     data: NewSessionPayload };

interface WsClient {
  sessionId: string;
  userId: string;
  socket: WebSocket;
}

class WsManager {
  /** sessionId → client */
  private clients = new Map<string, WsClient>();

  add(sessionId: string, userId: string, socket: WebSocket): void {
    this.clients.set(sessionId, { sessionId, userId, socket });
    logger.info(`WS client connected — session: ${sessionId}`);
  }

  remove(sessionId: string): void {
    this.clients.delete(sessionId);
    logger.info(`WS client disconnected — session: ${sessionId}`);
  }

  /** Push session_revoked to one session then close its socket */
  emitSessionRevoked(sessionId: string): void {
    const client = this.clients.get(sessionId);
    if (!client) return;
    this.send(client, { event: 'session_revoked', data: { sessionId } });
    this.closeSocket(client.socket);
    this.remove(sessionId);
  }

  /** Push new_session to all other sessions of a user */
  emitNewSession(userId: string, newSessionId: string, payload: NewSessionPayload): void {
    this.clients.forEach((client) => {
      if (client.userId === userId && client.sessionId !== newSessionId) {
        this.send(client, { event: 'new_session', data: payload });
      }
    });
  }

  /** Push session_revoked to all sessions of a user, optionally skipping one */
  emitUserSessionsRevoked(userId: string, exceptSessionId?: string): void {
    const toClose: string[] = [];

    this.clients.forEach((client) => {
      if (client.userId === userId && client.sessionId !== exceptSessionId) {
        this.send(client, { event: 'session_revoked', data: { sessionId: client.sessionId } });
        this.closeSocket(client.socket);
        toClose.push(client.sessionId);
      }
    });

    toClose.forEach((id) => this.remove(id));
  }

  private send(client: WsClient, payload: WsEvent): void {
    if (client.socket.readyState !== WebSocket.OPEN) {
      this.remove(client.sessionId);
      return;
    }
    try {
      client.socket.send(JSON.stringify(payload));
    } catch {
      this.remove(client.sessionId);
    }
  }

  private closeSocket(socket: WebSocket): void {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1000, 'session_revoked');
      }
    } catch {
      // already closed
    }
  }
}

export const wsManager = Object.freeze(new WsManager());
