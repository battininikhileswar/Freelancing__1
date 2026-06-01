import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

let socketInstance = null;

/**
 * useSocket — singleton Socket.IO connection with auto-reconnect
 * Joins user room and authority room on connect
 */
export function useSocket() {
  const { user, isAuthenticated, token } = useAuthStore();
  const [isConnected, setIsConnected] = useState(socketInstance ? socketInstance.connected : false);
  const socketRef = useRef(socketInstance);

  useEffect(() => {
    // If not authenticated, disconnect and clear singleton
    if (!isAuthenticated || !token) {
      if (socketInstance) {
        console.log('🔌 Disconnecting socket due to lack of authentication');
        socketInstance.disconnect();
        socketInstance = null;
      }
      setIsConnected(false);
      socketRef.current = null;
      return;
    }

    // Initialize singleton if it doesn't exist yet
    if (!socketInstance) {
      console.log('🔌 Creating new Socket.IO singleton instance...');
      socketInstance = io(import.meta.env.VITE_SOCKET_URL || '', {
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketInstance.on('connect', () => {
        console.log('🟢 Socket connected:', socketInstance.id);
        
        // Join personal notification room
        if (user?.id) socketInstance.emit('join_user', user.id);

        // Join authority dashboard room
        if (user?.authorityId) socketInstance.emit('join_authority', user.authorityId);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('🔴 Socket disconnected:', reason);
      });

      socketInstance.on('connect_error', (err) => {
        console.warn('Socket error:', err.message);
      });

      // Global notification events
      socketInstance.on('status_updated', (data) => {
        toast.success(`Complaint ${data.complaintId}: Status updated to ${data.status}`, {
          icon: '📋',
          duration: 5000,
        });
      });

      socketInstance.on('escalation_alert', (data) => {
        toast.error(`⚡ Escalation Alert: ${data.message}`, {
          duration: 8000,
          id: `escalation-${data.complaintId}`,
        });
      });

      socketInstance.on('new_complaint_assigned', (data) => {
        toast(`📥 New complaint assigned: ${data.complaintId}`, {
          duration: 6000,
          icon: '🔔',
      });
      });
    }

    // Set references and initial connection state
    socketRef.current = socketInstance;
    setIsConnected(socketInstance.connected);

    // Sync this specific hook instance with the singleton events
    const handleConnect = () => {
      setIsConnected(true);
      if (user?.id) socketInstance.emit('join_user', user.id);
      if (user?.authorityId) socketInstance.emit('join_authority', user.authorityId);
    };
    
    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    // Clean up local listeners when this component unmounts
    return () => {
      if (socketInstance) {
        socketInstance.off('connect', handleConnect);
        socketInstance.off('disconnect', handleDisconnect);
      }
    };
  }, [isAuthenticated, token, user?.id, user?.authorityId]);

  const joinComplaintRoom = useCallback((complaintId) => {
    socketRef.current?.emit('join_complaint', complaintId);
  }, []);

  const leaveComplaintRoom = useCallback((complaintId) => {
    socketRef.current?.emit('leave_complaint', complaintId);
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    joinComplaintRoom,
    leaveComplaintRoom,
    on,
  };
}

export default useSocket;
