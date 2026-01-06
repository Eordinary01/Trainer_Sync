import app from './app.js';
import { envConfig } from './config/environment.js';
import EventEmitter from 'events';
import http from 'http';
import { socketService } from './services/SocketService.js';

// Fix for MaxListenersExceededWarning
EventEmitter.defaultMaxListeners = 20;

// 🔍 DEBUG LOGS — SEE WHAT IS COMING FROM envConfig
console.log("========= ENVIRONMENT CONFIG LOADED =========");
console.log("envConfig:", envConfig);
console.log("PORT received:", envConfig.PORT);
console.log("NODE_ENV received:", envConfig.NODE_ENV);
console.log("JWT_SECRET received:", envConfig.JWT_SECRET ? "Loaded ✓" : "❌ NOT LOADED (undefined)");
console.log("=============================================\n");

// Extract PORT AFTER logs
const PORT = envConfig.PORT;

// ✅ Create HTTP server for Socket.IO
const server = http.createServer(app);

// ✅ Initialize Socket.IO
socketService.initialize(server);

// ✅ Start server
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${envConfig.NODE_ENV}`);
  console.log(`🔌 Socket.IO server initialized`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { server };
