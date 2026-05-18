import { Response } from 'express';
import { AuthRequest, OAuthProvider } from '../types';
import { oauthService } from '../services/OAuthService';
import { oauthStateStore } from '../utils/oauthState';
import { env } from '../config/env';
import { successResponse, errorResponse, serverErrorResponse } from '../utils/response';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';

const SUPPORTED_PROVIDERS: OAuthProvider[] = ['google', 'github'];

export class OAuthController {
  /** GET /api/auth/oauth/:provider — redirect to provider */
  async initiate(req: AuthRequest, res: Response): Promise<void> {
    const lang = req.lang || 'en';
    const provider = req.params.provider as OAuthProvider;

    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      errorResponse(res, t(lang, 'oauth.providerError'), 400);
      return;
    }

    const clientId =
      provider === 'google' ? env.GOOGLE_CLIENT_ID : env.GITHUB_CLIENT_ID;

    if (!clientId) {
      errorResponse(res, t(lang, 'oauth.missingClientCredentials'), 503);
      return;
    }

    const state = oauthStateStore.generate(provider);
    const url =
      provider === 'google'
        ? oauthService.buildGoogleAuthUrl(state)
        : oauthService.buildGitHubAuthUrl(state);

    res.redirect(url);
  }

  /** GET /api/auth/oauth/:provider/callback */
  async callback(req: AuthRequest, res: Response): Promise<void> {
    const lang = req.lang || 'en';
    const provider = req.params.provider as OAuthProvider;
    const { code, state, error } = req.query as Record<string, string>;
    const frontendUrl = env.FRONTEND_URL;

    if (error === 'access_denied') {
      res.redirect(`${frontendUrl}/auth/oauth-error?reason=denied`);
      return;
    }

    if (error) {
      logger.warn(`OAuth provider error for ${provider}: ${error}`);
      res.redirect(`${frontendUrl}/auth/oauth-error?reason=provider_error`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${frontendUrl}/auth/oauth-error?reason=provider_error`);
      return;
    }

    if (!oauthStateStore.consume(state, provider)) {
      res.redirect(`${frontendUrl}/auth/oauth-error?reason=invalid_state`);
      return;
    }

    try {
      const ipAddress = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
      const userAgent = req.headers['user-agent'] ?? 'unknown';

      const { response } = await oauthService.handleCallback(
        provider,
        code,
        ipAddress,
        userAgent,
        req.user?.userId
      );

      const params = new URLSearchParams({
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
        sessionId: response.sessionId,
      });

      res.redirect(`${frontendUrl}/auth/callback?${params}`);
    } catch (err: any) {
      logger.error(`OAuth callback failed for ${provider}: ${err.message}`);

      if (err.message?.includes('No verified email')) {
        res.redirect(`${frontendUrl}/auth/oauth-error?reason=no_email`);
      } else {
        res.redirect(`${frontendUrl}/auth/oauth-error?reason=provider_error`);
      }
    }
  }

  /** GET /api/auth/oauth/providers */
  async listProviders(req: AuthRequest, res: Response): Promise<void> {
    const lang = req.lang || 'en';
    try {
      const providers = await oauthService.getLinkedProviders(req.user!.userId);
      successResponse(res, providers, t(lang, 'oauth.providersSuccess'));
    } catch (err: any) {
      logger.error(`listProviders failed: ${err.message}`);
      serverErrorResponse(res, t(lang, 'oauth.providersFailed'));
    }
  }

  /** DELETE /api/auth/oauth/providers/:provider */
  async unlinkProvider(req: AuthRequest, res: Response): Promise<void> {
    const lang = req.lang || 'en';
    const provider = req.params.provider as OAuthProvider;

    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      errorResponse(res, t(lang, 'oauth.providerError'), 400);
      return;
    }

    try {
      await oauthService.unlinkProvider(req.user!.userId, provider);
      successResponse(res, null, t(lang, 'oauth.unlinkSuccess'));
    } catch (err: any) {
      logger.warn(`unlinkProvider failed: ${err.message}`);
      if (err.message.includes('Cannot unlink')) {
        errorResponse(res, t(lang, 'oauth.cannotUnlinkLastMethod'), 409);
      } else if (err.message.includes('not linked')) {
        errorResponse(res, t(lang, 'oauth.providerNotLinked'), 404);
      } else {
        serverErrorResponse(res, t(lang, 'oauth.unlinkFailed'));
      }
    }
  }
}

export const oauthController = Object.freeze(new OAuthController());
