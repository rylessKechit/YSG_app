import { useQuery } from '@tanstack/react-query';
import { agenciesApi } from '@/lib/api/agencies';

export const agencyKeys = {
  all: ['agencies'] as const,
  lists: () => [...agencyKeys.all, 'list'] as const,
  list: (filters?: any) => [...agencyKeys.lists(), filters] as const,
  details: () => [...agencyKeys.all, 'detail'] as const,
  detail: (id: string) => [...agencyKeys.details(), id] as const,
};

export function useAgencies(filters = {}) {
  return useQuery({
    queryKey: agencyKeys.list(filters),
    queryFn: () => agenciesApi.getAgencies(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function useAgency(id: string, enabled = true) {
  return useQuery({
    queryKey: agencyKeys.detail(id),
    queryFn: () => agenciesApi.getAgency(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}