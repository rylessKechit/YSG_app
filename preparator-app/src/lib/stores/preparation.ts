// lib/stores/preparation.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  preparationApi, 
  VehicleFormData, 
  Preparation, 
  Agency, 
  StepCompletionData, 
  IssueReportData,
  PreparationStats 
} from '@/lib/api/preparations';

interface PreparationStore {
  // État
  currentPreparation: Preparation | null;
  userAgencies: Agency[];
  history: Preparation[];
  stats: PreparationStats | null;
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;

  // Actions - Données de base
  getUserAgencies: () => Promise<void>;
  getCurrentPreparation: () => Promise<void>;
  getHistory: (params?: any) => Promise<void>;
  getMyStats: (params?: any) => Promise<PreparationStats>;

  // Actions - Workflow
  startPreparation: (data: VehicleFormData) => Promise<void>;
  completeStep: (preparationId: string, data: StepCompletionData) => Promise<void>;
  completePreparation: (preparationId: string, notes?: string) => Promise<void>;
  reportIssue: (preparationId: string, data: IssueReportData) => Promise<void>;
  cancelPreparation: (preparationId: string, reason?: string) => Promise<void>;

  // Actions - Utilitaires
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
  refreshCurrentPreparation: () => Promise<void>;
}

// Fonction utilitaire pour gérer les erreurs API
const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'Une erreur inattendue s\'est produite';
};

export const usePreparationStore = create<PreparationStore>()(
  persist(
    (set, get) => ({
      // État initial
      currentPreparation: null,
      userAgencies: [],
      history: [],
      stats: null,
      isLoading: false,
      error: null,
      lastSync: null,

      // Obtenir les agences de l'utilisateur
      getUserAgencies: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const data = await preparationApi.getUserAgencies();
          set({
            userAgencies: data.agencies || [],
            isLoading: false,
            lastSync: new Date()
          });
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      // Obtenir la préparation en cours
      getCurrentPreparation: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const data = await preparationApi.getCurrentPreparation();
          set({
            currentPreparation: data.preparation,
            isLoading: false,
            lastSync: new Date()
          });
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      // Rafraîchir la préparation courante
      refreshCurrentPreparation: async () => {
        const { currentPreparation } = get();
        if (!currentPreparation) return;

        try {
          const data = await preparationApi.getPreparation(currentPreparation.id);
          set({
            currentPreparation: data.preparation,
            lastSync: new Date()
          });
        } catch (error) {
          console.error('Erreur rafraîchissement préparation:', error);
        }
      },

      // Obtenir l'historique
      getHistory: async (params = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const data = await preparationApi.getHistory(params);
          set({
            history: data.preparations || [],
            isLoading: false,
            lastSync: new Date()
          });
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      // Obtenir les statistiques
      getMyStats: async (params = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          const stats = await preparationApi.getMyStats(params);
          set({
            stats,
            isLoading: false,
            lastSync: new Date()
          });
          return stats;
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      // Démarrer une préparation
      startPreparation: async (data: VehicleFormData) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await preparationApi.startPreparation(data);
          set({
            currentPreparation: result.preparation,
            isLoading: false,
            lastSync: new Date()
          });
          
          console.log('✅ Préparation démarrée:', result.preparation.vehicle.licensePlate);
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      // Compléter une étape
      completeStep: async (preparationId: string, data: StepCompletionData) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await preparationApi.completeStep(preparationId, data);
          set({
            currentPreparation: result.preparation,
            isLoading: false,
            lastSync: new Date()
          });
          
          console.log('✅ Étape complétée:', data.stepType);
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      // Terminer une préparation
      completePreparation: async (preparationId: string, notes?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await preparationApi.completePreparation(preparationId, notes);
          
          // Mettre à jour l'état
          set({
            currentPreparation: null, // Plus de préparation en cours
            isLoading: false,
            lastSync: new Date()
          });

          // Rafraîchir l'historique
          await get().getHistory();
          
          console.log('✅ Préparation terminée:', result.preparation.vehicle.licensePlate);
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      // Signaler un incident
      reportIssue: async (preparationId: string, data: IssueReportData) => {
        set({ isLoading: true, error: null });
        
        try {
          await preparationApi.reportIssue(preparationId, data);
          
          // Rafraîchir la préparation courante pour voir l'incident
          await get().refreshCurrentPreparation();
          
          set({
            isLoading: false,
            lastSync: new Date()
          });
          
          console.log('✅ Incident signalé:', data.type);
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      // Annuler une préparation
      cancelPreparation: async (preparationId: string, reason?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await preparationApi.cancelPreparation(preparationId, reason);
          
          set({
            currentPreparation: null,
            isLoading: false,
            lastSync: new Date()
          });

          // Rafraîchir l'historique
          await get().getHistory();
          
          console.log('✅ Préparation annulée');
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      // Nettoyer les erreurs
      clearError: () => {
        set({ error: null });
      },

      // Définir l'état de chargement
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Réinitialiser le store
      reset: () => {
        set({
          currentPreparation: null,
          userAgencies: [],
          history: [],
          stats: null,
          isLoading: false,
          error: null,
          lastSync: null
        });
      }
    }),
    {
      name: 'preparation-store',
      partialize: (state) => ({
        // Persister uniquement les données essentielles
        userAgencies: state.userAgencies,
        lastSync: state.lastSync
      })
    }
  )
);