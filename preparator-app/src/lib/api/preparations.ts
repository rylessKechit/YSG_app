// preparator-app/src/lib/api/preparations.ts
import { apiClient } from './client';
import type {
  VehicleFormData,
  Vehicle,
  Agency,
  PreparationStep,
  Preparation,
  StepCompletionData,
  IssueReportData,
  PreparationHistory,
  PreparationStats,
  ApiResponse
} from '../types';

// ===== INTERFACES API =====

export interface PreparationApiResponse {
  id: string;
  vehicle: Vehicle;
  agency: Agency;
  startTime: Date;
  endTime?: Date;
  status: 'in_progress' | 'completed' | 'cancelled';
  steps: PreparationStep[];
  progress: number;
  currentDuration: number;
  totalTime?: number;
  isOnTime?: boolean;
  issues: any[];
  issuesCount: number;
  notes?: string;
  summary?: any;
  createdAt: Date;
}

// ===== CLASSE API PRÉPARATIONS =====

class PreparationAPI {
  
  /**
   * Obtenir les agences de l'utilisateur connecté
   */
  async getUserAgencies(): Promise<{ agencies: Agency[] }> {
    const response = await apiClient.get<ApiResponse<{ agencies: Agency[] }>>('/preparations/user-agencies');
    return response.data.data!;
  }

  /**
   * Obtenir la préparation en cours
   */
  async getCurrentPreparation(): Promise<{ preparation: Preparation | null }> {
    const response = await apiClient.get<ApiResponse<{ preparation: Preparation }>>('/preparations/current');
    return response.data.data!;
  }

  /**
   * Démarrer une nouvelle préparation
   */
  async startPreparation(data: VehicleFormData): Promise<{ preparation: Preparation }> {
    const response = await apiClient.post<ApiResponse<{ preparation: Preparation }>>('/preparations/start', data);
    return response.data.data!;
  }

  /**
   * Obtenir une préparation par ID
   */
  async getPreparation(id: string): Promise<{ preparation: Preparation }> {
    const response = await apiClient.get<ApiResponse<{ preparation: Preparation }>>(`/preparations/${id}`);
    return response.data.data!;
  }

  /**
   * Compléter une étape avec photo
   */
  async completeStep(preparationId: string, data: StepCompletionData): Promise<{ preparation: Preparation }> {
    const formData = new FormData();
    
    // ✅ CORRECTION: Utiliser 'step' au lieu de 'stepType'
    formData.append('step', data.step);
    formData.append('photo', data.photo);
    
    if (data.notes) {
      formData.append('notes', data.notes);
    }

    const response = await apiClient.put<ApiResponse<{ preparation: Preparation }>>(
      `/preparations/${preparationId}/step`, 
      formData, 
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data.data!;
  }

  /**
   * Terminer une préparation
   */
  async completePreparation(preparationId: string, notes?: string): Promise<{ preparation: Preparation }> {
    const response = await apiClient.post<ApiResponse<{ preparation: Preparation }>>(
      `/preparations/${preparationId}/complete`,
      { notes: notes || '' }
    );
    
    return response.data.data!;
  }

  /**
   * Signaler un incident
   */
  async reportIssue(preparationId: string, data: IssueReportData): Promise<{ preparation: Preparation }> {
    const formData = new FormData();
    formData.append('type', data.type);
    formData.append('description', data.description);
    formData.append('severity', data.severity || 'medium');
    
    if (data.photo) {
      formData.append('photo', data.photo);
    }

    const response = await apiClient.post<ApiResponse<{ preparation: Preparation }>>(
      `/preparations/${preparationId}/issue`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data.data!;
  }

  /**
   * Obtenir l'historique des préparations
   */
  async getPreparationHistory(
    page: number = 1,
    limit: number = 20,
    filters?: {
      startDate?: string;
      endDate?: string;
      agencyId?: string;
      search?: string;
    }
  ): Promise<PreparationHistory> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });

    const response = await apiClient.get<ApiResponse<PreparationHistory>>(
      `/preparations/history?${params}`
    );
    
    return response.data.data!;
  }

  /**
   * Obtenir les statistiques de l'utilisateur
   */
  async getMyStats(period?: string): Promise<PreparationStats> {
    const params = period ? `?period=${period}` : '';
    const response = await apiClient.get<ApiResponse<PreparationStats>>(`/preparations/my-stats${params}`);
    return response.data.data!;
  }

  /**
   * Obtenir l'historique d'un véhicule par plaque
   */
  async getVehicleHistory(licensePlate: string): Promise<{ preparations: Preparation[] }> {
    const response = await apiClient.get<ApiResponse<{ preparations: Preparation[] }>>(
      `/preparations/vehicle-history/${licensePlate}`
    );
    return response.data.data!;
  }

  /**
   * Rechercher des préparations
   */
  async searchPreparations(
    query: string,
    filters?: {
      agencyId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{ preparations: Preparation[] }> {
    const params = new URLSearchParams({
      q: query,
      ...filters
    });

    const response = await apiClient.get<ApiResponse<{ preparations: Preparation[] }>>(
      `/preparations/search?${params}`
    );
    
    return response.data.data!;
  }

  /**
   * Obtenir le résumé quotidien
   */
  async getDailySummary(date?: string): Promise<{
    totalPreparations: number;
    completedPreparations: number;
    averageTime: number;
    onTimeRate: number;
    issues: number;
  }> {
    const params = date ? `?date=${date}` : '';
    const response = await apiClient.get<ApiResponse<{
      totalPreparations: number;
      completedPreparations: number;
      averageTime: number;
      onTimeRate: number;
      issues: number;
    }>>(`/preparations/daily-summary${params}`);
    
    return response.data.data!;
  }

  /**
   * Obtenir les préparations en cours (pour les admins)
   */
  async getActivePreparations(): Promise<{ preparations: Preparation[] }> {
    const response = await apiClient.get<ApiResponse<{ preparations: Preparation[] }>>(
      '/preparations/active'
    );
    return response.data.data!;
  }

  /**
   * Mettre à jour les notes d'une préparation
   */
  async updateNotes(preparationId: string, notes: string): Promise<{ preparation: Preparation }> {
    const response = await apiClient.patch<ApiResponse<{ preparation: Preparation }>>(
      `/preparations/${preparationId}/notes`,
      { notes }
    );
    return response.data.data!;
  }

  /**
   * Obtenir les détails d'une étape
   */
  async getStepDetails(preparationId: string, stepType: string): Promise<{
    step: PreparationStep;
    photos: string[];
  }> {
    const response = await apiClient.get<ApiResponse<{
      step: PreparationStep;
      photos: string[];
    }>>(`/preparations/${preparationId}/steps/${stepType}`);
    
    return response.data.data!;
  }

  /**
   * Annuler une préparation
   */
  async cancelPreparation(preparationId: string, reason: string): Promise<{ preparation: Preparation }> {
    const response = await apiClient.post<ApiResponse<{ preparation: Preparation }>>(
      `/preparations/${preparationId}/cancel`,
      { reason }
    );
    return response.data.data!;
  }

  /**
   * Reprendre une préparation suspendue
   */
  async resumePreparation(preparationId: string): Promise<{ preparation: Preparation }> {
    const response = await apiClient.post<ApiResponse<{ preparation: Preparation }>>(
      `/preparations/${preparationId}/resume`
    );
    return response.data.data!;
  }

  /**
   * Exporter les données de préparation
   */
  async exportPreparations(
    format: 'csv' | 'xlsx' | 'pdf',
    filters?: {
      startDate?: string;
      endDate?: string;
      agencyId?: string;
      status?: string;
    }
  ): Promise<Blob> {
    const params = new URLSearchParams({
      format,
      ...filters
    });

    const response = await apiClient.get(`/preparations/export?${params}`, {
      responseType: 'blob'
    });
    
    return response.data;
  }
}

// ===== INSTANCE SINGLETON =====

export const preparationAPI = new PreparationAPI();

// ===== HOOKS UTILITAIRES =====

/**
 * Hook pour les opérations API de préparation
 */
export const usePreparationAPI = () => {
  return {
    // Méthodes principales
    getUserAgencies: preparationAPI.getUserAgencies.bind(preparationAPI),
    getCurrentPreparation: preparationAPI.getCurrentPreparation.bind(preparationAPI),
    startPreparation: preparationAPI.startPreparation.bind(preparationAPI),
    completeStep: preparationAPI.completeStep.bind(preparationAPI),
    completePreparation: preparationAPI.completePreparation.bind(preparationAPI),
    reportIssue: preparationAPI.reportIssue.bind(preparationAPI),
    
    // Méthodes de consultation
    getPreparation: preparationAPI.getPreparation.bind(preparationAPI),
    getPreparationHistory: preparationAPI.getPreparationHistory.bind(preparationAPI),
    getMyStats: preparationAPI.getMyStats.bind(preparationAPI),
    getVehicleHistory: preparationAPI.getVehicleHistory.bind(preparationAPI),
    getDailySummary: preparationAPI.getDailySummary.bind(preparationAPI),
    
    // Méthodes de recherche
    searchPreparations: preparationAPI.searchPreparations.bind(preparationAPI),
    
    // Méthodes de gestion
    updateNotes: preparationAPI.updateNotes.bind(preparationAPI),
    cancelPreparation: preparationAPI.cancelPreparation.bind(preparationAPI),
    resumePreparation: preparationAPI.resumePreparation.bind(preparationAPI),
    
    // Méthodes utilitaires
    getStepDetails: preparationAPI.getStepDetails.bind(preparationAPI),
    exportPreparations: preparationAPI.exportPreparations.bind(preparationAPI),
    getActivePreparations: preparationAPI.getActivePreparations.bind(preparationAPI)
  };
};

// ===== EXPORTS PAR DÉFAUT =====

export default preparationAPI;