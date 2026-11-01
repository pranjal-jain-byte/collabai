// useSocket Hook - Real-time connection management

import { useState, useEffect } from 'react';
import { socketService } from '../services/socket.js';
import { useAuth } from './useAuth.jsx';

export function useSocket() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    if (!user) {
      socketService.disconnect();
      setConnectionStatus('disconnected');
      return;
    }

    const unsubConnection = socketService.onConnectionChange(setConnectionStatus);
    socketService.connect();

    return () => {
      unsubConnection();
    };
  }, [user]);

  return {
    connectionStatus,
    socket: socketService,
  };
}
