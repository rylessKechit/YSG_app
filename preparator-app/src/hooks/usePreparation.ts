// preparator-app/src/hooks/usePreparation.ts
// ✅ Hook personnalisé pour la gestion des préparations corrigé

import { useState, useCallback } from 'react';
import { usePreparationStore } from '@/lib/stores/preparation';
import type { VehicleFormData, StepCompletionData, IssueReportData } from '@/lib/types';

export function usePreparation() {
  const {
    currentPreparation,
    userAgencies,
    isLoading,
    error,
    startPreparation,
    completeStep,
    completePreparation,
    reportIssue,
    getCurrentPreparation,
    clearError
  } = usePreparationStore();

  const [localLoading, setLocalLoading] = useState<string | null>(null);

  // ===== ACTIONS AVEC GESTION D'ÉTAT LOCAL =====

  // ✅ Démarrer une préparation
  const handleStartPreparation = useCallback(async (data: VehicleFormData): Promise<boolean> => {
    setLocalLoading('start');
    try {
      await startPreparation(data);
      return true;
    } catch (error) {
      console.error('Erreur démarrage préparation:', error);
      return false;
    } finally {
      setLocalLoading(null);
    }
  }, [startPreparation]);

  // ✅ Compléter une étape
  const handleCompleteStep = useCallback(async (
    preparationId: string, 
    data: StepCompletionData
  ): Promise<boolean> => {
    setLocalLoading(`step-${data.step}`);
    try {
      await completeStep(preparationId, data);
      return true;
    } catch (error) {
      console.error('Erreur complétion étape:', error);
      return false;
    } finally {
      setLocalLoading(null);
    }
  }, [completeStep]);

  // ✅ Terminer une préparation
  const handleCompletePreparation = useCallback(async (
    preparationId: string, 
    notes?: string
  ): Promise<boolean> => {
    setLocalLoading('complete');
    try {
      await completePreparation(preparationId, notes);
      return true;
    } catch (error) {
      console.error('Erreur finalisation préparation:', error);
      return false;
    } finally {
      setLocalLoading(null);
    }
  }, [completePreparation]);

  // ✅ Signaler un incident
  const handleReportIssue = useCallback(async (
    preparationId: string,
    data: IssueReportData
  ): Promise<boolean> => {
    setLocalLoading('issue');
    try {
      await reportIssue(preparationId, data);
      return true;
    } catch (error) {
      console.error('Erreur signalement incident:', error);
      return false;
    } finally {
      setLocalLoading(null);
    }
  }, [reportIssue]);

  // ===== FONCTIONS UTILITAIRES =====

  // ✅ Vérifier si une action est en cours
  const isActionLoading = useCallback((action: string): boolean => {
    return localLoading === action || isLoading;
  }, [localLoading, isLoading]);

  // ✅ Obtenir l'agence par défaut
  const getDefaultAgency = useCallback(() => {
    return userAgencies.find(agency => agency.isDefault) || userAgencies[0] || null;
  }, [userAgencies]);

  // ✅ Vérifier si toutes les étapes sont complétées
  const canCompletePreparation = useCallback((): boolean => {
    if (!currentPreparation?.steps) return false;
    return currentPreparation.steps.every(step => step.completed);
  }, [currentPreparation]);

  // ✅ Obtenir la prochaine étape à compléter
  const getNextStep = useCallback(() => {
    if (!currentPreparation?.steps) return null;
    return currentPreparation.steps.find(step => !step.completed) || null;
  }, [currentPreparation]);

  // ✅ Obtenir les statistiques de progression
  const getProgressStats = useCallback(() => {
    if (!currentPreparation?.steps) {
      return {
        completedSteps: 0,
        totalSteps: 0,
        progress: 0,
        nextStep: null,
        canComplete: false
      };
    }

    const completedSteps = currentPreparation.steps.filter(step => step.completed).length;
    const totalSteps = currentPreparation.steps.length;
    const nextStep = getNextStep();
    
    return {
      completedSteps,
      totalSteps,
      progress: Math.round((completedSteps / totalSteps) * 100),
      nextStep: nextStep?.step || null,
      canComplete: completedSteps === totalSteps
    };
  }, [currentPreparation, getNextStep]);

  // ✅ Vérifier si une étape spécifique est complétée
  const isStepCompleted = useCallback((stepType: string): boolean => {
    if (!currentPreparation?.steps) return false;
    const step = currentPreparation.steps.find(s => s.step === stepType);
    return step?.completed || false;
  }, [currentPreparation]);

  // ✅ Vérifier si une étape peut être démarrée
  const canStartStep = useCallback((stepType: string): boolean => {
    if (!currentPreparation?.steps) return false;
    
    // Trouver l'index de l'étape dans l'ordre
    const stepIndex = currentPreparation.steps.findIndex(s => s.step === stepType);
    if (stepIndex === -1) return false;
    
    // L'étape ne doit pas être déjà complétée
    if (currentPreparation.steps[stepIndex].completed) return false;
    
    // Toutes les étapes précédentes doivent être complétées
    for (let i = 0; i < stepIndex; i++) {
      if (!currentPreparation.steps[i].completed) return false;
    }
    
    return true;
  }, [currentPreparation]);

  // ===== RETOUR DU HOOK =====
  return {
    // État global
    currentPreparation,
    userAgencies,
    isLoading: isLoading || localLoading !== null,
    error,
    localLoading,

    // Actions principales
    startPreparation: handleStartPreparation,
    completeStep: handleCompleteStep,
    completePreparation: handleCompletePreparation,
    reportIssue: handleReportIssue,
    getCurrentPreparation,
    clearError,

    // Utilitaires de vérification
    isActionLoading,
    getDefaultAgency,
    canCompletePreparation,
    getNextStep,
    getProgressStats,
    isStepCompleted,
    canStartStep,

    // État détaillé des actions
    isStarting: localLoading === 'start',
    isCompleting: localLoading === 'complete',
    isReportingIssue: localLoading === 'issue',
    isStepLoading: (stepType: string) => localLoading === `step-${stepType}`,

    // Statistiques calculées
    stats: getProgressStats()
  };
}