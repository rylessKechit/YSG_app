import { apiClient } from './client';

// Types pour les données de retour API
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

export const timesheetApi = {
  // 🔧 CORRECTION MAJEURE - Récupérer le statut du jour
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
      
      // 🔧 CORRECTION CRITIQUE - Logique basée sur la vraie structure backend
      const adaptedData: TimesheetStatus = {
        timesheet: data.timesheet,
        // ✅ CORRECTION - Si pas de timesheet, c'est "not started"
        isNotStarted: !data.timesheet || (!data.timesheet.startTime && !data.timesheet.endTime),
        isClockedIn: data.currentStatus?.isClockedIn || false,
        isClockedOut: data.currentStatus?.isClockedOut || false,
        isOnBreak: data.currentStatus?.isOnBreak || false,
        currentWorkedMinutes: data.currentStatus?.currentWorkedMinutes || 0,
        currentWorkedTime: data.currentStatus?.currentWorkedTime || null
      };

      console.log('✅ Données adaptées avec correction:', adaptedData);
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
  clockIn: async (agencyId: string, data?: ClockInData): Promise<void> => {
    if (!agencyId) {
      throw new Error('ID d\'agence requis pour pointer l\'arrivée');
    }

    try {
      console.log('⏰ API Call: clockIn avec agencyId:', agencyId);
      
      const payload = {
        agencyId,
        timestamp: data?.timestamp || new Date().toISOString(),
        location: data?.location || null
      };

      console.log('📤 Payload clockIn:', payload);

      const response = await apiClient.post('/timesheets/clock-in', payload);
      
      console.log('✅ Réponse clockIn:', response.data);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors du pointage d\'arrivée');
      }

      return response.data;

    } catch (error: any) {
      console.error('❌ Erreur clockIn:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Erreur lors du pointage d\'arrivée');
    }
  },

  // Pointer le départ
  clockOut: async (agencyId: string, notes?: string, data?: ClockOutData): Promise<void> => {
    if (!agencyId) {
      throw new Error('ID d\'agence requis pour pointer le départ');
    }

    try {
      console.log('⏰ API Call: clockOut avec agencyId:', agencyId, 'notes:', notes);
      
      const payload = {
        agencyId,
        timestamp: data?.timestamp || new Date().toISOString(),
        notes: notes || null,
        location: data?.location || null
      };

      console.log('📤 Payload clockOut:', payload);

      const response = await apiClient.post('/timesheets/clock-out', payload);
      
      console.log('✅ Réponse clockOut:', response.data);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors du pointage de départ');
      }

      return response.data;

    } catch (error: any) {
      console.error('❌ Erreur clockOut:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Erreur lors du pointage de départ');
    }
  },

  // Commencer une pause
  startBreak: async (agencyId: string, data?: BreakData): Promise<void> => {
    if (!agencyId) {
      throw new Error('ID d\'agence requis pour commencer la pause');
    }

    try {
      console.log('☕ API Call: startBreak avec agencyId:', agencyId);
      
      const payload = {
        agencyId,
        timestamp: data?.timestamp || new Date().toISOString()
      };

      console.log('📤 Payload startBreak:', payload);

      const response = await apiClient.post('/timesheets/break-start', payload);
      
      console.log('✅ Réponse startBreak:', response.data);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors du début de pause');
      }

      return response.data;

    } catch (error: any) {
      console.error('❌ Erreur startBreak:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Erreur lors du début de pause');
    }
  },

  // Terminer une pause
  endBreak: async (agencyId: string, data?: BreakData): Promise<void> => {
    if (!agencyId) {
      throw new Error('ID d\'agence requis pour terminer la pause');
    }

    try {
      console.log('🔄 API Call: endBreak avec agencyId:', agencyId);
      
      const payload = {
        agencyId,
        timestamp: data?.timestamp || new Date().toISOString()
      };

      console.log('📤 Payload endBreak:', payload);

      const response = await apiClient.post('/timesheets/break-end', payload);
      
      console.log('✅ Réponse endBreak:', response.data);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors de la fin de pause');
      }

      return response.data;

    } catch (error: any) {
      console.error('❌ Erreur endBreak:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Erreur lors de la fin de pause');
    }
  },

  // Récupérer l'historique
  getHistory: async (params?: TimesheetHistoryParams): Promise<TimesheetEntry[]> => {
    try {
      console.log('📋 API Call: getHistory avec params:', params);
      
      const queryParams: Record<string, any> = {
        startDate: params?.startDate || null,
        endDate: params?.endDate || null,
        agency: params?.agency || null,
        status: params?.status || null,
        page: params?.page || 1,
        limit: params?.limit || 20
      };

      // Nettoyer les paramètres null
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === null || queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });

      console.log('📤 Query params history:', queryParams);

      const response = await apiClient.get('/timesheets/history', {
        params: queryParams
      });

      console.log('✅ Réponse history:', response.data);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors de la récupération de l\'historique');
      }

      return response.data.data?.timesheets || [];

    } catch (error: any) {
      console.error('❌ Erreur getHistory:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Erreur lors de la récupération de l\'historique');
    }
  },

  // Récupérer les statistiques
  getStats: async (): Promise<any> => {
    try {
      console.log('📊 API Call: getStats');
      
      const response = await apiClient.get('/timesheets/stats');
      
      console.log('✅ Réponse stats:', response.data);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors de la récupération des statistiques');
      }

      return response.data.data;

    } catch (error: any) {
      console.error('❌ Erreur getStats:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Erreur lors de la récupération des statistiques');
    }
  },

  // Modifier/corriger un pointage
  updateTimesheet: async (id: string, data: Partial<TimesheetEntry>): Promise<void> => {
    if (!id) {
      throw new Error('ID de pointage requis');
    }

    try {
      console.log('📝 API Call: updateTimesheet avec ID:', id, 'data:', data);
      
      const response = await apiClient.put(`/timesheets/${id}`, data);
      
      console.log('✅ Réponse updateTimesheet:', response.data);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors de la modification du pointage');
      }

      return response.data;

    } catch (error: any) {
      console.error('❌ Erreur updateTimesheet:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Erreur lors de la modification du pointage');
    }
  }
};