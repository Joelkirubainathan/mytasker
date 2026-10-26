import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Notification } from '../types';

interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
}

export function useNotifications(unreadOnly?: boolean) {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', unreadOnly],
    queryFn: async () => {
      const { data } = await api.get('/notifications', {
        params: unreadOnly ? { unread_only: 'true' } : {},
      });
      return data;
    },
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
