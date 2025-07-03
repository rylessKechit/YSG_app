import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { timesheetApi, handleApiError } from '../api';

// Types pour le store Timesheet
interface TimesheetStatus {
  timesheet: {
    id?: string;
    agency: {
      id: string;
      name: string;
      code: string;
    } | null;
    date: string;
    startTime: string | null;
    endTime: string | null;
    breakStart: string | null;
    breakEnd: string | null;
    totalWorkedMinutes: number;
    status: string;
    delays?: {
      startDelay: number;
    };
  } | null;
  
  isNotStarted: boolean;
  isClockedIn: boolean;
  isClockedOut: boolean;
  isOnBreak: boolean;
  currentWorkedMinutes: number;
  currentWorkedTime: string | null;
}

interface TimesheetEntry {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  totalWorkedMinutes: number;
  status: 'incomplete' | 'complete' | 'pending';
  agency?: {
    id: string;
    name: string;
    code: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TimesheetHistoryParams {
  startDate?: string;
  endDate?: string;
  agency?: string;
  status?: 'incomplete' | 'complete' | 'pending';
  page?: number;
  limit?: number;
}

interface TimesheetState {
  todayStatus: TimesheetStatus | null;
  history: TimesheetEntry[] | null;
  isLoading: boolean;
  error: string | null;
}

interface TimesheetStore extends TimesheetState {
  getTodayStatus: (agencyId: string) => Promise<void>;
  clockIn: (agencyId: string) => Promise<void>;
  clockOut: (agencyId: string, notes?: string) => Promise<void>;
  startBreak: (agencyId: string) => Promise<void>;
  endBreak: (agencyId: string) => Promise<void>;
  getHistory: (params?: TimesheetHistoryParams) => Promise<void>;
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

      // Récupérer le statut du jour
      getTodayStatus: async (agencyId: string) => {
        if (!agencyId) {
          console.error('❌ getTodayStatus: agencyId requis');
          set({ 
            error: 'ID d\'agence requis pour récupérer le statut',
            isLoading: false 
          });
          return;
        }

        set({ isLoading: true, error: null });
        
        try {
          console.log('🔄 Récupération statut avec agencyId:', agencyId);
          const status = await timesheetApi.getTodayStatus(agencyId);
          
          console.log('📄 Données statut reçues:', status);
          
          if (!status) {
            throw new Error('Aucune donnée de statut reçue');
          }

          set({ 
            todayStatus: status,
            isLoading: false 
          });
          
          console.log('✅ Statut pointage récupéré avec succès');
          
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ 
            todayStatus: null,
            isLoading: false, 
            error: errorMessage 
          });
          console.error('❌ Erreur récupération statut:', errorMessage);
          throw error;
        }
      },

      // Pointer l'arrivée
      clockIn: async (agencyId: string) => {
        if (!agencyId) {
          const error = 'ID d\'agence requis pour pointer l\'arrivée';
          set({ error });
          throw new Error(error);
        }

        set({ isLoading: true, error: null });
        
        try {
          console.log('⏰ Pointage arrivée pour agence:', agencyId);
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
        if (!agencyId) {
          const error = 'ID d\'agence requis pour pointer le départ';
          set({ error });
          throw new Error(error);
        }

        set({ isLoading: true, error: null });
        
        try {
          console.log('⏰ Pointage départ pour agence:', agencyId, notes ? `avec notes: ${notes}` : '');
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
        if (!agencyId) {
          const error = 'ID d\'agence requis pour commencer la pause';
          set({ error });
          throw new Error(error);
        }

        set({ isLoading: true, error: null });
        
        try {
          console.log('☕ Début pause pour agence:', agencyId);
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
        if (!agencyId) {
          const error = 'ID d\'agence requis pour terminer la pause';
          set({ error });
          throw new Error(error);
        }

        set({ isLoading: true, error: null });
        
        try {
          console.log('🔄 Fin pause pour agence:', agencyId);
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
          console.log('📋 Récupération historique pointages:', params);
          const historyData = await timesheetApi.getHistory(params);
          
          set({ 
            history: historyData,
            isLoading: false 
          });
          
          console.log('✅ Historique récupéré:', historyData?.length || 0, 'entrées');
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
        console.log('🧹 Erreurs nettoyées');
      },

      // Rafraîchir le statut
      refreshStatus: async (agencyId: string) => {
        if (!agencyId) {
          console.warn('⚠️ refreshStatus: agencyId requis');
          return;
        }
        
        console.log('🔄 Rafraîchissement statut pour agence:', agencyId);
        await get().getTodayStatus(agencyId);
      }
    }),
    {
      name: 'timesheet-store',
      partialize: (state) => ({
        history: state.history
      })
    }
  )
);