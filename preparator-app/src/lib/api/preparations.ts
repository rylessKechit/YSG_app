// =====================================================
// FICHIER: preparator-app/src/lib/api/preparations.ts
// ✅ CORRECTION DE L'API POUR CORRESPONDRE AUX TYPES
// =====================================================

import { apiClient } from './client';
import type { 
  Preparation,
  PreparationHistory,
  PreparationStats,
  VehicleFormData,
  StepCompletionData,
  IssueReportData,
  ApiResponse,
  PreparationFilters
} from '@/lib/types';

// ===== CLASSE API PRÉPARATIONS =====

export class PreparationAPI {
  /**
   * Obtenir les agences de l'utilisateur
   */
  async getUserAgencies(): Promise<{ agencies: Array<{ id: string; name: string; code: string; client: string }> }> {
    const response = await apiClient.get<ApiResponse<{ agencies: Array<{ id: string; name: string; code: string; client: string }> }>>('/preparations/user-agencies');
    return response.data.data!;
  }

  /**
   * Démarrer une nouvelle préparation
   */
  async startPreparation(data: VehicleFormData): Promise<{ preparation: Preparation }> {
    const response = await apiClient.post<ApiResponse<{ preparation: Preparation }>>(
      '/preparations/start',
      data
    );
    return response.data.data!;
  }

  /**
   * Obtenir la préparation en cours
   */
  async getCurrentPreparation(): Promise<{ preparation: Preparation | null }> {
    const response = await apiClient.get<ApiResponse<{ preparation: Preparation | null }>>('/preparations/current');
    return response.data.data!;
  }

  /**
   * Compléter une étape
   */
  async completeStep(preparationId: string, data: StepCompletionData): Promise<{ preparation: Preparation }> {
    const formData = new FormData();
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
   * ✅ SIGNATURE CORRIGÉE POUR TYPESCRIPT + URL CORRECTE
   */
  async getPreparationHistory(
    page: number = 1,
    limit: number = 20,
    filters?: Record<string, string>
  ): Promise<PreparationHistory> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    // Ajouter les filtres s'ils existent
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          params.append(key, value);
        }
      });
    }

    // ✅ URL CORRIGÉE: utiliser /preparations/history
    const response = await apiClient.get<ApiResponse<PreparationHistory>>(
      `/preparations/history?${params}`
    );
    
    // ✅ RETOURNER DIRECTEMENT LA STRUCTURE ATTENDUE
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
      q: query
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
    }

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
}

// ===== INSTANCE SINGLETON =====

export const preparationApi = new PreparationAPI();

// ===== EXPORT PAR DÉFAUT =====

export default preparationApi;