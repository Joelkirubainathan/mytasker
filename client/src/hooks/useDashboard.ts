import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { DashboardData } from '../types';

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/dashboard');
      return data.data;
    },
    refetchInterval: 60000,
  });
}

export function useProductivityAnalytics(period: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'productivity', period],
    queryFn: async () => {
      const { data } = await api.get('/analytics/productivity', { params: { period } });
      return data.data;
    },
  });
}
