import { apiClient } from './client';
import { DashboardData } from '../stores/dashboard';

export const profileApi = {
  // Récupérer les données du dashboard
  getDashboard: async (): Promise<DashboardData> => {
    const response = await apiClient.get('/profile/dashboard');
    return response.data.data;
  },

  // Récupérer les statistiques de performance
  getPerformanceStats: async (): Promise<any> => {
    const response = await apiClient.get('/profile/performance');
    return response.data.data;
  },

  // Récupérer le planning de la semaine
  getWeekSchedule: async (date?: string): Promise<any> => {
    const response = await apiClient.get('/profile/schedule/week', {
      params: { date }
    });
    return response.data.data;
  },

  // Mettre à jour le profil utilisateur
  updateProfile: async (data: any): Promise<any> => {
    const response = await apiClient.put('/profile', data);
    return response.data.data;
  }
};