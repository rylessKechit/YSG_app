import { apiClient } from './client';

// ✅ IMPORT DU TYPE UPDATÉ
interface TimesheetStatus {
  timesheet: {
    id?: string;
    agency: {
      id: string;
      name: string;
      code: string;
    } | null;
    date: string;
    startTime: string | null;
    endTime: string | null;
    breakStart: string | null;
    breakEnd: string | null;
    totalWorkedMinutes: number;
    status: string;
    delays?: {
      startDelay: number;
    };
  } | null;
  
  isNotStarted: boolean;
  isClockedIn: boolean;
  isClockedOut: boolean;
  isOnBreak: boolean;
  currentWorkedMinutes: number;
  currentWorkedTime: string | null;
  // ✅ AJOUT DU CURRENTSTATUS
  currentStatus: 'not_started' | 'working' | 'on_break' | 'finished';
}

interface TimesheetEntry {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  totalWorkedMinutes: number;
  status: 'incomplete' | 'complete' | 'pending';
  agency?: {
    id: string;
    name: string;
    code: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TimesheetHistoryParams {
  startDate?: string;
  endDate?: string;
  agency?: string;
  status?: 'incomplete' | 'complete' | 'pending';
  page?: number;
  limit?: number;
}

interface ClockInData {
  timestamp?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

interface ClockOutData {
  timestamp?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  notes?: string;
}

interface BreakData {
  timestamp?: string;
  reason?: string;
}

// ✅ FONCTION UTILITAIRE POUR CALCULER LE STATUT
const calculateCurrentStatus = (data: any): 'not_started' | 'working' | 'on_break' | 'finished' => {
  if (!data.timesheet) return 'not_started';
  
  const { timesheet } = data;
  
  // Si pas encore pointé
  if (!timesheet.startTime) return 'not_started';
  
  // Si parti (clocké out)
  if (timesheet.endTime) return 'finished';
  
  // Si en pause (break start mais pas break end)
  if (timesheet.breakStart && !timesheet.breakEnd) return 'on_break';
  
  // Si arrivé mais pas parti
  if (timesheet.startTime && !timesheet.endTime) return 'working';
  
  return 'not_started';
};

export const timesheetApi = {
  // ✅ CORRECTION MAJEURE - Récupérer le statut du jour
  getTodayStatus: async (agencyId: string): Promise<TimesheetStatus> => {
    if (!agencyId) {
      throw new Error('ID d\'agence requis pour récupérer le statut');
    }

    try {
      console.log('🔄 API Call: getTodayStatus avec agencyId:', agencyId);
      
      const response = await apiClient.get('/timesheets/today-status', {
        params: { agencyId }
      });

      console.log('📄 Réponse API brute:', response.data);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Réponse API invalide');
      }

      const data = response.data.data;
      
      // ✅ CALCUL AUTOMATIQUE DU STATUT ACTUEL
      const currentStatus = calculateCurrentStatus(data);
      
      // 🔧 CORRECTION CRITIQUE - Logique basée sur la vraie structure backend
      const adaptedData: TimesheetStatus = {
        timesheet: data.timesheet,
        // ✅ CORRECTION - Si pas de timesheet, c'est "not started"
        isNotStarted: currentStatus === 'not_started',
        isClockedIn: currentStatus === 'working' || currentStatus === 'on_break',
        isClockedOut: currentStatus === 'finished',
        isOnBreak: currentStatus === 'on_break',
        currentWorkedMinutes: data.currentStatus?.currentWorkedMinutes || 0,
        currentWorkedTime: data.currentStatus?.currentWorkedTime || null,
        // ✅ NOUVEAU - Statut calculé automatiquement
        currentStatus
      };

      console.log('✅ Données adaptées avec currentStatus:', adaptedData);
      return adaptedData;

    } catch (error: any) {
      console.error('❌ Erreur getTodayStatus:', error);
      
      if (error.response?.status === 403) {
        throw new Error('Accès refusé à cette agence');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Paramètres invalides');
      } else if (error.response?.status >= 500) {
        throw new Error('Erreur serveur. Veuillez réessayer.');
      }
      
      throw error;
    }
  },

  // Pointer l'arrivée
  clockIn: async (agencyId: string, data?: ClockInData): Promise<TimesheetStatus> => {
    try {
      const response = await apiClient.post('/timesheets/clock-in', {
        agencyId,
        ...data
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors du pointage d\'arrivée');
      }

      // Recalculer le statut après l'action
      return await timesheetApi.getTodayStatus(agencyId);
    } catch (error: any) {
      console.error('❌ Erreur clockIn:', error);
      throw error;
    }
  },

  // Pointer le départ
  clockOut: async (agencyId: string, data?: ClockOutData): Promise<TimesheetStatus> => {
    try {
      const response = await apiClient.post('/timesheets/clock-out', {
        agencyId,
        ...data
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors du pointage de départ');
      }

      // Recalculer le statut après l'action
      return await timesheetApi.getTodayStatus(agencyId);
    } catch (error: any) {
      console.error('❌ Erreur clockOut:', error);
      throw error;
    }
  },

  // Commencer une pause
  startBreak: async (agencyId: string, data?: BreakData): Promise<TimesheetStatus> => {
    try {
      const response = await apiClient.post('/timesheets/break-start', {
        agencyId,
        ...data
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors du début de pause');
      }

      // Recalculer le statut après l'action
      return await timesheetApi.getTodayStatus(agencyId);
    } catch (error: any) {
      console.error('❌ Erreur startBreak:', error);
      throw error;
    }
  },

  // Terminer une pause
  endBreak: async (agencyId: string, data?: BreakData): Promise<TimesheetStatus> => {
    try {
      const response = await apiClient.post('/timesheets/break-end', {
        agencyId,
        ...data
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors de la fin de pause');
      }

      // Recalculer le statut après l'action
      return await timesheetApi.getTodayStatus(agencyId);
    } catch (error: any) {
      console.error('❌ Erreur endBreak:', error);
      throw error;
    }
  },

  // Récupérer l'historique des pointages
  getHistory: async (params?: TimesheetHistoryParams) => {
    try {
      const response = await apiClient.get('/timesheets/history', {
        params
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors de la récupération de l\'historique');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('❌ Erreur getHistory:', error);
      throw error;
    }
  }
};