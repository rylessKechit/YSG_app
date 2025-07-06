// preparator-app/src/lib/stores/preparation.ts
import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { 
  Preparation, 
  Agency, 
  VehicleFormData, 
  StepCompletionData, 
  IssueReportData,
  ApiResponse 
} from '../types';

interface PreparationStore {
  // État
  currentPreparation: Preparation | null;
  userAgencies: Agency[];
  isLoading: boolean;
  error: string | null;

  // Actions
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
      throw error;
    }
  },

  // ✅ Démarrer une préparation
  startPreparation: async (data: VehicleFormData) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('🚀 Démarrage préparation:', data);
      
      const response = await apiClient.post<ApiResponse<{ preparation: Preparation }>>(
        '/preparations/start',
        data
      );

      if (response.data.success && response.data.data) {
        set({ 
          currentPreparation: response.data.data.preparation,
          isLoading: false 
        });
        console.log('✅ Préparation démarrée:', response.data.data.preparation.id);
      } else {
        throw new Error(response.data.message || 'Erreur lors du démarrage');
      }
    } catch (error: any) {
      console.error('❌ Erreur démarrage préparation:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors du démarrage de la préparation';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // ✅ Compléter une étape - CORRIGÉ pour utiliser 'step'
  completeStep: async (preparationId: string, data: StepCompletionData) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('📸 Complétion étape:', data.step, 'pour préparation:', preparationId);
      
      const formData = new FormData();
      
      // ✅ CORRECTION CRITIQUE: Utiliser 'step' comme attendu par le backend
      formData.append('step', data.step); // ✅ Backend attend 'step'
      
      if (data.photo) {
        formData.append('photo', data.photo);
        console.log('📷 Photo ajoutée:', data.photo.name, `(${(data.photo.size / 1024 / 1024).toFixed(2)}MB)`);
      }
      
      if (data.notes) {
        formData.append('notes', data.notes);
      }

      const response = await apiClient.put<ApiResponse<{ preparation: Preparation }>>(
        `/preparations/${preparationId}/step`, 
        formData,
        {
          headers: { 
            'Content-Type': 'multipart/form-data' 
          }
        }
      );

      if (response.data.success && response.data.data) {
        set({ 
          currentPreparation: response.data.data.preparation,
          isLoading: false 
        });
        console.log('✅ Étape complétée:', data.step);
      } else {
        throw new Error(response.data.message || 'Erreur lors de la complétion');
      }
    } catch (error: any) {
      console.error('❌ Erreur complétion étape:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la complétion de l\'étape';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // ✅ Terminer une préparation
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
        console.log('✅ Préparation terminée');
      } else {
        throw new Error(response.data.message || 'Erreur lors de la finalisation');
      }
    } catch (error: any) {
      console.error('❌ Erreur finalisation:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la finalisation';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // ✅ Signaler un incident
  reportIssue: async (preparationId: string, data: IssueReportData) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('⚠️ Signalement incident:', data.type);
      
      const formData = new FormData();
      formData.append('type', data.type);
      formData.append('description', data.description);
      formData.append('severity', data.severity || 'medium');
      
      if (data.photo) {
        formData.append('photo', data.photo);
      }

      const response = await apiClient.post<ApiResponse<{ preparation: Preparation }>>(
        `/preparations/${preparationId}/issue`,
        formData,
        {
          headers: { 
            'Content-Type': 'multipart/form-data' 
          }
        }
      );

      if (response.data.success && response.data.data) {
        set({ 
          currentPreparation: response.data.data.preparation,
          isLoading: false 
        });
        console.log('✅ Incident signalé');
      } else {
        throw new Error(response.data.message || 'Erreur lors du signalement');
      }
    } catch (error: any) {
      console.error('❌ Erreur signalement incident:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors du signalement';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // ===== ACTIONS DE RÉCUPÉRATION =====

  // ✅ Récupérer la préparation en cours
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
  }
}));

// ===== HOOKS DÉRIVÉS =====

// Hook pour les statistiques de préparation
export const usePreparationStats = () => {
  const { currentPreparation } = usePreparationStore();
  
  if (!currentPreparation) {
    return {
      completedSteps: 0,
      totalSteps: 0,
      progress: 0,
      canComplete: false,
      nextStep: null
    };
  }

  const completedSteps = currentPreparation.steps.filter(step => step.completed).length;
  const totalSteps = currentPreparation.steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const canComplete = completedSteps === totalSteps;
  
  // Trouver la prochaine étape
  const nextStep = currentPreparation.steps.find(step => !step.completed);

  return {
    completedSteps,
    totalSteps,
    progress,
    canComplete,
    nextStep: nextStep?.step || null
  };
};

// Hook simplifié pour les actions courantes
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
    
    // Actions
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
    refresh: getCurrentPreparation,
    clearError
  };
};