// lib/stores/preparation.ts
'use client';

import { create } from 'zustand';
import { preparationApi } from '@/lib/api/preparations';

// Types locaux pour éviter les erreurs d'import
interface Vehicle {
  licensePlate: string;
  brand: string;
  model: string;
  color?: string;
  year?: number;
  fuelType?: string;
  condition?: string;
  notes?: string;
  fullName?: string;
}

interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
  isDefault?: boolean;
}

interface PreparationStep {
  type: string;
  label?: string;
  completed: boolean;
  photoUrl?: string;
  completedAt?: Date;
  notes?: string;
  order?: number;
}

interface Issue {
  id?: string;
  type: string;
  description: string;
  photoUrl?: string;
  reportedAt?: Date;
  severity?: 'low' | 'medium' | 'high';
}

interface Preparation {
  id: string;
  vehicle: Vehicle;
  agency: Agency;
  startTime: Date;
  endTime?: Date;
  status: 'in_progress' | 'completed' | 'cancelled';
  steps: PreparationStep[];
  progress: number;
  currentDuration: number;
  totalMinutes?: number;
  isOnTime?: boolean;
  issues: Issue[];
  issuesCount?: number;
  notes?: string;
  summary?: any;
  createdAt: Date;
}

// Import the VehicleFormData type from the API to ensure type compatibility
import type { VehicleFormData } from '@/lib/api/preparations';

interface StepCompletionData {
  stepType: string;
  photo: File;
  notes?: string;
}

interface IssueReportData {
  type: string;
  description: string;
  photo?: File;
  severity?: 'low' | 'medium' | 'high';
}

interface PreparationState {
  // État des données
  currentPreparation: Preparation | null;
  preparationHistory: Preparation[] | null;
  userAgencies: Agency[] | null;
  stats: any | null;
  
  // États de chargement
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
  
  // Actions principales
  getUserAgencies: () => Promise<void>;
  getCurrentPreparation: () => Promise<void>;
  startPreparation: (data: VehicleFormData) => Promise<void>;
  completeStep: (preparationId: string, data: StepCompletionData) => Promise<void>;
  completePreparation: (preparationId: string, notes?: string) => Promise<void>;
  reportIssue: (preparationId: string, data: IssueReportData) => Promise<void>;
  
  // Actions utilitaires
  clearError: () => void;
  reset: () => void;
  setLoading: (loading: boolean) => void;
}

// Fonction helper pour gérer les erreurs API
const handleApiError = (error: any): string => {
  if (error && typeof error === 'object') {
    if (error.response && error.response.data && error.response.data.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  return 'Une erreur inattendue s\'est produite';
};

export const usePreparationStore = create<PreparationState>((set, get) => ({
  // État initial
  currentPreparation: null,
  preparationHistory: null,
  userAgencies: null,
  stats: null,
  isLoading: false,
  error: null,
  lastSync: null,

  // Récupérer les agences de l'utilisateur
  getUserAgencies: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await preparationApi.getUserAgencies();
      set({
        userAgencies: result.agencies,
        isLoading: false,
        lastSync: new Date()
      });
      
      console.log('✅ Agences chargées:', result.agencies.length);
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  // Récupérer la préparation en cours
  getCurrentPreparation: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await preparationApi.getCurrentPreparation();
      set({
        currentPreparation: result.preparation,
        isLoading: false,
        lastSync: new Date()
      });
      
      if (result.preparation) {
        console.log('✅ Préparation en cours trouvée:', result.preparation.vehicle.licensePlate);
      } else {
        console.log('ℹ️ Aucune préparation en cours');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  // Démarrer une nouvelle préparation
  startPreparation: async (data: VehicleFormData) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await preparationApi.startPreparation(data);
      set({
        currentPreparation: result.preparation,
        isLoading: false,
        lastSync: new Date()
      });
      
      console.log('✅ Préparation démarrée:', result.preparation.vehicle.licensePlate);
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  // Compléter une étape
  completeStep: async (preparationId: string, data: StepCompletionData) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await preparationApi.completeStep(preparationId, data);
      set({
        currentPreparation: result.preparation,
        isLoading: false,
        lastSync: new Date()
      });
      
      console.log('✅ Étape complétée:', data.stepType);
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  // Terminer une préparation
  completePreparation: async (preparationId: string, notes?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await preparationApi.completePreparation(preparationId, notes);
      set({
        currentPreparation: null, // Plus de préparation en cours
        isLoading: false,
        lastSync: new Date()
      });
      
      console.log('✅ Préparation terminée:', preparationId);
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  // Signaler un incident
  reportIssue: async (preparationId: string, data: IssueReportData) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await preparationApi.reportIssue(preparationId, data);
      
      // Mettre à jour la préparation actuelle avec le nouvel incident
      const currentPrep = get().currentPreparation;
      if (currentPrep && currentPrep.id === preparationId && result.issue) {
        set({
          currentPreparation: {
            ...currentPrep,
            issues: [...currentPrep.issues, result.issue]
          },
          isLoading: false,
          lastSync: new Date()
        });
      } else {
        set({ isLoading: false });
      }
      
      console.log('✅ Incident signalé:', data.type);
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  // Actions utilitaires
  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      currentPreparation: null,
      preparationHistory: null,
      userAgencies: null,
      stats: null,
      isLoading: false,
      error: null,
      lastSync: null
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  }
}));