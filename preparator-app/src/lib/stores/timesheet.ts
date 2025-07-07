import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { timesheetApi, handleApiError } from '../api';

// ✅ TYPES CORRIGÉS AVEC CURRENTSTATUS
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
  // ✅ AJOUT DU CURRENTSTATUS MANQUANT
  currentStatus: 'not_started' | 'working' | 'on_break' | 'finished';
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
      getTodayStatus: async (agencyId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('🔄 Store: getTodayStatus pour agence:', agencyId);
          const status = await timesheetApi.getTodayStatus(agencyId);
          
          set({ 
            todayStatus: status,
            isLoading: false 
          });
          console.log('✅ Store: statut mis à jour:', status);
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ 
            todayStatus: null,
            isLoading: false, 
            error: errorMessage 
          });
          console.error('❌ Store: erreur getTodayStatus:', errorMessage);
        }
      },

      // Pointer l'arrivée
      clockIn: async (agencyId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('🔄 Store: clockIn pour agence:', agencyId);
          const status = await timesheetApi.clockIn(agencyId);
          
          set({ 
            todayStatus: status,
            isLoading: false 
          });
          console.log('✅ Store: arrivée pointée, nouveau statut:', status);
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ 
            isLoading: false, 
            error: errorMessage 
          });
          console.error('❌ Store: erreur clockIn:', errorMessage);
          throw error;
        }
      },

      // Pointer le départ
      clockOut: async (agencyId: string, notes?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('🔄 Store: clockOut pour agence:', agencyId);
          const status = await timesheetApi.clockOut(agencyId, { notes });
          
          set({ 
            todayStatus: status,
            isLoading: false 
          });
          console.log('✅ Store: départ pointé, nouveau statut:', status);
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ 
            isLoading: false, 
            error: errorMessage 
          });
          console.error('❌ Store: erreur clockOut:', errorMessage);
          throw error;
        }
      },

      // Commencer une pause
      startBreak: async (agencyId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('🔄 Store: startBreak pour agence:', agencyId);
          const status = await timesheetApi.startBreak(agencyId);
          
          set({ 
            todayStatus: status,
            isLoading: false 
          });
          console.log('✅ Store: pause commencée, nouveau statut:', status);
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ 
            isLoading: false, 
            error: errorMessage 
          });
          console.error('❌ Store: erreur startBreak:', errorMessage);
          throw error;
        }
      },

      // Terminer une pause
      endBreak: async (agencyId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('🔄 Store: endBreak pour agence:', agencyId);
          const status = await timesheetApi.endBreak(agencyId);
          
          set({ 
            todayStatus: status,
            isLoading: false 
          });
          console.log('✅ Store: pause terminée, nouveau statut:', status);
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ 
            isLoading: false, 
            error: errorMessage 
          });
          console.error('❌ Store: erreur endBreak:', errorMessage);
          throw error;
        }
      },

      // Récupérer l'historique
      getHistory: async (params?: TimesheetHistoryParams) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('🔄 Store: getHistory avec params:', params);
          const history = await timesheetApi.getHistory(params);
          
          set({ 
            history: history.items || history,
            isLoading: false 
          });
          console.log('✅ Store: historique récupéré:', history);
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ 
            history: null,
            isLoading: false, 
            error: errorMessage 
          });
          console.error('❌ Store: erreur getHistory:', errorMessage);
        }
      },

      // Nettoyer les erreurs
      clearError: () => {
        set({ error: null });
      },

      // Rafraîchir le statut
      refreshStatus: async () => {
        const { todayStatus } = get();
        if (todayStatus?.timesheet?.agency?.id) {
          await get().getTodayStatus(todayStatus.timesheet.agency.id);
        }
      }
    }),
    {
      name: 'timesheet-store',
      partialize: (state) => ({
        todayStatus: state.todayStatus
      })
    }
  )
);

// Export des types pour utilisation externe
export type { TimesheetStatus, TimesheetEntry, TimesheetHistoryParams };