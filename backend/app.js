import dotenv from "dotenv";
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/database.js';
import { logger } from './middleware/logger.middleware.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { authenticate } from './middleware/auth.middleware.js';
import os from 'os'; // Add this import

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import leavesRoutes from './routes/leave.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';

const app = express();

// Helper to get local IP
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const localIp = getLocalIpAddress();
console.log('📍 Local IP Address:', localIp);

// Database connection
connectDB().then(() => {
  console.log('✅ Database connected successfully');
}).catch(err => {
  console.error('❌ Database connection failed:', err);
  process.exit(1);
});

// Middleware
app.use(express.json());
app.use(helmet());

// ✅ Enhanced CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8081',
  `http://${localIp}:8081`, // Dynamic IP for React Native
  'http://192.168.1.7:8081',
  'http://localhost:5173',
    'https://trainer-sync-tau.vercel.app'
  
  // Add more origins as needed
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.warn('❌ CORS blocked for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
  optionsSuccessStatus: 204
}));

app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Server is running',
    localIp: localIp,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, usersRoutes);
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/portfolio', authenticate, portfolioRoutes);
app.use('/api/attendance', authenticate, attendanceRoutes);
app.use('/api/leaves', authenticate, leavesRoutes);
app.use('/api/notifications', authenticate, notificationsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use(errorHandler);

export default app;