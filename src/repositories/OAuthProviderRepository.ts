import { OAuthProviderModel } from '../models/OAuthProvider';
import { IOAuthProvider, OAuthProvider, OAuthUserProfile } from '../types';

export class OAuthProviderRepository {
  async findByProviderAndId(provider: OAuthProvider, providerUserId: string): Promise<IOAuthProvider | null> {
    return OAuthProviderModel.findOne({ provider, providerUserId });
  }

  async findByUserId(userId: string): Promise<IOAuthProvider[]> {
    return OAuthProviderModel.find({ userId });
  }

  async findByUserIdAndProvider(userId: string, provider: OAuthProvider): Promise<IOAuthProvider | null> {
    return OAuthProviderModel.findOne({ userId, provider });
  }

  async upsert(
    userId: string,
    provider: OAuthProvider,
    profile: OAuthUserProfile
  ): Promise<IOAuthProvider> {
    return OAuthProviderModel.findOneAndUpdate(
      { userId, provider },
      {
        providerUserId: profile.providerUserId,
        email: profile.email,
        name: profile.name,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
      },
      { upsert: true, new: true }
    ) as Promise<IOAuthProvider>;
  }

  async deleteByUserIdAndProvider(userId: string, provider: OAuthProvider): Promise<boolean> {
    const result = await OAuthProviderModel.deleteOne({ userId, provider });
    return result.deletedCount > 0;
  }
}

export const oauthProviderRepository = Object.freeze(new OAuthProviderRepository());
