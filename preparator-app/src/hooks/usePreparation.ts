import { useState, useCallback } from 'react';
import { usePreparationStore } from '@/lib/stores';
import { VehicleFormData, StepCompletionData, IssueReportData } from '@/lib/types';

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

  // Démarrer une préparation
  const handleStartPreparation = useCallback(async (data: VehicleFormData) => {
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

  // Compléter une étape
  const handleCompleteStep = useCallback(async (
    preparationId: string, 
    data: StepCompletionData
  ) => {
    setLocalLoading(`step-${data.stepType}`);
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

  // Terminer une préparation
  const handleCompletePreparation = useCallback(async (
    preparationId: string, 
    notes?: string
  ) => {
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

  // Signaler un incident
  const handleReportIssue = useCallback(async (
    preparationId: string,
    data: IssueReportData
  ) => {
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

  // Vérifier si une action est en cours
  const isActionLoading = useCallback((action: string) => {
    return localLoading === action || isLoading;
  }, [localLoading, isLoading]);

  // Obtenir l'agence par défaut
  const getDefaultAgency = useCallback(() => {
    return userAgencies.find(agency => agency.isDefault) || userAgencies[0] || null;
  }, [userAgencies]);

  return {
    // État
    currentPreparation,
    userAgencies,
    isLoading: isLoading || localLoading !== null,
    error,
    localLoading,

    // Actions
    startPreparation: handleStartPreparation,
    completeStep: handleCompleteStep,
    completePreparation: handleCompletePreparation,
    reportIssue: handleReportIssue,
    getCurrentPreparation,
    clearError,

    // Utilitaires
    isActionLoading,
    getDefaultAgency,

    // État détaillé des actions
    isStarting: localLoading === 'start',
    isCompleting: localLoading === 'complete',
    isReportingIssue: localLoading === 'issue',
    isStepLoading: (stepType: string) => localLoading === `step-${stepType}`
  };
}