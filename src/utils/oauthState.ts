import crypto from 'crypto';
import { OAuthProvider, OAuthStateEntry } from '../types';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** In-memory CSRF state store for OAuth flows */
class OAuthStateStore {
  private store = new Map<string, OAuthStateEntry>();

  generate(provider: OAuthProvider): string {
    const state = crypto.randomBytes(32).toString('hex');
    this.store.set(state, { provider, createdAt: Date.now() });
    return state;
  }

  /** Returns provider if valid, null otherwise. Removes the entry on success. */
  consume(state: string, expectedProvider: OAuthProvider): boolean {
    const entry = this.store.get(state);
    if (!entry) return false;
    this.store.delete(state);

    const isExpired = Date.now() - entry.createdAt > STATE_TTL_MS;
    if (isExpired) return false;

    return entry.provider === expectedProvider;
  }

  /** Remove stale entries (called periodically) */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.createdAt > STATE_TTL_MS) {
        this.store.delete(key);
      }
    }
  }
}

export const oauthStateStore = Object.freeze(new OAuthStateStore());

// Clean up stale states every 15 minutes
setInterval(() => oauthStateStore.cleanup(), 15 * 60 * 1000);
