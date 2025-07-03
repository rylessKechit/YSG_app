import { create } from 'zustand';
import { timesheetApi, handleApiError } from '../api';
import { TimesheetStatus } from '../types/timesheet';

// CORRIGÉ: Création d'un scheduleApi temporaire ou utilisation directe
// Si scheduleApi n'existe pas, on peut utiliser profileApi
import { profileApi } from '../api/profileApi';

interface ScheduleState {
  // Planning du jour
  todaySchedule: any | null;
  weekSchedule: any[] | null;
  
  // Statut pointage
  todayStatus: TimesheetStatus | null;
  
  // États de chargement
  isLoadingSchedule: boolean;
  isLoadingStatus: boolean;
  error: string | null;
}

interface ScheduleStore extends ScheduleState {
  // Actions planning
  getTodaySchedule: () => Promise<void>;
  getWeekSchedule: (date?: string) => Promise<void>;
  
  // Actions pointage - CORRIGÉ: ajout paramètre agencyId
  getTodayStatus: () => Promise<void>;
  clockIn: (agencyId: string) => Promise<void>;
  clockOut: (agencyId: string, notes?: string) => Promise<void>;
  startBreak: (agencyId: string) => Promise<void>;
  endBreak: (agencyId: string) => Promise<void>;
  
  // Utilitaires
  clearError: () => void;
  refreshAll: () => Promise<void>;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  // État initial
  todaySchedule: null,
  weekSchedule: null,
  todayStatus: null,
  isLoadingSchedule: false,
  isLoadingStatus: false,
  error: null,

  // Récupérer le planning du jour
  getTodaySchedule: async () => {
    set({ isLoadingSchedule: true, error: null });
    
    try {
      // CORRIGÉ: Utilisation de profileApi en attendant scheduleApi
      const dashboardData = await profileApi.getDashboard();
      const schedule = dashboardData.today.schedule;
      
      set({ 
        todaySchedule: schedule,
        isLoadingSchedule: false 
      });
      console.log('✅ Planning du jour récupéré:', schedule);
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ 
        todaySchedule: null,
        isLoadingSchedule: false, 
        error: errorMessage 
      });
      console.error('❌ Erreur récupération planning:', errorMessage);
    }
  },

  // Récupérer le planning de la semaine
  getWeekSchedule: async (date?: string) => {
    set({ isLoadingSchedule: true, error: null });
    
    try {
      const weekData = await profileApi.getWeekSchedule(date);
      set({ 
        weekSchedule: weekData.weekSchedule || weekData,
        isLoadingSchedule: false 
      });
      console.log('✅ Planning semaine récupéré');
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ 
        weekSchedule: null,
        isLoadingSchedule: false, 
        error: errorMessage 
      });
      console.error('❌ Erreur récupération planning semaine:', errorMessage);
    }
  },

  // Récupérer le statut du jour
  getTodayStatus: async () => {
    set({ isLoadingStatus: true, error: null });
    
    try {
      const status = await timesheetApi.getTodayStatus();
      set({ 
        todayStatus: status,
        isLoadingStatus: false 
      });
      console.log('✅ Statut du jour récupéré:', status);
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ 
        todayStatus: null,
        isLoadingStatus: false, 
        error: errorMessage 
      });
      console.error('❌ Erreur récupération statut:', errorMessage);
    }
  },

  // Pointer l'arrivée - CORRIGÉ: ajout paramètre agencyId
  clockIn: async (agencyId: string) => {
    set({ isLoadingStatus: true, error: null });
    
    try {
      await timesheetApi.clockIn(agencyId);
      
      // Rafraîchir le statut après pointage
      await get().getTodayStatus();
      
      console.log('✅ Pointage arrivée réussi');
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ 
        isLoadingStatus: false, 
        error: errorMessage 
      });
      console.error('❌ Erreur pointage arrivée:', errorMessage);
      throw error;
    }
  },

  // Pointer le départ - CORRIGÉ: ajout paramètre agencyId
  clockOut: async (agencyId: string, notes?: string) => {
    set({ isLoadingStatus: true, error: null });
    
    try {
      await timesheetApi.clockOut(agencyId, notes);
      
      // Rafraîchir le statut après pointage
      await get().getTodayStatus();
      
      console.log('✅ Pointage départ réussi');
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ 
        isLoadingStatus: false, 
        error: errorMessage 
      });
      console.error('❌ Erreur pointage départ:', errorMessage);
      throw error;
    }
  },

  // Commencer la pause - CORRIGÉ: ajout paramètre agencyId
  startBreak: async (agencyId: string) => {
    set({ isLoadingStatus: true, error: null });
    
    try {
      await timesheetApi.startBreak(agencyId);
      
      // Rafraîchir le statut après pointage
      await get().getTodayStatus();
      
      console.log('✅ Début pause réussi');
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ 
        isLoadingStatus: false, 
        error: errorMessage 
      });
      console.error('❌ Erreur début pause:', errorMessage);
      throw error;
    }
  },

  // Terminer la pause - CORRIGÉ: ajout paramètre agencyId
  endBreak: async (agencyId: string) => {
    set({ isLoadingStatus: true, error: null });
    
    try {
      await timesheetApi.endBreak(agencyId);
      
      // Rafraîchir le statut après pointage
      await get().getTodayStatus();
      
      console.log('✅ Fin pause réussie');
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ 
        isLoadingStatus: false, 
        error: errorMessage 
      });
      console.error('❌ Erreur fin pause:', errorMessage);
      throw error;
    }
  },

  // Nettoyer les erreurs
  clearError: () => {
    set({ error: null });
  },

  // Rafraîchir toutes les données
  refreshAll: async () => {
    const promises = [
      get().getTodaySchedule(),
      get().getTodayStatus()
    ];
    
    await Promise.allSettled(promises);
  }
}));