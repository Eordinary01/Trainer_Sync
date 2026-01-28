import dotenv from "dotenv";
dotenv.config();


import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/database.js';
import { logger } from './middleware/logger.middleware.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { authenticate } from './middleware/auth.middleware.js';

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import leavesRoutes from './routes/leave.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';

const app = express();


connectDB().then(() => {
  console.log('Database connected successfully');
}).catch(err => {
  console.error('Database connection failed:', err);
  process.exit(1);
});


app.use(express.json());
app.use(helmet());

// Apply CORS middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://trainer-sync-tau.vercel.app'
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
  optionsSuccessStatus: 204
}));
app.use(express.urlencoded({ extended: true }));
app.use(logger);


app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});


app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, usersRoutes);
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/attendance', authenticate, attendanceRoutes);
app.use('/api/leaves', authenticate, leavesRoutes);
app.use('/api/notifications', authenticate, notificationsRoutes);


app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});


app.use(errorHandler);

export default app;