import { useAuthStore } from '@/lib/stores/auth';

export function useAuth() {
  const { user, isAuthenticated, isLoading, error } = useAuthStore();
  return { user, isAuthenticated, isLoading, error };
}

export function useAuthActions() {
  const { login, logout, refreshToken, checkAuth, clearError } = useAuthStore();
  return { login, logout, refreshToken, checkAuth, clearError };
}