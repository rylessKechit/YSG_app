import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { timesheetApi, handleApiError } from '../api';
import { TimesheetStatus, TimesheetEntry, TimesheetHistoryParams } from '../types/timesheet';

interface TimesheetState {
  // Données
  todayStatus: TimesheetStatus | null;
  history: TimesheetEntry[] | null;
  
  // États de chargement
  isLoading: boolean;
  error: string | null;
}

interface TimesheetStore extends TimesheetState {
  // Actions principales - CORRIGÉ: getTodayStatus prend agencyId
  getTodayStatus: (agencyId: string) => Promise<void>;
  clockIn: (agencyId: string) => Promise<void>;
  clockOut: (agencyId: string, notes?: string) => Promise<void>;
  startBreak: (agencyId: string) => Promise<void>;
  endBreak: (agencyId: string) => Promise<void>;
  
  // Historique
  getHistory: (params?: TimesheetHistoryParams) => Promise<void>;
  
  // Utilitaires
  clearError: () => void;
  refreshStatus: (agencyId: string) => Promise<void>;
}

export const useTimesheetStore = create<TimesheetStore>()(
  persist(
    (set, get) => ({
      // État initial
      todayStatus: null,
      history: null,
      isLoading: false,
      error: null,

      // CORRIGÉ: Récupérer le statut du jour avec agencyId
      getTodayStatus: async (agencyId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('🔄 Récupération statut avec agencyId:', agencyId);
          const status = await timesheetApi.getTodayStatus(agencyId);
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
      clockIn: async (agencyId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await timesheetApi.clockIn(agencyId);
          
          // Rafraîchir le statut après pointage
          await get().getTodayStatus(agencyId);
          
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
      clockOut: async (agencyId: string, notes?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await timesheetApi.clockOut(agencyId, notes);
          
          // Rafraîchir le statut après pointage
          await get().getTodayStatus(agencyId);
          
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

      // Commencer la pause
      startBreak: async (agencyId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await timesheetApi.startBreak(agencyId);
          
          // Rafraîchir le statut après pointage
          await get().getTodayStatus(agencyId);
          
          console.log('✅ Début pause réussi');
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

      // Terminer la pause
      endBreak: async (agencyId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await timesheetApi.endBreak(agencyId);
          
          // Rafraîchir le statut après pointage
          await get().getTodayStatus(agencyId);
          
          console.log('✅ Fin pause réussie');
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
      getHistory: async (params?: TimesheetHistoryParams) => {
        set({ isLoading: true, error: null });
        
        try {
          const history = await timesheetApi.getHistory(params);
          set({ 
            history,
            isLoading: false 
          });
          console.log('✅ Historique récupéré:', history);
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ 
            history: null,
            isLoading: false, 
            error: errorMessage 
          });
          console.error('❌ Erreur récupération historique:', errorMessage);
        }
      },

      // Nettoyer les erreurs
      clearError: () => {
        set({ error: null });
      },

      // Rafraîchir le statut
      refreshStatus: async (agencyId: string) => {
        await get().getTodayStatus(agencyId);
      }
    }),
    {
      name: 'timesheet-store',
      partialize: (state) => ({
        todayStatus: state.todayStatus,
        history: state.history
      })
    }
  )
);