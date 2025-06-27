import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { timesheetApi, handleApiError } from '../api';
import { TimesheetState, TimesheetStatus, Timesheet } from '../types';

interface TimesheetStore extends TimesheetState {
  // Actions
  getTodayStatus: (agencyId: string) => Promise<void>;
  clockIn: (agencyId: string) => Promise<void>;
  clockOut: (agencyId: string, notes?: string) => Promise<void>;
  startBreak: (agencyId: string) => Promise<void>;
  endBreak: (agencyId: string) => Promise<void>;
  getHistory: (params?: any) => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useTimesheetStore = create<TimesheetStore>()(
  persist(
    (set, get) => ({
      // État initial
      todayStatus: null,
      history: [],
      isLoading: false,
      error: null,
      lastSync: null,

      // Obtenir le statut du jour
      getTodayStatus: async (agencyId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const data = await timesheetApi.getTodayStatus(agencyId);
          set({
            todayStatus: data,
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

      // Pointer l'arrivée
      clockIn: async (agencyId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await timesheetApi.clockIn(agencyId);
          
          // Recharger le statut après pointage
          await get().getTodayStatus(agencyId);
          
          console.log('✅ Pointage arrivée réussi');
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      // Pointer le départ
      clockOut: async (agencyId: string, notes?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await timesheetApi.clockOut(agencyId, notes);
          
          // Recharger le statut après pointage
          await get().getTodayStatus(agencyId);
          
          console.log('✅ Pointage départ réussi');
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      // Commencer la pause
      startBreak: async (agencyId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await timesheetApi.startBreak(agencyId);
          
          // Recharger le statut après pointage
          await get().getTodayStatus(agencyId);
          
          console.log('✅ Début pause réussi');
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      // Terminer la pause
      endBreak: async (agencyId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await timesheetApi.endBreak(agencyId);
          
          // Recharger le statut après pointage
          await get().getTodayStatus(agencyId);
          
          console.log('✅ Fin pause réussie');
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
          const data = await timesheetApi.getHistory(params);
          set({
            history: data.timesheets || [],
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
          todayStatus: null,
          history: [],
          isLoading: false,
          error: null,
          lastSync: null
        });
      }
    }),
    {
      name: 'timesheet-storage',
      partialize: (state) => ({
        todayStatus: state.todayStatus,
        lastSync: state.lastSync
      })
    }
  )
);