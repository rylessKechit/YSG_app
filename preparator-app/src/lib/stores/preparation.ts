import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, handleApiError } from '../api';
import type { 
  Preparation,
  Agency, 
  VehicleFormData, 
  IssueReportData,
  StepCompletionData,
  ApiResponse 
} from '../types';

// ✅ INTERFACE COMPLÈTE DU STORE
interface PreparationStore {
  // État
  currentPreparation: Preparation | null;
  userAgencies: Agency[];
  history: Preparation[]; // ✅ AJOUT DE HISTORY
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
  getHistory: (params?: { limit?: number; agencyId?: string }) => Promise<void>; // ✅ AJOUT GETHISTORY
  
  // Actions utilitaires
  clearError: () => void;
  reset: () => void;
}

export const usePreparationStore = create<PreparationStore>()(
  persist(
    (set, get) => ({
      // ===== ÉTAT INITIAL =====
      currentPreparation: null,
      userAgencies: [],
      history: [], // ✅ AJOUT DE HISTORY
      isLoading: false,
      error: null,

      // ===== ACTIONS DE GESTION =====

      // Nettoyer les erreurs
      clearError: () => set({ error: null }),

      // Réinitialiser le store
      reset: () => set({
        currentPreparation: null,
        userAgencies: [],
        history: [], // ✅ RESET HISTORY
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
            console.log('✅ Agences utilisateur récupérées:', response.data.data.agencies.length);
          } else {
            throw new Error(response.data.message || 'Erreur lors de la récupération des agences');
          }
        } catch (error: any) {
          console.error('❌ Erreur récupération agences:', error);
          const errorMessage = handleApiError(error);
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
            console.log('✅ Préparation courante récupérée:', response.data.data.preparation.id);
          } else {
            // Pas de préparation en cours n'est pas une erreur
            set({ 
              currentPreparation: null,
              isLoading: false 
            });
            console.log('ℹ️ Aucune préparation en cours');
          }
        } catch (error: any) {
          console.error('❌ Erreur récupération préparation courante:', error);
          const errorMessage = handleApiError(error);
          set({ error: errorMessage, isLoading: false });
        }
      },

      // ✅ AJOUT: Récupérer l'historique des préparations
      getHistory: async (params = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const queryParams = new URLSearchParams();
          if (params.limit) queryParams.set('limit', params.limit.toString());
          if (params.agencyId) queryParams.set('agencyId', params.agencyId);
          
          const response = await apiClient.get<ApiResponse<{ preparations: Preparation[] }>>(
            `/preparations/history?${queryParams.toString()}`
          );
          
          if (response.data.success && response.data.data) {
            set({ 
              history: response.data.data.preparations,
              isLoading: false 
            });
            console.log('✅ Historique récupéré:', response.data.data.preparations.length, 'préparations');
          } else {
            throw new Error(response.data.message || 'Erreur lors de la récupération de l\'historique');
          }
        } catch (error: any) {
          console.error('❌ Erreur récupération historique:', error);
          const errorMessage = handleApiError(error);
          set({ error: errorMessage, isLoading: false, history: [] });
        }
      },

      // ===== ACTIONS DE PRÉPARATION =====

      // ✅ Démarrer une nouvelle préparation
      startPreparation: async (data: VehicleFormData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.post<ApiResponse<{ preparation: Preparation }>>('/preparations/start', data);
          
          if (response.data.success && response.data.data) {
            set({ 
              currentPreparation: response.data.data.preparation,
              isLoading: false 
            });
            console.log('✅ Préparation démarrée:', response.data.data.preparation.id);
          } else {
            throw new Error(response.data.message || 'Erreur lors du démarrage de la préparation');
          }
        } catch (error: any) {
          console.error('❌ Erreur démarrage préparation:', error);
          const errorMessage = handleApiError(error);
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // ✅ Compléter une étape
      completeStep: async (preparationId: string, data: StepCompletionData) => {
        set({ isLoading: true, error: null });
        
        try {
          const formData = new FormData();
          formData.append('step', data.step);
          formData.append('photo', data.photo);
          if (data.notes) formData.append('notes', data.notes);

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
            console.log('✅ Étape complétée:', data.step);
          } else {
            throw new Error(response.data.message || 'Erreur lors de la completion de l\'étape');
          }
        } catch (error: any) {
          console.error('❌ Erreur completion étape:', error);
          const errorMessage = handleApiError(error);
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // ✅ Finaliser une préparation
      completePreparation: async (preparationId: string, notes?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.post<ApiResponse<{ preparation: Preparation }>>(
            `/preparations/${preparationId}/complete`,
            notes && notes.trim() ? notes.trim() : undefined
          );
          
          if (response.data.success && response.data.data) {
            set({ 
              currentPreparation: null, // Plus de préparation courante
              isLoading: false 
            });
            console.log('✅ Préparation finalisée:', preparationId);
            
            // Rafraîchir l'historique
            await get().getHistory({ limit: 5 });
          } else {
            throw new Error(response.data.message || 'Erreur lors de la finalisation de la préparation');
          }
        } catch (error: any) {
          console.error('❌ Erreur finalisation préparation:', error);
          const errorMessage = handleApiError(error);
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // ✅ Signaler un incident
      reportIssue: async (preparationId: string, data: IssueReportData) => {
        set({ isLoading: true, error: null });
        
        try {
          const formData = new FormData();
          formData.append('type', data.type);
          formData.append('description', data.description);
          if (data.severity) formData.append('severity', data.severity);
          if (data.photo) formData.append('photo', data.photo);

          const response = await apiClient.post<ApiResponse<{ preparation: Preparation }>>(
            `/preparations/${preparationId}/issue`,
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
            console.log('✅ Incident signalé:', data.type);
          } else {
            throw new Error(response.data.message || 'Erreur lors du signalement de l\'incident');
          }
        } catch (error: any) {
          console.error('❌ Erreur signalement incident:', error);
          const errorMessage = handleApiError(error);
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      }
    }),
    {
      name: 'preparation-store',
      partialize: (state) => ({
        currentPreparation: state.currentPreparation,
        userAgencies: state.userAgencies,
        // Ne pas persister l'historique pour éviter la staleness
      })
    }
  )
);

// Export des types pour utilisation externe
export type { PreparationStore };