import nodemailer, { Transporter } from 'nodemailer';
import { env } from './env';
import { logger } from '../utils/logger';

class EmailConfig {
  private transporter: Transporter | null = null;

  getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT,
        secure: env.EMAIL_PORT === 465,
        auth: {
          user: env.EMAIL_USER,
          pass: env.EMAIL_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Skip verify() in production — it adds latency and fails on restricted networks
      if (env.NODE_ENV !== 'production') {
        this.transporter.verify((error) => {
          if (error) {
            logger.error('Email configuration error:', error);
          } else {
            logger.info('Email server is ready to send messages');
          }
        });
      }
    }

    return this.transporter;
  }
}

export const emailConfig = Object.freeze(new EmailConfig());
