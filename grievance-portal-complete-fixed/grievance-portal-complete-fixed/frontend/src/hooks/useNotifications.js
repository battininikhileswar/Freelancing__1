import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { useSocket } from './useSocket';

export function useNotifications() {
  const { isAuthenticated } = useAuthStore();
  const { on } = useSocket();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/auth/notifications').then(r => r.data.data),
    enabled: isAuthenticated,
    refetchInterval: 60000, // refresh every minute
  });

  // Real-time: new notification arrives via socket
  useEffect(() => {
    if (!isAuthenticated) return;
    const cleanup = on('new_notification', () => {
      qc.invalidateQueries(['notifications']);
    });
    return cleanup;
  }, [isAuthenticated, on, qc]);

  const markReadMutation = useMutation({
    mutationFn: (id) => api.put(`/auth/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.put('/auth/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markRead = useCallback((id) => {
    markReadMutation.mutate(id);
  }, [markReadMutation]);

  const markAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
  };
}

export default useNotifications;
