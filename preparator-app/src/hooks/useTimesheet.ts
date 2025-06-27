import { useState, useCallback } from 'react';
import { useTimesheetStore } from '@/lib/stores';

export function useTimesheet() {
  const {
    todayStatus,
    history,
    isLoading,
    error,
    getTodayStatus,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    getHistory,
    clearError
  } = useTimesheetStore();

  const [localLoading, setLocalLoading] = useState<string | null>(null);

  // Pointer l'arrivée
  const handleClockIn = useCallback(async (agencyId: string) => {
    setLocalLoading('clock-in');
    try {
      await clockIn(agencyId);
      return true;
    } catch (error) {
      console.error('Erreur pointage arrivée:', error);
      return false;
    } finally {
      setLocalLoading(null);
    }
  }, [clockIn]);

  // Pointer le départ
  const handleClockOut = useCallback(async (agencyId: string, notes?: string) => {
    setLocalLoading('clock-out');
    try {
      await clockOut(agencyId, notes);
      return true;
    } catch (error) {
      console.error('Erreur pointage départ:', error);
      return false;
    } finally {
      setLocalLoading(null);
    }
  }, [clockOut]);

  // Commencer la pause
  const handleStartBreak = useCallback(async (agencyId: string) => {
    setLocalLoading('break-start');
    try {
      await startBreak(agencyId);
      return true;
    } catch (error) {
      console.error('Erreur début pause:', error);
      return false;
    } finally {
      setLocalLoading(null);
    }
  }, [startBreak]);

  // Terminer la pause
  const handleEndBreak = useCallback(async (agencyId: string) => {
    setLocalLoading('break-end');
    try {
      await endBreak(agencyId);
      return true;
    } catch (error) {
      console.error('Erreur fin pause:', error);
      return false;
    } finally {
      setLocalLoading(null);
    }
  }, [endBreak]);

  // Vérifier si une action est en cours
  const isActionLoading = useCallback((action: string) => {
    return localLoading === action || isLoading;
  }, [localLoading, isLoading]);

  // Obtenir le statut actuel pour une agence
  const getCurrentStatus = useCallback((agencyId: string) => {
    if (!todayStatus || !agencyId) return null;
    return todayStatus.currentStatus;
  }, [todayStatus]);

  return {
    // État
    todayStatus,
    history,
    isLoading: isLoading || localLoading !== null,
    error,
    localLoading,

    // Actions
    clockIn: handleClockIn,
    clockOut: handleClockOut,
    startBreak: handleStartBreak,
    endBreak: handleEndBreak,
    getTodayStatus,
    getHistory,
    clearError,

    // Utilitaires
    isActionLoading,
    getCurrentStatus,

    // État détaillé des actions
    isClockingIn: localLoading === 'clock-in',
    isClockingOut: localLoading === 'clock-out',
    isStartingBreak: localLoading === 'break-start',
    isEndingBreak: localLoading === 'break-end'
  };
}