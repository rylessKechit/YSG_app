import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { preparationApi, handleApiError } from '../api';
import { PreparationState, Preparation, Agency, VehicleFormData, StepCompletionData, IssueReportData } from '../types';

interface PreparationStore extends PreparationState {
  // Actions
  getUserAgencies: () => Promise<void>;
  getCurrentPreparation: () => Promise<void>;
  startPreparation: (data: VehicleFormData) => Promise<void>;
  completeStep: (preparationId: string, data: StepCompletionData) => Promise<void>;
  completePreparation: (preparationId: string, notes?: string) => Promise<void>;
  reportIssue: (preparationId: string, data: IssueReportData) => Promise<void>;
  getHistory: (params?: any) => Promise<void>;
  getMyStats: (params?: any) => Promise<any>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const usePreparationStore = create<PreparationStore>()(
  persist(
    (set, get) => ({
      // État initial
      currentPreparation: null,
      userAgencies: [],
      history: [],
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
          await preparationApi.completeStep(preparationId, data);
          
          // Recharger la préparation courante
          await get().getCurrentPreparation();
          
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
          await preparationApi.completePreparation(preparationId, notes);
          
          set({
            currentPreparation: null,
            isLoading: false,
            lastSync: new Date()
          });
          
          console.log('✅ Préparation terminée');
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
          
          // Recharger la préparation courante
          await get().getCurrentPreparation();
          
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
        try {
          return await preparationApi.getMyStats(params);
        } catch (error) {
          console.error('Erreur récupération stats:', error);
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

      // Reset du store
      reset: () => {
        set({
          currentPreparation: null,
          userAgencies: [],
          history: [],
          isLoading: false,
          error: null,
          lastSync: null
        });
      }
    }),
    {
      name: 'preparation-storage',
      partialize: (state) => ({
        userAgencies: state.userAgencies,
        lastSync: state.lastSync
      })
    }
  )
);