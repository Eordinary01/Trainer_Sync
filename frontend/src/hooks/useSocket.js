import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './useAuth';

export const useSocket = () => {
  const { user, isAuthenticated, token } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Don't connect if not authenticated
    if (!isAuthenticated || !user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    try {
      // ✅ Use Vite's environment variable format
      const socketUrl = import.meta.env.VITE_SOCKET_URL ;
      
      console.log('🔌 Attempting socket connection to:', socketUrl);
      
      socketRef.current = io(socketUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current.on('connect', () => {
        console.log('✅ Socket connected successfully');
        setIsConnected(true);
        setError(null);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('🔌 Socket connection error:', err.message);
        setError(err.message);
        setIsConnected(false);
      });

    } catch (err) {
      console.error('🔌 Failed to initialize socket:', err);
      setError(err.message);
    }

    // Cleanup
    return () => {
      if (socketRef.current) {
        console.log('🔌 Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [isAuthenticated, user, token]);

  return { 
    socket: socketRef.current, 
    isConnected,
    error,
    emit: (event, data) => socketRef.current?.emit(event, data),
    on: (event, callback) => socketRef.current?.on(event, callback),
    off: (event, callback) => socketRef.current?.off(event, callback)
  };
};