import app from './app.js';
import { envConfig } from './config/environment.js';
import EventEmitter from 'events';

// Fix for MaxListenersExceededWarning
EventEmitter.defaultMaxListeners = 20;

const PORT = envConfig.PORT;

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${envConfig.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});