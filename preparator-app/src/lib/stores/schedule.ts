// src/lib/stores/schedule.ts
import { create } from 'zustand';
import { scheduleApi, timesheetApi, handleApiError } from '../api/client';

interface ScheduleState {
  // Planning du jour
  todaySchedule: any | null;
  weekSchedule: any[] | null;
  
  // Statut pointage
  todayStatus: any | null;
  
  // États de chargement
  isLoadingSchedule: boolean;
  isLoadingStatus: boolean;
  error: string | null;
}

interface ScheduleStore extends ScheduleState {
  // Actions planning
  getTodaySchedule: () => Promise<void>;
  getWeekSchedule: (date?: string) => Promise<void>;
  
  // Actions pointage
  getTodayStatus: () => Promise<void>;
  clockIn: (agencyId: string) => Promise<void>;
  clockOut: (notes?: string) => Promise<void>;
  startBreak: () => Promise<void>;
  endBreak: () => Promise<void>;
  
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
      const schedule = await scheduleApi.getTodaySchedule();
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
      const weekData = await scheduleApi.getWeekSchedule(date);
      set({ 
        weekSchedule: weekData.weekSchedule,
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

  // Pointer l'arrivée
  clockIn: async (agencyId: string) => {
    set({ isLoadingStatus: true, error: null });
    
    try {
      const result = await timesheetApi.clockIn(agencyId);
      
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

  // Pointer le départ
  clockOut: async (notes?: string) => {
    set({ isLoadingStatus: true, error: null });
    
    try {
      await timesheetApi.clockOut(notes);
      
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

  // Commencer la pause
  startBreak: async () => {
    set({ isLoadingStatus: true, error: null });
    
    try {
      await timesheetApi.startBreak();
      
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

  // Terminer la pause
  endBreak: async () => {
    set({ isLoadingStatus: true, error: null });
    
    try {
      await timesheetApi.endBreak();
      
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