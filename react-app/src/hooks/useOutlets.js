import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { outletsApi } from '../services/api';

/**
 * Hook for infinite scrolling outlets list
 * @param {Object} options
 * @param {number} options.limit - Items per page
 * @param {string} options.search - Search term
 */
export function useInfiniteOutlets({ limit = 20, search = '' } = {}) {
  return useInfiniteQuery({
    queryKey: ['outlets', 'infinite', { limit, search }],
    queryFn: ({ pageParam = 0 }) =>
      outletsApi.getOutlets({
        limit,
        offset: pageParam,
        search
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.offset + lastPage.limit;
      }
      return undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching a paginated list of outlets
 * @param {Object} params
 * @param {number} params.limit - Items per page
 * @param {number} params.offset - Offset for pagination
 * @param {string} params.search - Search term
 */
export function useOutlets({ limit = 20, offset = 0, search = '' } = {}) {
  return useQuery({
    queryKey: ['outlets', { limit, offset, search }],
    queryFn: () => outletsApi.getOutlets({ limit, offset, search }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching a single outlet
 * @param {string} id - Outlet ID
 */
export function useOutlet(id) {
  return useQuery({
    queryKey: ['outlets', id],
    queryFn: () => outletsApi.getOutlet(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for creating a new outlet
 */
export function useCreateOutlet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: outletsApi.createOutlet,
    onSuccess: () => {
      // Invalidate and refetch outlets queries
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
    },
  });
}

/**
 * Hook for updating an outlet
 */
export function useUpdateOutlet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }) => outletsApi.updateOutlet(id, updates),
    onSuccess: (data, variables) => {
      // Invalidate the specific outlet and list
      queryClient.invalidateQueries({ queryKey: ['outlets', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
    },
  });
}

/**
 * Hook for deleting an outlet
 */
export function useDeleteOutlet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: outletsApi.deleteOutlet,
    onSuccess: () => {
      // Invalidate outlets list
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
    },
  });
}
