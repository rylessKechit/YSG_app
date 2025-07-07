import { useAuthStore } from '@/lib/stores/auth';

export function useAuth() {
  const { user, isAuthenticated, isLoading, error } = useAuthStore();
  return { user, isAuthenticated, isLoading, error };
}

export function useAuthActions() {
  // ✅ CORRECTION: Utiliser les vraies méthodes du store
  const { 
    login, 
    logout, 
    refreshAuth,    // ✅ refreshAuth au lieu de refreshToken
    updateUser,     // ✅ Méthode disponible
    clearError,
    checkTokenExpiry // ✅ Méthode disponible
  } = useAuthStore();

  // ✅ Créer un wrapper pour refreshToken (compatibilité)
  const refreshToken = async () => {
    try {
      await refreshAuth();
    } catch (error) {
      console.error('❌ Erreur refresh token:', error);
      throw error;
    }
  };

  // ✅ Créer une méthode checkAuth
  const checkAuth = async () => {
    try {
      // Vérifier d'abord l'expiration du token
      const isTokenValid = checkTokenExpiry();
      
      if (!isTokenValid) {
        console.warn('⚠️ Token expiré');
        logout();
        return false;
      }

      // Optionnellement, rafraîchir l'auth pour vérifier avec le serveur
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
    refreshToken,    // ✅ Wrapper pour compatibilité
    refreshAuth,     // ✅ Méthode native du store
    checkAuth,       // ✅ Méthode créée
    updateUser,      // ✅ Bonus: méthode utile
    clearError,
    checkTokenExpiry // ✅ Bonus: vérification token
  };
}

// ✅ Hook séparé pour les vérifications d'authentification
export function useAuthCheck() {
  const { isAuthenticated, checkTokenExpiry, logout } = useAuthStore();
  
  const isValidSession = () => {
    if (!isAuthenticated) return false;
    return checkTokenExpiry();
  };
  
  const requireAuth = () => {
    if (!isValidSession()) {
      logout();
      return false;
    }
    return true;
  };
  
  return {
    isValidSession,
    requireAuth,
    isAuthenticated
  };
}

// ✅ Hook pour l'initialisation de l'auth
export function useAuthInit() {
  const { isAuthenticated, checkTokenExpiry, logout, refreshAuth } = useAuthStore();
  
  const initializeAuth = async () => {
    try {
      if (!isAuthenticated) {
        console.log('ℹ️ Utilisateur non authentifié');
        return false;
      }
      
      // Vérifier l'expiration du token
      if (!checkTokenExpiry()) {
        console.warn('⚠️ Token expiré lors de l\'initialisation');
        logout();
        return false;
      }
      
      // Optionnellement rafraîchir pour valider avec le serveur
      await refreshAuth();
      console.log('✅ Authentification initialisée');
      return true;
      
    } catch (error) {
      console.error('❌ Erreur initialisation auth:', error);
      logout();
      return false;
    }
  };
  
  return {
    initializeAuth,
    isAuthenticated
  };
}