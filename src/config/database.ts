import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    // Skip if already connected (important for serverless warm containers)
    if (mongoose.connection.readyState === 1) return;

    const uri = env.NODE_ENV === 'test' ? env.MONGODB_TEST_URI : env.MONGODB_URI;

    await mongoose.connect(uri);

    logger.info(`MongoDB connected successfully to ${env.NODE_ENV} database`);
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('MongoDB disconnection error:', error);
  }
};

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});
