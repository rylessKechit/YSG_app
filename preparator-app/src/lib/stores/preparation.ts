// preparator-app/src/lib/stores/preparation.ts
// ✅ MODIFICATION: Store avec support du workflow flexible

import { create } from 'zustand';
import { preparationApi } from '../api/preparations';

interface PreparationStep {
  step: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  photos?: Array<{
    url: string;
    description: string;
    uploadedAt: string;
  }>;
}

interface Preparation {
  id: string;
  vehicle: {
    id: string;
    licensePlate: string;
    brand: string;
    model: string;
  };
  agency: {
    id: string;
    name: string;
    code: string;
  };
  status: 'in_progress' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  steps: PreparationStep[];
  progress: number;
  currentDuration: number;
  isOnTime?: boolean;
  notes?: string;
  totalTime?: number;
}

interface PreparationStore {
  // État
  currentPreparation: Preparation | null;
  preparations: Preparation[];
  isLoading: boolean;
  error: string | null;

  // Actions
  getCurrentPreparation: () => Promise<void>;
  startPreparation: (vehicleData: any) => Promise<Preparation>;
  completeStep: (preparationId: string, stepType: string, photo: File, notes?: string) => Promise<void>;
  completePreparation: (preparationId: string, notes?: string, skipRemainingSteps?: boolean) => Promise<void>;
  reportIssue: (preparationId: string, issueData: any) => Promise<void>;
  getMyPreparations: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const usePreparationStore = create<PreparationStore>((set, get) => ({
  // État initial
  currentPreparation: null,
  preparations: [],
  isLoading: false,
  error: null,

  // Récupérer la préparation en cours
  getCurrentPreparation: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await preparationApi.getCurrent();
      
      if (response.success && response.data.preparation) {
        set({ 
          currentPreparation: response.data.preparation,
          isLoading: false 
        });
      } else {
        set({ 
          currentPreparation: null,
          isLoading: false 
        });
      }
    } catch (error: any) {
      console.error('❌ Erreur récupération préparation courante:', error);
      set({ 
        error: error.message || 'Erreur lors de la récupération de la préparation',
        isLoading: false 
      });
    }
  },

  // Démarrer une nouvelle préparation
  startPreparation: async (vehicleData) => {
    try {
      set({ isLoading: true, error: null });

      const response = await preparationApi.start(vehicleData);
      
      if (response.success) {
        const preparation = response.data.preparation;
        
        set({ 
          currentPreparation: preparation,
          isLoading: false 
        });

        return preparation;
      } else {
        throw new Error(response.message || 'Erreur lors du démarrage');
      }
    } catch (error: any) {
      console.error('❌ Erreur démarrage préparation:', error);
      set({ 
        error: error.message || 'Erreur lors du démarrage de la préparation',
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ MODIFICATION: Compléter une étape avec photo (flexible)
  completeStep: async (preparationId, stepType, photo, notes = '') => {
    try {
      set({ isLoading: true, error: null });

      console.log('📸 Envoi photo pour étape:', stepType);

      const response = await preparationApi.completeStep(preparationId, {
        step: stepType,
        photo,
        notes,
        stepType // Pour le middleware backend
      });

      if (response.success) {
        // Mettre à jour la préparation courante
        const updatedPreparation = response.data.preparation;
        set({ 
          currentPreparation: updatedPreparation,
          isLoading: false 
        });

        console.log('✅ Étape complétée avec succès:', stepType);
      } else {
        throw new Error(response.message || 'Erreur lors de la completion');
      }
    } catch (error: any) {
      console.error('❌ Erreur completion étape:', error);
      set({ 
        error: error.message || 'Erreur lors de la completion de l\'étape',
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ MODIFICATION: Finaliser préparation (même partiellement)
  completePreparation: async (preparationId, notes = '', skipRemainingSteps = true) => {
    try {
      set({ isLoading: true, error: null });

      const response = await preparationApi.complete(preparationId, {
        notes,
        skipRemainingSteps
      });

      if (response.success) {
        console.log('✅ Préparation terminée:', response.data);
        
        // Réinitialiser la préparation courante
        set({ 
          currentPreparation: null,
          isLoading: false 
        });
      } else {
        throw new Error(response.message || 'Erreur lors de la finalisation');
      }
    } catch (error: any) {
      console.error('❌ Erreur finalisation préparation:', error);
      set({ 
        error: error.message || 'Erreur lors de la finalisation de la préparation',
        isLoading: false 
      });
      throw error;
    }
  },

  // Signaler un incident
  reportIssue: async (preparationId, issueData) => {
    try {
      set({ isLoading: true, error: null });

      const response = await preparationApi.reportIssue(preparationId, issueData);

      if (response.success) {
        // Recharger la préparation pour avoir les incidents mis à jour
        await get().getCurrentPreparation();
      } else {
        throw new Error(response.message || 'Erreur lors du signalement');
      }
    } catch (error: any) {
      console.error('❌ Erreur signalement incident:', error);
      set({ 
        error: error.message || 'Erreur lors du signalement de l\'incident',
        isLoading: false 
      });
      throw error;
    }
  },

  // Récupérer mes préparations
  getMyPreparations: async () => {
    try {
      set({ isLoading: true, error: null });

      const response = await preparationApi.getMyPreparations();
      
      if (response.success) {
        set({ 
          preparations: response.data.preparations || [],
          isLoading: false 
        });
      } else {
        throw new Error(response.message || 'Erreur lors de la récupération');
      }
    } catch (error: any) {
      console.error('❌ Erreur récupération préparations:', error);
      set({ 
        error: error.message || 'Erreur lors de la récupération des préparations',
        isLoading: false 
      });
    }
  },

  // Effacer l'erreur
  clearError: () => {
    set({ error: null });
  },

  // Réinitialiser le store
  reset: () => {
    set({
      currentPreparation: null,
      preparations: [],
      isLoading: false,
      error: null
    });
  }
}));

// Hook pour les statistiques de la préparation courante
export const usePreparationStats = () => {
  const { currentPreparation } = usePreparationStore();

  if (!currentPreparation) {
    return {
      totalSteps: 0,
      completedSteps: 0,
      remainingSteps: 0,
      progress: 0,
      hasAtLeastOneStep: false,
      canComplete: false
    };
  }

  const completedSteps = currentPreparation.steps.filter(s => s.completed).length;
  const totalSteps = currentPreparation.steps.length;
  const remainingSteps = totalSteps - completedSteps;
  const hasAtLeastOneStep = completedSteps > 0;

  return {
    totalSteps,
    completedSteps,
    remainingSteps,
    progress: currentPreparation.progress,
    hasAtLeastOneStep,
    canComplete: hasAtLeastOneStep, // ✅ Peut terminer avec au moins 1 étape
    completedStepsList: currentPreparation.steps
      .filter(s => s.completed)
      .map(s => s.step),
    remainingStepsList: currentPreparation.steps
      .filter(s => !s.completed)
      .map(s => s.step)
  };
};