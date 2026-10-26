import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { CreateTaskData, Task, PaginatedTasks } from '../types';

interface TaskFilters {
  status?: string;
  priority?: string;
  category_id?: string;
  search?: string;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
  history?: boolean;
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery<PaginatedTasks>({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const { data } = await api.get('/tasks', { params: filters });
      return data;
    },
  });
}

export function useTask(id: string | undefined) {
  return useQuery<Task>({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskData: CreateTaskData) => {
      const { data } = await api.post('/tasks', taskData);
      return data.data as Task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task created!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create task');
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Task> & { id: string }) => {
      const { data: res } = await api.patch(`/tasks/${id}`, data);
      return res.data as Task;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', vars.id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update task');
    },
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completion_note }: { id: string; completion_note?: string }) => {
      const { data } = await api.post(`/tasks/${id}/complete`, { completion_note });
      return data.data as Task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task completed! 🎉');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to complete task');
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task deleted');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete task');
    },
  });
}

// Subtasks
export function useCreateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      const { data } = await api.post(`/subtasks/tasks/${taskId}/subtasks`, { title });
      return data.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['task', vars.taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to add subtask'),
  });
}

export function useUpdateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId, ...data }: { id: string; taskId: string; [key: string]: any }) => {
      const { data: res } = await api.patch(`/subtasks/${id}`, data);
      return res.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['task', vars.taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update subtask'),
  });
}

export function useDeleteSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { data } = await api.delete(`/subtasks/${id}`);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['task', vars.taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete subtask'),
  });
}
