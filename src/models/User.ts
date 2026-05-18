import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { IUser } from '../types';
import { env } from '../config/env';

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: false,
      minlength: 8,
    },
    hasPassword: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
    },
    age: {
      type: Number,
      required: false,
      min: 13,
      max: 120,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      index: true,
    },
    verificationTokenExpiry: {
      type: Date,
    },
    twoFactorSecret: {
      type: String,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    backupCodes: [{
      type: String,
    }],
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
      index: true,
    },
    passwordResetExpiry: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.pre('save', async function () {
  if (this.password && this.isModified('password')) {
    const salt = await bcrypt.genSalt(env.BCRYPT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
  }
  this.hasPassword = !!this.password;
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

UserSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

UserSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  if (this.lockUntil && this.lockUntil < new Date()) {
    await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
    return;
  }

  const updates: any = { $inc: { loginAttempts: 1 } };

  const needsLock = this.loginAttempts + 1 >= env.MAX_LOGIN_ATTEMPTS && !this.isLocked();

  if (needsLock) {
    const lockTime = new Date();
    lockTime.setMinutes(lockTime.getMinutes() + env.LOCK_TIME_MINUTES);
    updates.$set = { lockUntil: lockTime };
  }

  await this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

UserSchema.index({ verificationToken: 1 }, { sparse: true });
UserSchema.index({ passwordResetToken: 1 }, { sparse: true });
UserSchema.index({ lockUntil: 1 }, { sparse: true, expireAfterSeconds: 0 });

export const User = mongoose.model<IUser>('User', UserSchema);
