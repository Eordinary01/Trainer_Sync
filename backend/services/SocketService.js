import { Server } from 'socket.io';
import { JWTHelper } from '../utils/jwt.js';

export class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId mapping
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupEventHandlers();
    console.log('✅ Socket.IO server initialized');
  }

  setupEventHandlers() {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket) => {
      console.log('🔌 User connected:', socket.id, 'User ID:', socket.userId);

      // Store user connection
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id);
        
        // Join user-specific room
        socket.join(`user_${socket.userId}`);
        
        // Join role-based rooms
        if (socket.userRole === 'ADMIN' || socket.userRole === 'HR') {
          socket.join('admin_dashboard');
          socket.join('attendance_updates');
          console.log(`✅ User ${socket.userId} joined admin rooms`);
        }
        
        console.log(`✅ User ${socket.userId} (${socket.userRole}) authenticated`);
      }

      // Handle manual room joining
      socket.on('join_admin_room', () => {
        if (socket.userRole === 'ADMIN' || socket.userRole === 'HR') {
          socket.join('admin_dashboard');
          console.log(`✅ User ${socket.userId} joined admin room`);
        }
      });

      socket.on('join_attendance_room', () => {
        socket.join('attendance_updates');
        console.log(`✅ User ${socket.userId} joined attendance room`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          console.log(`🔌 User ${socket.userId} disconnected`);
        }
      });

      // Ping-pong for connection health
      socket.on('ping', (cb) => {
        if (typeof cb === 'function') {
          cb('pong');
        }
      });
    });
  }

  // Socket authentication middleware
  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.log('❌ Socket connection rejected: No token provided');
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = await JWTHelper.verifyToken(token);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      
      next();
    } catch (error) {
      console.log('❌ Socket authentication failed:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      console.log(`📤 Sent ${event} to user ${userId}`);
      return true;
    }
    console.log(`⚠️ User ${userId} not connected for event ${event}`);
    return false;
  }

  // Send notification to all users in a room
  sendToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
    console.log(`📤 Sent ${event} to room ${room}`);
  }

  // Broadcast to all connected clients
  broadcast(event, data) {
    this.io.emit(event, data);
    console.log(`📢 Broadcasted ${event} to all clients`);
  }

  // Send to multiple specific users
  sendToUsers(userIds, event, data) {
    userIds.forEach(userId => this.sendToUser(userId, event, data));
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }
}

export const socketService = new SocketService();