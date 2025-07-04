// preparator-app/src/lib/stores/preparation.ts
// ✅ Store de préparation corrigé pour compatibilité backend

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { apiClient } from '@/lib/api';
import type { 
  Preparation, 
  Agency, 
  VehicleFormData, 
  StepCompletionData, 
  IssueReportData,
  ApiResponse 
} from '@/lib/types';

interface PreparationStore {
  // État
  currentPreparation: Preparation | null;
  userAgencies: Agency[];
  isLoading: boolean;
  error: string | null;

  // Actions principales
  startPreparation: (data: VehicleFormData) => Promise<void>;
  completeStep: (preparationId: string, data: StepCompletionData) => Promise<void>;
  completePreparation: (preparationId: string, notes?: string) => Promise<void>;
  reportIssue: (preparationId: string, data: IssueReportData) => Promise<void>;

  // Actions de récupération
  getCurrentPreparation: () => Promise<void>;
  getUserAgencies: () => Promise<void>;
  getPreparationHistory: (filters?: any) => Promise<any>;

  // Actions utilitaires
  clearError: () => void;
  reset: () => void;
}

export const usePreparationStore = create<PreparationStore>()(
  subscribeWithSelector((set, get) => ({
    // ===== ÉTAT INITIAL =====
    currentPreparation: null,
    userAgencies: [],
    isLoading: false,
    error: null,

    // ===== ACTIONS PRINCIPALES =====

    // ✅ Démarrer une préparation
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
        console.log('📸 Complétion étape:', data.stepType, 'pour préparation:', preparationId);
        
        const formData = new FormData();
        
        // ✅ CORRECTION CRITIQUE: Utiliser 'step' comme attendu par le backend
        formData.append('step', data.stepType); // Backend attend 'step', pas 'stepType'
        
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
          console.log('✅ Étape complétée:', data.stepType);
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
          set({ currentPreparation: null, isLoading: false });
        } else {
          const errorMessage = error.response?.data?.message || 'Erreur lors de la récupération';
          set({ error: errorMessage, isLoading: false });
        }
      }
    },

    // ✅ Récupérer les agences de l'utilisateur
    getUserAgencies: async () => {
      try {
        const response = await apiClient.get<ApiResponse<{ agencies: Agency[] }>>('/preparations/user-agencies');
        
        if (response.data.success && response.data.data) {
          set({ userAgencies: response.data.data.agencies });
          console.log('✅ Agences récupérées:', response.data.data.agencies.length);
        }
      } catch (error: any) {
        console.error('❌ Erreur récupération agences:', error);
        // Les agences ne sont pas critiques pour le fonctionnement
      }
    },

    // ✅ Récupérer l'historique des préparations
    getPreparationHistory: async (filters = {}) => {
      set({ isLoading: true, error: null });
      
      try {
        const params = new URLSearchParams();
        
        if (filters.startDate) {
          params.append('startDate', filters.startDate.toISOString());
        }
        if (filters.endDate) {
          params.append('endDate', filters.endDate.toISOString());
        }
        if (filters.agencyId) {
          params.append('agencyId', filters.agencyId);
        }
        if (filters.search) {
          params.append('search', filters.search);
        }
        
        const response = await apiClient.get(`/preparations/history?${params.toString()}`);
        
        set({ isLoading: false });
        return response.data;
      } catch (error: any) {
        console.error('❌ Erreur récupération historique:', error);
        const errorMessage = error.response?.data?.message || 'Erreur lors de la récupération de l\'historique';
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    // ===== ACTIONS UTILITAIRES =====

    // ✅ Effacer l'erreur
    clearError: () => {
      set({ error: null });
    },

    // ✅ Reset du store
    reset: () => {
      set({
        currentPreparation: null,
        userAgencies: [],
        isLoading: false,
        error: null
      });
    }
  }))
);

// ===== HOOKS UTILITAIRES =====

// ✅ Hook pour obtenir les statistiques de la préparation courante
export const usePreparationStats = () => {
  const currentPreparation = usePreparationStore(state => state.currentPreparation);
  
  if (!currentPreparation) {
    return null;
  }
  
  const completedSteps = currentPreparation.steps.filter(step => step.completed).length;
  const totalSteps = currentPreparation.steps.length;
  const nextStep = currentPreparation.steps.find(step => !step.completed);
  
  return {
    completedSteps,
    totalSteps,
    progress: currentPreparation.progress,
    nextStep: nextStep?.step || null,
    duration: currentPreparation.currentDuration,
    isOnTime: currentPreparation.isOnTime,
    canComplete: completedSteps === totalSteps
  };
};

// ✅ Hook pour obtenir l'étape suivante
export const useNextStep = () => {
  const currentPreparation = usePreparationStore(state => state.currentPreparation);
  
  if (!currentPreparation) return null;
  
  return currentPreparation.steps.find(step => !step.completed) || null;
};