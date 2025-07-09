// preparator-app/src/lib/stores/dashboard.ts
import { create } from 'zustand';
import { profileApi } from '@/lib/api/profileApi';
import { timesheetApi } from '@/lib/api/timesheetApi';
import { handleApiError } from '@/lib/api';

export interface DashboardData {
  user: any;
  today: {
    schedule: any;
    timesheet: any;
    currentPreparation: any;
    currentStatus?: {
      status: 'not_started' | 'working' | 'on_break' | 'finished';
      workedTime: number;
      breakTime: number;
      startTime: string | null;
      endTime: string | null;
    };
  };
  stats: any;
}

interface DashboardStore {
  dashboardData: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  selectedAgencyId: string | null;
  loadDashboard: () => Promise<void>;
  clockIn: (agencyId: string) => Promise<void>;
  clockOut: (agencyId: string, notes?: string) => Promise<void>;
  startBreak: (agencyId: string) => Promise<void>;
  endBreak: (agencyId: string) => Promise<void>;
  setSelectedAgency: (agencyId: string) => void;
  clearError: () => void;
}

// ✅ FONCTION UTILITAIRE POUR CALCULER LE STATUT
function calculateCurrentStatus(timesheet: any) {
  if (!timesheet) {
    return {
      status: 'not_started' as const,
      workedTime: 0,
      breakTime: 0,
      startTime: null,
      endTime: null
    };
  }

  // Calcul du statut
  let status: 'not_started' | 'working' | 'on_break' | 'finished';
  
  if (!timesheet.startTime) {
    status = 'not_started';
  } else if (timesheet.endTime) {
    status = 'finished';
  } else if (timesheet.breakStart && !timesheet.breakEnd) {
    status = 'on_break';
  } else {
    status = 'working';
  }

  // Calcul du temps de pause
  let breakTime = 0;
  if (timesheet.breakStart && timesheet.breakEnd) {
    breakTime = Math.floor(
      (new Date(timesheet.breakEnd).getTime() - new Date(timesheet.breakStart).getTime()) / (1000 * 60)
    );
  }

  return {
    status,
    workedTime: timesheet.totalWorkedMinutes || 0,
    breakTime,
    startTime: timesheet.startTime,
    endTime: timesheet.endTime
  };
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  dashboardData: null,
  isLoading: false,
  error: null,
  selectedAgencyId: null,

  loadDashboard: async () => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('🔄 Chargement dashboard...');
      
      // ✅ UN SEUL APPEL API - tout en une fois
      const dashboardData = await profileApi.getDashboard();
      console.log('📄 Données dashboard reçues:', dashboardData);
      
      // Récupérer l'agence par défaut
      const defaultAgency = dashboardData.user?.agencies?.find((a: any) => a.isDefault) || 
                           dashboardData.user?.agencies?.[0];
      
      if (!defaultAgency) {
        throw new Error('Aucune agence assignée');
      }
      
      // ✅ CALCUL DU STATUT À PARTIR DES DONNÉES DÉJÀ REÇUES
      const calculatedStatus = calculateCurrentStatus(dashboardData.today?.timesheet);
      
      // ✅ ENRICHIR avec le statut calculé
      const completeData: DashboardData = {
        ...dashboardData,
        today: {
          ...dashboardData.today,
          currentStatus: calculatedStatus
        }
      };
      
      set({ 
        dashboardData: completeData,
        selectedAgencyId: defaultAgency.id,
        isLoading: false 
      });
      
      console.log('✅ Dashboard chargé avec succès');
      
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ 
        dashboardData: null,
        isLoading: false, 
        error: errorMessage 
      });
      console.error('❌ Erreur chargement dashboard:', errorMessage);
    }
  },

  clockIn: async (agencyId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await timesheetApi.clockIn(agencyId);
      await get().loadDashboard(); // ✅ Recharger après pointage
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

  clockOut: async (agencyId: string, notes?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // ✅ CORRECTION - Appel correct de l'API clockOut
      if (notes) {
        await timesheetApi.clockOut(agencyId, { notes });
      } else {
        await timesheetApi.clockOut(agencyId);
      }
      await get().loadDashboard(); // ✅ Recharger après pointage
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

  startBreak: async (agencyId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await timesheetApi.startBreak(agencyId);
      await get().loadDashboard(); // ✅ Recharger après pause
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

  endBreak: async (agencyId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await timesheetApi.endBreak(agencyId);
      await get().loadDashboard(); // ✅ Recharger après pause
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

  setSelectedAgency: (agencyId: string) => {
    set({ selectedAgencyId: agencyId });
  },

  clearError: () => {
    set({ error: null });
  },
}));