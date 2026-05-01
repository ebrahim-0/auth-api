import { User } from '../models/User';
import { IUser } from '../types';

export class UserRepository {
  async findById(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() });
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return User.findOne({ username: username.toLowerCase().trim() });
  }

  async create(
    email: string,
    password: string,
    profile: { name: string; username: string; age: number }
  ): Promise<IUser> {
    const user = new User({
      email: email.toLowerCase(),
      password,
      name: profile.name.trim(),
      username: profile.username.toLowerCase().trim(),
      age: profile.age,
    });
    return user.save();
  }

  async update(userId: string, updates: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(userId, updates, { new: true });
  }

  async delete(userId: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(userId);
    return !!result;
  }

  async findByVerificationToken(token: string): Promise<IUser | null> {
    return User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() },
    });
  }

  async findByPasswordResetToken(token: string): Promise<IUser | null> {
    return User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: new Date() },
    });
  }

  async markEmailAsVerified(userId: string): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      userId,
      {
        isVerified: true,
        $unset: { verificationToken: 1, verificationTokenExpiry: 1 },
      },
      { new: true }
    );
  }

  async updatePassword(userId: string, newPassword: string): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) return null;

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    return user.save();
  }

  /** Used by authenticated change-password — does not touch reset token fields */
  async changePassword(userId: string, newPassword: string): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) return null;

    user.password = newPassword;
    return user.save();
  }

  /** Stores secret + backup codes without activating 2FA (pending verification) */
  async store2FASecret(userId: string, secret: string, backupCodes: string[]): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      userId,
      {
        twoFactorSecret: secret,
        twoFactorEnabled: false,
        backupCodes,
      },
      { new: true }
    );
  }

  /** Activates 2FA after the user has verified their first code */
  async activate2FA(userId: string): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      userId,
      { twoFactorEnabled: true },
      { new: true }
    );
  }

  async disable2FA(userId: string): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      userId,
      {
        twoFactorEnabled: false,
        $unset: { twoFactorSecret: 1, backupCodes: 1 },
      },
      { new: true }
    );
  }

  async useBackupCode(userId: string, code: string): Promise<boolean> {
    const result = await User.updateOne(
      { _id: userId },
      { $pull: { backupCodes: code } }
    );
    return result.modifiedCount > 0;
  }
}

export const userRepository = new UserRepository();
