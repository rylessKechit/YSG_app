export { useAuthStore } from './auth';
export { useTimesheetStore } from './timesheet';
export { usePreparationStore } from './preparation';
export { useAppStore } from './app';

// Hooks combinés pour faciliter l'usage
export const useAuth = () => {
  const { user, isAuthenticated, isLoading, error } = useAuthStore();
  return { user, isAuthenticated, isLoading, error };
};

export const useAuthActions = () => {
  const { login, logout, refreshToken, checkAuth, clearError } = useAuthStore();
  return { login, logout, refreshToken, checkAuth, clearError };
};