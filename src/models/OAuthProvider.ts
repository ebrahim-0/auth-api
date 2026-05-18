import mongoose, { Schema } from 'mongoose';
import { IOAuthProvider } from '../types';

const OAuthProviderSchema = new Schema<IOAuthProvider>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['google', 'github'],
      required: true,
    },
    providerUserId: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
    },
    accessToken: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

/** One account per provider per user */
OAuthProviderSchema.index({ userId: 1, provider: 1 }, { unique: true });
/** Fast lookup during callback */
OAuthProviderSchema.index({ provider: 1, providerUserId: 1 }, { unique: true });

export const OAuthProviderModel = mongoose.model<IOAuthProvider>('OAuthProvider', OAuthProviderSchema);
