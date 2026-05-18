import axios from 'axios';
import { env } from '../config/env';
import { userRepository } from '../repositories/UserRepository';
import { oauthProviderRepository } from '../repositories/OAuthProviderRepository';
import { sessionService } from './SessionService';
import {
  OAuthProvider,
  OAuthUserProfile,
  GoogleTokenResponse,
  GoogleUserInfo,
  GitHubTokenResponse,
  GitHubUserInfo,
  GitHubEmail,
  LoginResponse,
  IUser,
} from '../types';
import { logger } from '../utils/logger';

export class OAuthService {
  // ─── Authorization URL builders ─────────────────────────────────────────────

  buildGoogleAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  buildGitHubAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_REDIRECT_URI,
      scope: 'user:email read:user',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  // ─── Token + profile fetchers ────────────────────────────────────────────────

  private async fetchGoogleProfile(code: string): Promise<OAuthUserProfile> {
    const tokenRes = await axios.post<GoogleTokenResponse>(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }
    );

    const { access_token, refresh_token } = tokenRes.data;

    const userRes = await axios.get<GoogleUserInfo>(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const { id, email, name } = userRes.data;

    return {
      providerUserId: id,
      email,
      name,
      accessToken: access_token,
      refreshToken: refresh_token,
    };
  }

  private async fetchGitHubProfile(code: string): Promise<OAuthUserProfile> {
    const tokenRes = await axios.post<GitHubTokenResponse>(
      'https://github.com/login/oauth/access_token',
      {
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_REDIRECT_URI,
      },
      { headers: { Accept: 'application/json' } }
    );

    const { access_token } = tokenRes.data;
    const authHeader = { headers: { Authorization: `Bearer ${access_token}` } };

    const [userRes, emailsRes] = await Promise.all([
      axios.get<GitHubUserInfo>('https://api.github.com/user', authHeader),
      axios.get<GitHubEmail[]>('https://api.github.com/user/emails', authHeader),
    ]);

    const primaryEmail =
      emailsRes.data.find((e) => e.primary && e.verified)?.email ??
      emailsRes.data.find((e) => e.verified)?.email ??
      userRes.data.email;

    if (!primaryEmail) {
      throw new Error('No verified email found in GitHub account');
    }

    return {
      providerUserId: String(userRes.data.id),
      email: primaryEmail,
      name: userRes.data.name ?? userRes.data.login,
      accessToken: access_token,
    };
  }

  // ─── Core handler ────────────────────────────────────────────────────────────

  async handleCallback(
    provider: OAuthProvider,
    code: string,
    ipAddress: string,
    userAgent: string,
    authenticatedUserId?: string
  ): Promise<{ response: LoginResponse; isNewUser: boolean }> {
    const profile =
      provider === 'google'
        ? await this.fetchGoogleProfile(code)
        : await this.fetchGitHubProfile(code);

    // Check if this provider account is already linked
    const existingLink = await oauthProviderRepository.findByProviderAndId(
      provider,
      profile.providerUserId
    );

    let user: IUser;
    let isNewUser = false;

    if (existingLink) {
      // Provider already linked — load the associated user
      const found = await userRepository.findById(existingLink.userId);
      if (!found) throw new Error('Linked user account no longer exists');
      user = found;

      // Refresh stored tokens
      await oauthProviderRepository.upsert(existingLink.userId, provider, profile);
    } else if (authenticatedUserId) {
      // Link to an already-authenticated user (US2 flow)
      const found = await userRepository.findById(authenticatedUserId);
      if (!found) throw new Error('User not found');
      user = found;

      await oauthProviderRepository.upsert(authenticatedUserId, provider, profile);
      logger.info(`OAuth provider ${provider} linked to user ${authenticatedUserId}`);
    } else {
      // No existing link — find or create by email
      const byEmail = await userRepository.findByEmail(profile.email);

      if (byEmail) {
        // Merge: link the provider to the existing account
        user = byEmail;
        await oauthProviderRepository.upsert(byEmail._id.toString(), provider, profile);
        logger.info(`OAuth provider ${provider} linked to existing user ${byEmail._id}`);
      } else {
        // New user
        user = await userRepository.createOAuthUser(profile.email, profile.name);
        await oauthProviderRepository.upsert(user._id.toString(), provider, profile);
        isNewUser = true;
        logger.info(`New user created via OAuth ${provider}: ${profile.email}`);
      }
    }

    const { tokens, sessionId } = await sessionService.createSession(
      user._id.toString(),
      ipAddress,
      userAgent,
      provider
    );

    const response: LoginResponse = {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        username: user.username,
        age: user.age,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      tokens,
      sessionId,
    };

    return { response, isNewUser };
  }

  // ─── List / unlink ───────────────────────────────────────────────────────────

  async getLinkedProviders(userId: string) {
    const links = await oauthProviderRepository.findByUserId(userId);
    return links.map((l) => ({
      provider: l.provider,
      email: l.email,
      name: l.name,
      linkedAt: l.createdAt,
    }));
  }

  async unlinkProvider(userId: string, provider: OAuthProvider): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const links = await oauthProviderRepository.findByUserId(userId);
    const hasPassword = user.hasPassword;
    const otherLinks = links.filter((l) => l.provider !== provider);

    if (!hasPassword && otherLinks.length === 0) {
      throw new Error('Cannot unlink: no other login method available');
    }

    const deleted = await oauthProviderRepository.deleteByUserIdAndProvider(userId, provider);
    if (!deleted) throw new Error('Provider not linked to this account');

    logger.info(`OAuth provider ${provider} unlinked from user ${userId}`);
  }
}

export const oauthService = Object.freeze(new OAuthService());
