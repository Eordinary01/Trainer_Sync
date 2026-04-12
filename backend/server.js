import app from './app.js';
import { envConfig } from './config/environment.js';
import EventEmitter from 'events';
import http from 'http';
import { socketService } from './services/SocketService.js';
import { CronService } from './services/CronServices.js';
import os from 'os'; // Add this import

// Fix for MaxListenersExceededWarning
EventEmitter.defaultMaxListeners = 20;

// Helper function to get local IP address
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

// Extract PORT
const PORT = process.env.PORT || envConfig.PORT || 8890;
const HOST = '0.0.0.0'; // 👈 THIS IS CRITICAL - binds to all network interfaces

// Get local IP for display
const localIp = getLocalIpAddress();

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO
socketService.initialize(server);

const cronService = new CronService();
cronService.setupCronJobs();

// ✅ Start server with HOST binding
server.listen(PORT, HOST, () => {
  console.log(`
  🚀 Server is running!
  📡 Local: http://localhost:${PORT}
  🌐 Network: http://${localIp}:${PORT}
  🔌 Socket.IO: ws://${localIp}:${PORT}
  `);
  console.log(`📱 Use this IP in your React Native app: ${localIp}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  cronService.stopHealthCheckCron();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { server };