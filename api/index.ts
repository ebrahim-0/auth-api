import { createApp } from '../src/app';
import { connectDatabase } from '../src/config/database';

const app = createApp();

let dbConnected = false;

export default async (req: any, res: any) => {
  if (!dbConnected) {
    try {
      await connectDatabase();
      dbConnected = true;
    } catch (err) {
      res.status(500).json({ success: false, message: 'Database connection failed' });
      return;
    }
  }
  app(req, res);
};
