import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { timesheetApi, handleApiError } from '../api';
import { TimesheetStatus, TimesheetEntry } from '../types/timesheet';

interface TimesheetState {
  // Données
  todayStatus: TimesheetStatus | null;
  history: TimesheetEntry[] | null;
  
  // États de chargement
  isLoading: boolean;
  error: string | null;
}

interface TimesheetStore extends TimesheetState {
  // Actions principales
  getTodayStatus: () => Promise<void>;
  clockIn: () => Promise<void>;
  clockOut: (notes?: string) => Promise<void>;
  startBreak: () => Promise<void>;
  endBreak: () => Promise<void>;
  
  // Historique
  getHistory: (params?: { startDate?: string; endDate?: string }) => Promise<void>;
  
  // Utilitaires
  clearError: () => void;
  refreshStatus: () => Promise<void>;
}

export const useTimesheetStore = create<TimesheetStore>()(
  persist(
    (set, get) => ({
      // État initial
      todayStatus: null,
      history: null,
      isLoading: false,
      error: null,

      // Récupérer le statut du jour
      getTodayStatus: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const status = await timesheetApi.getTodayStatus();
          set({ 
            todayStatus: status,
            isLoading: false 
          });
          console.log('✅ Statut pointage récupéré:', status);
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ 
            isLoading: false, 
            error: errorMessage 
          });
          console.error('❌ Erreur récupération statut:', errorMessage);
        }
      },

      // Pointer l'arrivée
      clockIn: async () => {
        set({ isLoading: true, error: null });
        
        try {
          await timesheetApi.clockIn();
          
          // Rafraîchir le statut après pointage
          await get().getTodayStatus();
          
          console.log('✅ Pointage arrivée réussi');
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ 
            isLoading: false, 
            error: errorMessage 
          });
          console.error('❌ Erreur pointage arrivée:', errorMessage);
          throw error;
        }
      },

      // Pointer le départ
      clockOut: async (notes?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await timesheetApi.clockOut(notes);
          
          // Rafraîchir le statut après pointage
          await get().getTodayStatus();
          
          console.log('✅ Pointage départ réussi');
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ 
            isLoading: false, 
            error: errorMessage 
          });
          console.error('❌ Erreur pointage départ:', errorMessage);
          throw error;
        }
      },

      // Commencer une pause
      startBreak: async () => {
        set({ isLoading: true, error: null });
        
        try {
          await timesheetApi.startBreak();
          
          // Rafraîchir le statut après pointage
          await get().getTodayStatus();
          
          console.log('✅ Pause commencée');
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ 
            isLoading: false, 
            error: errorMessage 
          });
          console.error('❌ Erreur début pause:', errorMessage);
          throw error;
        }
      },

      // Terminer une pause
      endBreak: async () => {
        set({ isLoading: true, error: null });
        
        try {
          await timesheetApi.endBreak();
          
          // Rafraîchir le statut après pointage
          await get().getTodayStatus();
          
          console.log('✅ Pause terminée');
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ 
            isLoading: false, 
            error: errorMessage 
          });
          console.error('❌ Erreur fin pause:', errorMessage);
          throw error;
        }
      },

      // Récupérer l'historique
      getHistory: async (params?: { startDate?: string; endDate?: string }) => {
        set({ error: null });
        
        try {
          const history = await timesheetApi.getHistory(params);
          set({ history });
          console.log('✅ Historique récupéré:', history.length, 'entrées');
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ error: errorMessage });
          console.error('❌ Erreur récupération historique:', errorMessage);
        }
      },

      // Effacer l'erreur
      clearError: () => set({ error: null }),

      // Rafraîchir le statut
      refreshStatus: async () => {
        await get().getTodayStatus();
      }
    }),
    {
      name: 'timesheet-store',
      partialize: (state) => ({
        // Persister seulement les données utiles
        todayStatus: state.todayStatus,
      }),
    }
  )
);