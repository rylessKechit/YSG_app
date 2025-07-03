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
  // Récupérer le statut du jour
  getTodayStatus: async (): Promise<TimesheetStatus> => {
    const response = await apiClient.get('/timesheets/today-status');
    return response.data.data;
  },

  // Pointer l'arrivée
  clockIn: async (data?: ClockInData): Promise<void> => {
    const response = await apiClient.post('/timesheets/clock-in', {
      timestamp: data?.timestamp || new Date().toISOString(),
      location: data?.location
    });
    return response.data;
  },

  // Pointer le départ
  clockOut: async (notes?: string, data?: ClockOutData): Promise<void> => {
    const response = await apiClient.post('/timesheets/clock-out', {
      timestamp: data?.timestamp || new Date().toISOString(),
      notes: notes,
      location: data?.location
    });
    return response.data;
  },

  // Commencer une pause
  startBreak: async (data?: BreakData): Promise<void> => {
    const response = await apiClient.post('/timesheets/break-start', {
      timestamp: data?.timestamp || new Date().toISOString()
    });
    return response.data;
  },

  // Terminer une pause
  endBreak: async (data?: BreakData): Promise<void> => {
    const response = await apiClient.post('/timesheets/break-end', {
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