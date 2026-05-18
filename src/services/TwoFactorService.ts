import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { TwoFactorSecret } from '../types';
import { generateSecurePassword } from '../utils/crypto';
import bcrypt from 'bcrypt';

export class TwoFactorService {
  async generateSecret(email: string): Promise<TwoFactorSecret> {
    const secret = speakeasy.generateSecret({
      name: `Auth API (${email})`,
      issuer: 'Auth API',
      length: 32,
    });

    if (!secret.otpauth_url) {
      throw new Error('Failed to generate 2FA secret');
    }

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    const backupCodes = this.generateBackupCodes();

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  }

  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });
  }

  generateBackupCodes(count = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(generateSecurePassword(10).toUpperCase());
    }
    return codes;
  }

  async hashBackupCodes(codes: string[]): Promise<string[]> {
    const hashedCodes = await Promise.all(
      codes.map((code) => bcrypt.hash(code, 10))
    );
    return hashedCodes;
  }

  async verifyBackupCode(code: string, hashedCodes: string[]): Promise<boolean> {
    for (const hashedCode of hashedCodes) {
      const isValid = await bcrypt.compare(code, hashedCode);
      if (isValid) {
        return true;
      }
    }
    return false;
  }

  async findMatchingBackupCode(code: string, hashedCodes: string[]): Promise<string | null> {
    for (const hashedCode of hashedCodes) {
      const isValid = await bcrypt.compare(code, hashedCode);
      if (isValid) {
        return hashedCode;
      }
    }
    return null;
  }
}

export const twoFactorService = Object.freeze(new TwoFactorService());
