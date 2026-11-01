import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Application,
  ApplicationCreateInput,
  ApplicationListResponse,
  ApplicationMoveInput,
  ApplicationStatus,
  ApplicationUpdateInput,
  BoardResponse,
} from '@/types';

export const APPLICATION_KEYS = {
  all: ['applications'] as const,
  board: () => [...APPLICATION_KEYS.all, 'board'] as const,
  lists: () => [...APPLICATION_KEYS.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...APPLICATION_KEYS.lists(), params] as const,
  details: () => [...APPLICATION_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...APPLICATION_KEYS.details(), id] as const,
};

// 1. Fetch Board
export function useBoard() {
  return useQuery({
    queryKey: APPLICATION_KEYS.board(),
    queryFn: async () => {
      const { data } = await api.get<BoardResponse>('/applications/board');
      return data;
    },
  });
}

// 2. Fetch Filtered List
export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: ApplicationStatus[];
  deadline_before?: string;
  deadline_after?: string;
  has_deadline?: boolean;
  sort_by?: string;
  order?: 'asc' | 'desc';
}

export function useApplicationsList(params: ListParams) {
  return useQuery({
    queryKey: APPLICATION_KEYS.list(params as Record<string, unknown>),
    queryFn: async () => {
      // Build query string cleanly with multi-status array handling
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.page_size) queryParams.set('page_size', params.page_size.toString());
      if (params.search?.trim()) queryParams.set('search', params.search.trim());
      if (params.deadline_before) queryParams.set('deadline_before', params.deadline_before);
      if (params.deadline_after) queryParams.set('deadline_after', params.deadline_after);
      if (typeof params.has_deadline === 'boolean') {
        queryParams.set('has_deadline', params.has_deadline.toString());
      }
      if (params.sort_by) queryParams.set('sort_by', params.sort_by);
      if (params.order) queryParams.set('order', params.order);

      if (params.status && params.status.length > 0) {
        params.status.forEach((st) => queryParams.append('status', st));
      }

      const { data } = await api.get<ApplicationListResponse>(
        `/applications?${queryParams.toString()}`
      );
      return data;
    },
    placeholderData: (prev) => prev, // keepPreviousData behavior
  });
}

// 3. Create Application
export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ApplicationCreateInput) => {
      const { data } = await api.post<Application>('/applications', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.all });
    },
  });
}

// 4. Update Application
export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: ApplicationUpdateInput }) => {
      const { data } = await api.patch<Application>(`/applications/${id}`, updateData);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.board() });
      queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.detail(variables.id) });
    },
  });
}

// 5. Delete Application
export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/applications/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.all });
    },
  });
}

// 6. Move Application (used by Drag-and-Drop)
export function useMoveApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, move }: { id: string; move: ApplicationMoveInput }) => {
      const { data } = await api.patch<Application>(`/applications/${id}/move`, move);
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.board() });
      queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.lists() });
    },
  });
}
