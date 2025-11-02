import { useAuthStore } from '../store/authStore.js';
import { useEffect } from 'react';

export const useAuth = () => {
  const auth = useAuthStore();
  
  
  useEffect(() => {
    console.log("🎯 useAuth: Initializing auth store...");
    auth.initialize();
  }, []); 

  return auth;
};