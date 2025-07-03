import { useTimesheetStore } from '@/lib/stores/timesheet';
import { TimesheetStatus } from '@/lib/types/timesheet';

export function useTimesheet() {
  const { 
    todayStatus, 
    history, 
    isLoading, 
    error 
  } = useTimesheetStore();

  return { 
    todayStatus, 
    history, 
    isLoading, 
    error 
  };
}

export function useTimesheetActions() {
  const { 
    getTodayStatus,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    getHistory,
    clearError,
    refreshStatus
  } = useTimesheetStore();

  return { 
    getTodayStatus,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    getHistory,
    clearError,
    refreshStatus
  };
}

// Hook pour calculer les actions disponibles
export function useTimesheetAvailableActions() {
  const { todayStatus } = useTimesheetStore();
  const actions = useTimesheetActions();

  const getAvailableActions = () => {
    if (!todayStatus) {
      return {
        canClockIn: false,
        canClockOut: false,
        canStartBreak: false,
        canEndBreak: false
      };
    }

    return {
      canClockIn: todayStatus.currentStatus === 'not_started',
      canClockOut: todayStatus.currentStatus === 'working' || todayStatus.currentStatus === 'on_break',
      canStartBreak: todayStatus.currentStatus === 'working',
      canEndBreak: todayStatus.currentStatus === 'on_break'
    };
  };

  return {
    ...actions,
    ...getAvailableActions()
  };
}

// Hook pour formater les données d'affichage
export function useTimesheetDisplay() {
  const { todayStatus } = useTimesheetStore();

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    return new Date(timeString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status: TimesheetStatus['currentStatus']) => {
    switch (status) {
      case 'not_started':
        return 'Pas encore pointé';
      case 'working':
        return 'En service';
      case 'on_break':
        return 'En pause';
      case 'finished':
        return 'Service terminé';
      default:
        return 'Statut inconnu';
    }
  };

  const getStatusColor = (status: TimesheetStatus['currentStatus']) => {
    switch (status) {
      case 'not_started':
        return { text: 'text-gray-600', bg: 'bg-gray-100' };
      case 'working':
        return { text: 'text-green-600', bg: 'bg-green-100' };
      case 'on_break':
        return { text: 'text-orange-600', bg: 'bg-orange-100' };
      case 'finished':
        return { text: 'text-blue-600', bg: 'bg-blue-100' };
      default:
        return { text: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  return {
    formatDuration,
    formatTime,
    getStatusLabel,
    getStatusColor,
    todayStatus
  };
}