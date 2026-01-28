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

// -------------------- DATABASE --------------------
connectDB()
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });

// -------------------- CORS --------------------
// Allowed origins: localhost + deployed frontend
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL, // make sure this is set on Render
];

// CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    // allow server-to-server requests and tools like Postman
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.log('❌ Blocked by CORS:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle preflight requests
app.options('/*', cors());

// -------------------- SECURITY --------------------
app.use(helmet());

// -------------------- BODY PARSING --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------- LOGGER --------------------
app.use(logger);

// -------------------- HEALTH CHECK --------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// -------------------- ROUTES --------------------
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, usersRoutes);
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/attendance', authenticate, attendanceRoutes);
app.use('/api/leaves', authenticate, leavesRoutes);
app.use('/api/notifications', authenticate, notificationsRoutes);

// -------------------- 404 HANDLER --------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// -------------------- ERROR HANDLER --------------------
app.use(errorHandler);

export default app;
