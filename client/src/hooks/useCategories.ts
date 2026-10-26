import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { Category } from '../types';

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data.data;
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Category>) => {
      const { data: res } = await api.post('/categories', data);
      return res.data as Category;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created!');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create category'),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Category> & { id: string }) => {
      const { data: res } = await api.patch(`/categories/${id}`, data);
      return res.data as Category;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated!');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update category'),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, target_category_id }: { id: string; action?: string; target_category_id?: string }) => {
      const { data } = await api.delete(`/categories/${id}`, { data: { action, target_category_id } });
      return data;
    },
    onSuccess: (data) => {
      if (!data.requiresAction) {
        qc.invalidateQueries({ queryKey: ['categories'] });
        qc.invalidateQueries({ queryKey: ['tasks'] });
        toast.success('Category deleted');
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete category'),
  });
}
