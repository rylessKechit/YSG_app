import { apiClient } from './client';
import { 
  TimesheetStatus, 
  TimesheetEntry, 
  TimesheetHistoryParams,
  ClockInData,
  ClockOutData,
  BreakData
} from '../types/timesheet';

export const timesheetApi = {
  // CORRIGÉ: Récupérer le statut du jour avec agencyId en query param
  getTodayStatus: async (agencyId: string): Promise<TimesheetStatus> => {
    const response = await apiClient.get('/timesheets/today-status', {
      params: { agencyId }
    });
    return response.data.data;
  },

  // Pointer l'arrivée - backend attend agencyId dans body
  clockIn: async (agencyId: string, data?: ClockInData): Promise<void> => {
    const response = await apiClient.post('/timesheets/clock-in', {
      agencyId,
      timestamp: data?.timestamp || new Date().toISOString(),
      location: data?.location
    });
    return response.data;
  },

  // Pointer le départ - backend attend agencyId dans body
  clockOut: async (agencyId: string, notes?: string, data?: ClockOutData): Promise<void> => {
    const response = await apiClient.post('/timesheets/clock-out', {
      agencyId,
      timestamp: data?.timestamp || new Date().toISOString(),
      notes: notes,
      location: data?.location
    });
    return response.data;
  },

  // Commencer une pause - backend attend agencyId dans body
  startBreak: async (agencyId: string, data?: BreakData): Promise<void> => {
    const response = await apiClient.post('/timesheets/break-start', {
      agencyId,
      timestamp: data?.timestamp || new Date().toISOString()
    });
    return response.data;
  },

  // Terminer une pause - backend attend agencyId dans body
  endBreak: async (agencyId: string, data?: BreakData): Promise<void> => {
    const response = await apiClient.post('/timesheets/break-end', {
      agencyId,
      timestamp: data?.timestamp || new Date().toISOString()
    });
    return response.data;
  },

  // Récupérer l'historique
  getHistory: async (params?: TimesheetHistoryParams): Promise<TimesheetEntry[]> => {
    const response = await apiClient.get('/timesheets/history', {
      params: {
        startDate: params?.startDate,
        endDate: params?.endDate,
        agency: params?.agency,
        status: params?.status,
        page: params?.page || 1,
        limit: params?.limit || 20
      }
    });
    return response.data.data.timesheets;
  },

  // Récupérer les statistiques
  getStats: async (): Promise<any> => {
    const response = await apiClient.get('/timesheets/stats');
    return response.data.data;
  },

  // Modifier/corriger un pointage (si nécessaire)
  updateTimesheet: async (id: string, data: Partial<TimesheetEntry>): Promise<void> => {
    const response = await apiClient.put(`/timesheets/${id}`, data);
    return response.data;
  }
};