// src/lib/stores/dashboard.ts
import { create } from 'zustand';
import { profileApi, timesheetApi, handleApiError } from '../api';

interface DashboardState {
  // Données du dashboard
  dashboardData: any | null;
  
  // États de chargement
  isLoading: boolean;
  error: string | null;
  
  // Agence sélectionnée pour les actions
  selectedAgencyId: string | null;
}

interface DashboardStore extends DashboardState {
  // Actions
  loadDashboard: () => Promise<void>;
  clockIn: (agencyId: string) => Promise<void>;
  clockOut: (agencyId: string, notes?: string) => Promise<void>;
  startBreak: (agencyId: string) => Promise<void>;
  endBreak: (agencyId: string) => Promise<void>;
  setSelectedAgency: (agencyId: string) => void;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // État initial
  dashboardData: null,
  isLoading: false,
  error: null,
  selectedAgencyId: null,

  // Charger toutes les données du dashboard
  loadDashboard: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const data = await profileApi.getDashboard();
      
      // Extraire l'agence par défaut si disponible
      const defaultAgency = data.user?.agencies?.find((a: any) => a.isDefault) || data.user?.agencies?.[0];
      
      set({ 
        dashboardData: data,
        selectedAgencyId: defaultAgency?.id || null,
        isLoading: false 
      });
      
      console.log('✅ Dashboard chargé:', data);
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

  // Pointer l'arrivée
  clockIn: async (agencyId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await timesheetApi.clockIn(agencyId);
      
      // Recharger le dashboard après le pointage
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

  // Pointer le départ
  clockOut: async (agencyId: string, notes?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await timesheetApi.clockOut(agencyId, notes);
      
      // Recharger le dashboard après le pointage
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

  // Commencer la pause
  startBreak: async (agencyId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await timesheetApi.startBreak(agencyId);
      
      // Recharger le dashboard après le pointage
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

  // Terminer la pause
  endBreak: async (agencyId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await timesheetApi.endBreak(agencyId);
      
      // Recharger le dashboard après le pointage
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

  // Définir l'agence sélectionnée
  setSelectedAgency: (agencyId: string) => {
    set({ selectedAgencyId: agencyId });
  },

  // Nettoyer les erreurs
  clearError: () => {
    set({ error: null });
  }
}));