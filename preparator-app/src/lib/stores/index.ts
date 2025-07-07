import { useAuthStore } from './auth';
export { useTimesheetStore } from './timesheet';
export { usePreparationStore } from './preparation';
export { useAppStore } from './app';

// ✅ CORRECTION: Hooks combinés avec les vraies méthodes
export const useAuth = () => {
  const { user, isAuthenticated, isLoading, error } = useAuthStore();
  return { user, isAuthenticated, isLoading, error };
};

export const useAuthActions = () => {
  const { 
    login, 
    logout, 
    refreshAuth,     // ✅ Méthode réelle du store
    clearError,
    updateUser,
    checkTokenExpiry
  } = useAuthStore();

  // ✅ Wrapper pour compatibilité avec l'ancien nom
  const refreshToken = async () => {
    try {
      await refreshAuth();
    } catch (error) {
      console.error('❌ Erreur refresh token:', error);
      throw error;
    }
  };

  // ✅ Méthode checkAuth créée
  const checkAuth = async () => {
    try {
      const isTokenValid = checkTokenExpiry();
      if (!isTokenValid) {
        logout();
        return false;
      }
      await refreshAuth();
      return true;
    } catch (error) {
      console.error('❌ Erreur vérification auth:', error);
      logout();
      return false;
    }
  };

  return { 
    login, 
    logout, 
    refreshToken,    // ✅ Pour compatibilité
    refreshAuth,     // ✅ Méthode native
    checkAuth,       // ✅ Créée
    clearError,
    updateUser,
    checkTokenExpiry
  };
};