// preparator-app/src/lib/stores/preparation.ts
// ✅ Store complet avec toutes les corrections TypeScript

import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { 
  BackendPreparation as Preparation, // ✅ Utilise le vrai type backend
  Agency, 
  VehicleFormData, 
  IssueReportData,
  StepCompletionData,
  ApiResponse 
} from '../types/preparation'; // ✅ Import corrigé

interface PreparationStore {
  // État
  currentPreparation: Preparation | null;
  userAgencies: Agency[];
  isLoading: boolean;
  error: string | null;

  // ✅ Actions avec signatures corrigées
  startPreparation: (data: VehicleFormData) => Promise<void>;
  completeStep: (preparationId: string, data: StepCompletionData) => Promise<void>;
  completePreparation: (preparationId: string, notes?: string) => Promise<void>;
  reportIssue: (preparationId: string, data: IssueReportData) => Promise<void>;
  getCurrentPreparation: () => Promise<void>;
  getUserAgencies: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const usePreparationStore = create<PreparationStore>((set, get) => ({
  // ===== ÉTAT INITIAL =====
  currentPreparation: null,
  userAgencies: [],
  isLoading: false,
  error: null,

  // ===== ACTIONS DE GESTION =====

  // Nettoyer les erreurs
  clearError: () => set({ error: null }),

  // Réinitialiser le store
  reset: () => set({
    currentPreparation: null,
    userAgencies: [],
    isLoading: false,
    error: null
  }),

  // ===== ACTIONS DE DONNÉES =====

  // ✅ Récupérer les agences utilisateur
  getUserAgencies: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.get<ApiResponse<{ agencies: Agency[] }>>('/preparations/user-agencies');
      
      if (response.data.success && response.data.data) {
        set({ 
          userAgencies: response.data.data.agencies,
          isLoading: false 
        });
      } else {
        throw new Error(response.data.message || 'Erreur lors de la récupération des agences');
      }
    } catch (error: any) {
      console.error('❌ Erreur récupération agences:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la récupération des agences';
      set({ error: errorMessage, isLoading: false });
    }
  },

  // ✅ Récupérer la préparation courante
  getCurrentPreparation: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.get<ApiResponse<{ preparation: Preparation }>>('/preparations/current');
      
      if (response.data.success && response.data.data) {
        set({ 
          currentPreparation: response.data.data.preparation,
          isLoading: false 
        });
      } else {
        // Pas de préparation en cours n'est pas une erreur
        set({ 
          currentPreparation: null,
          isLoading: false 
        });
      }
    } catch (error: any) {
      console.error('❌ Erreur récupération préparation courante:', error);
      // Ne pas mettre d'erreur si pas de préparation en cours
      if (error.response?.status === 404) {
        set({ 
          currentPreparation: null,
          isLoading: false 
        });
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la récupération';
        set({ error: errorMessage, isLoading: false });
      }
    }
  },

  // ✅ Démarrer une nouvelle préparation
  startPreparation: async (data: VehicleFormData) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('🚀 Démarrage préparation:', data);
      
      const response = await apiClient.post<ApiResponse<{ preparation: Preparation }>>('/preparations/start', data);
      
      if (response.data.success && response.data.data) {
        set({ 
          currentPreparation: response.data.data.preparation,
          isLoading: false 
        });
        
        console.log('✅ Préparation démarrée avec succès:', response.data.data.preparation.id);
      } else {
        throw new Error(response.data.message || 'Erreur lors du démarrage de la préparation');
      }
    } catch (error: any) {
      console.error('❌ Erreur démarrage préparation:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors du démarrage de la préparation';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // ✅ Compléter une étape - Signature corrigée
  completeStep: async (preparationId: string, data: StepCompletionData) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('📸 Complétion étape:', preparationId, data.step);
      
      // Créer FormData pour l'upload de la photo
      const formData = new FormData();
      formData.append('step', data.step);
      formData.append('photo', data.photo);
      if (data.notes) {
        formData.append('notes', data.notes);
      }
      
      const response = await apiClient.put<ApiResponse<{ preparation: Preparation }>>(
        `/preparations/${preparationId}/step`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      if (response.data.success && response.data.data) {
        set({ 
          currentPreparation: response.data.data.preparation,
          isLoading: false 
        });
        
        console.log('✅ Étape complétée avec succès:', data.step);
      } else {
        throw new Error(response.data.message || 'Erreur lors de la complétion de l\'étape');
      }
    } catch (error: any) {
      console.error('❌ Erreur complétion étape:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la complétion de l\'étape';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // ✅ Terminer une préparation - Signature corrigée
  completePreparation: async (preparationId: string, notes?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('🏁 Finalisation préparation:', preparationId);
      
      const response = await apiClient.post<ApiResponse<{ preparation: Preparation }>>(
        `/preparations/${preparationId}/complete`,
        { notes: notes || '' }
      );
      
      if (response.data.success && response.data.data) {
        set({ 
          currentPreparation: response.data.data.preparation,
          isLoading: false 
        });
        
        console.log('✅ Préparation terminée avec succès');
      } else {
        throw new Error(response.data.message || 'Erreur lors de la finalisation de la préparation');
      }
    } catch (error: any) {
      console.error('❌ Erreur finalisation préparation:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la finalisation de la préparation';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // ✅ Signaler un incident
  reportIssue: async (preparationId: string, data: IssueReportData) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('🚨 Signalement incident:', preparationId, data.type);
      
      // Créer FormData si une photo est présente
      const formData = new FormData();
      formData.append('type', data.type);
      formData.append('description', data.description);
      if (data.severity) {
        formData.append('severity', data.severity);
      }
      if (data.photo) {
        formData.append('photo', data.photo);
      }
      
      const response = await apiClient.post<ApiResponse<{ issue: any }>>(
        `/preparations/${preparationId}/issue`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      if (response.data.success) {
        // Recharger la préparation pour avoir les incidents mis à jour
        await get().getCurrentPreparation();
        
        console.log('✅ Incident signalé avec succès');
        set({ isLoading: false });
      } else {
        throw new Error(response.data.message || 'Erreur lors du signalement de l\'incident');
      }
    } catch (error: any) {
      console.error('❌ Erreur signalement incident:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors du signalement de l\'incident';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  }
}));

// ===== HOOKS DÉRIVÉS =====

// ✅ Hook pour les statistiques de préparation - Corrigé
export const usePreparationStats = () => {
  const { currentPreparation } = usePreparationStore();
  
  if (!currentPreparation) {
    return {
      completedSteps: 0,
      totalSteps: 6, // Nombre total d'étapes
      progress: 0,
      canComplete: false,
      currentDuration: undefined,
      isOnTime: undefined
    };
  }

  const completedSteps = currentPreparation.steps?.filter(step => step.completed).length || 0;
  const totalSteps = 6; // Nombre fixe d'étapes
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const canComplete = completedSteps > 0; // ✅ Permet de terminer dès qu'une étape est faite

  return {
    completedSteps,
    totalSteps,
    progress,
    canComplete,
    currentDuration: currentPreparation.currentDuration ? 
      `${Math.floor(currentPreparation.currentDuration / 60)}min` : undefined,
    isOnTime: currentPreparation.isOnTime
  };
};

// ✅ Hook simplifié pour les actions courantes
export const usePreparation = () => {
  const {
    currentPreparation,
    isLoading,
    error,
    startPreparation,
    completeStep,
    completePreparation,
    reportIssue,
    getCurrentPreparation,
    clearError
  } = usePreparationStore();

  return {
    // État
    currentPreparation,
    isLoading,
    error,
    
    // Actions avec gestion d'erreur simplifiée
    startPreparation: async (data: VehicleFormData): Promise<boolean> => {
      try {
        await startPreparation(data);
        return true;
      } catch {
        return false;
      }
    },
    
    completeStep: async (preparationId: string, data: StepCompletionData): Promise<boolean> => {
      try {
        await completeStep(preparationId, data);
        return true;
      } catch {
        return false;
      }
    },
    
    completePreparation: async (preparationId: string, notes?: string): Promise<boolean> => {
      try {
        await completePreparation(preparationId, notes);
        return true;
      } catch {
        return false;
      }
    },
    
    reportIssue: async (preparationId: string, data: IssueReportData): Promise<boolean> => {
      try {
        await reportIssue(preparationId, data);
        return true;
      } catch {
        return false;
      }
    },
    
    // Utilitaires
    getCurrentPreparation,
    clearError
  };
};

// ===== EXPORTS =====

export default usePreparationStore;
export type { PreparationStore, StepCompletionData };