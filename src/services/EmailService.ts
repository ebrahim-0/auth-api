import { emailConfig } from '../config/email';
import { env } from '../config/env';
import { EmailOptions } from '../types';
import { logger } from '../utils/logger';

export class EmailService {
  private async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!env.EMAIL_USER || !env.EMAIL_PASSWORD) {
        logger.warn('Email service not configured. Skipping email send.');
        logger.info(`Email would be sent to: ${options.to}`);
        logger.info(`Subject: ${options.subject}`);
        return true;
      }

      const transporter = emailConfig.getTransporter();

      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      logger.info(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      logger.error('Error sending email:', error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    const verificationLink = `${env.FRONTEND_URL}/verify-email?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p>Thank you for registering! Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:<br/>
          <a href="${verificationLink}">${verificationLink}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 24 hours.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          If you didn't create an account, please ignore this email.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      html,
      text: `Please verify your email by visiting: ${verificationLink}`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:<br/>
          <a href="${resetLink}">${resetLink}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 1 hour.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          If you didn't request a password reset, please ignore this email or contact support if you have concerns.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html,
      text: `Reset your password by visiting: ${resetLink}`,
    });
  }

  async sendWelcomeEmail(email: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome!</h2>
        <p>Your email has been successfully verified. You can now access all features of your account.</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions, feel free to reach out to our support team.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Our Platform',
      html,
      text: 'Your email has been successfully verified!',
    });
  }

  async send2FAEnabledEmail(email: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Two-Factor Authentication Enabled</h2>
        <p>Two-factor authentication has been successfully enabled on your account.</p>
        <p style="color: #666; font-size: 14px;">
          Your account is now more secure. You'll need to provide a verification code from your authenticator app when signing in.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          If you didn't enable this feature, please contact support immediately.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Two-Factor Authentication Enabled',
      html,
      text: 'Two-factor authentication has been enabled on your account.',
    });
  }

  async sendPasswordChangedEmail(email: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Changed</h2>
        <p>Your account password was successfully changed.</p>
        <p style="color: #666; font-size: 14px;">
          All other active sessions have been terminated for your security.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          If you didn't make this change, please reset your password immediately and contact support.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Your Password Has Been Changed',
      html,
      text: 'Your account password was successfully changed. All other sessions have been terminated.',
    });
  }

  async send2FADisabledEmail(email: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Two-Factor Authentication Disabled</h2>
        <p>Two-factor authentication has been disabled on your account.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          If you didn't disable this feature, please contact support immediately and secure your account.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Two-Factor Authentication Disabled',
      html,
      text: 'Two-factor authentication has been disabled on your account.',
    });
  }
}

export const emailService = Object.freeze(new EmailService());
