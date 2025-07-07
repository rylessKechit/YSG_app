import { create } from 'zustand';
import { profileApi, timesheetApi, handleApiError } from '../api';

// ✅ Types basés sur la vraie structure de l'API backend
export interface DashboardData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    agencies: Array<{
      id: string;
      name: string;
      code: string;
      client: string;
      isDefault?: boolean;
    }>;
    stats?: {
      totalPreparations: number;
      onTimeRate: number;
      averageTime: number;
      lastCalculated: string | null;
    };
  };
  today: {
    schedule: {
      id: string;
      agency: {
        id: string;
        name: string;
        code: string;
        client: string;
      };
      startTime: string;
      endTime: string;
      breakStart?: string;
      breakEnd?: string;
      notes?: string;
      workingDuration: number;
      formatted: any;
    } | null;
    
    timesheet: {
      id?: string;
      agency: {
        id: string;
        name: string;
        code: string;
        client: string;
      };
      startTime: string | null;
      endTime: string | null;
      breakStart: string | null;
      breakEnd: string | null;
      delays: {
        startDelay: number;
      };
      totalWorkedMinutes: number;
      status: 'incomplete' | 'complete' | 'pending';
    } | null;
    
    currentPreparation: {
      id: string;
      vehicle: {
        licensePlate: string;
        brand: string;
        model: string;
      };
      agency: {
        id: string;
        name: string;
        code: string;
      };
      startTime: string;
      currentDuration: number;
      progress: number;
    } | null;
    
    currentStatus: string;
  };
  weekStats: {
    period: {
      start: Date;
      end: Date;
    };
    preparations: number;
    onTimePreparations: number;
    punctualDays: number;
    onTimeRate: number;
    punctualityRate: number;
  };
  recentActivity: Array<{
    id: string;
    vehicle: any;
    agency: any;
    date: Date;
    duration: number;
    isOnTime: boolean;
    status: string;
    completedSteps: number;
    totalSteps: number;
  }>;
}

interface DashboardState {
  dashboardData: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  selectedAgencyId: string | null;
}

interface DashboardStore extends DashboardState {
  loadDashboard: () => Promise<void>;
  clockIn: (agencyId: string) => Promise<void>;
  clockOut: (agencyId: string, notes?: string) => Promise<void>;
  startBreak: (agencyId: string) => Promise<void>;
  endBreak: (agencyId: string) => Promise<void>;
  setSelectedAgency: (agencyId: string) => void;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  dashboardData: null,
  isLoading: false,
  error: null,
  selectedAgencyId: null,

  loadDashboard: async () => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('🔄 Chargement dashboard depuis /api/profile/dashboard...');
      
      const data = await profileApi.getDashboard();
      console.log('📄 Données dashboard reçues:', data);
      
      // Extraire l'agence par défaut
      const defaultAgency = data.user?.agencies?.find((a: any) => a.isDefault) || data.user?.agencies?.[0];
      
      set({ 
        dashboardData: data,
        selectedAgencyId: defaultAgency?.id || null,
        isLoading: false 
      });
      
      console.log('✅ Dashboard chargé avec succès');
      
      // Log spécifique pour le planning
      if (data.today?.schedule) {
        console.log('📅 Planning trouvé:', {
          agence: data.today.schedule.agency.name,
          horaires: `${data.today.schedule.startTime} - ${data.today.schedule.endTime}`,
          pause: data.today.schedule.breakStart ? `${data.today.schedule.breakStart} - ${data.today.schedule.breakEnd}` : 'Aucune'
        });
      } else {
        console.log('📅 Aucun planning trouvé pour aujourd\'hui');
      }
      
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
      // ✅ CORRECTION: Appel direct sans data supplémentaire
      await timesheetApi.clockIn(agencyId);
      await get().loadDashboard();
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
    // ✅ CORRECTION: Passer les notes correctement à l'API
    await timesheetApi.clockOut(agencyId, notes ? { notes } : undefined);
    await get().loadDashboard();
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
      // ✅ CORRECTION: Appel direct
      await timesheetApi.startBreak(agencyId);
      await get().loadDashboard();
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
      // ✅ CORRECTION: Appel direct
      await timesheetApi.endBreak(agencyId);
      await get().loadDashboard();
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
  }
}));