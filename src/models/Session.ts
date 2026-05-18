import mongoose, { Schema } from 'mongoose';
import { ISession } from '../types';

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    accessToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['google', 'github'],
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);
