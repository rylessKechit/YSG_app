// =====================================================
// FICHIER: preparator-app/src/lib/api/preparations.ts
// ✅ CORRECTION DE L'API POUR CORRESPONDRE AUX TYPES
// =====================================================

import { adaptLegacyPreparation, PreparationHistoryData } from '../types/preparation';
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
   * Démarrer une nouvelle préparation (UNIFIÉ)
   */
  async startPreparation(vehicleData: VehicleFormData): Promise<Preparation> {
    const response = await apiClient.post<ApiResponse<{ preparation: any }>>(
      '/preparations/start',
      vehicleData
    );
    
    // ✅ Adapter la réponse si nécessaire
    const rawPreparation = response.data.data!.preparation;
    return adaptLegacyPreparation(rawPreparation);
  }

  /**
   * Récupérer la préparation en cours (UNIFIÉ)
   */
  async getCurrentPreparation(): Promise<Preparation | null> {
    const response = await apiClient.get<ApiResponse<{ preparation: any | null }>>(
      '/preparations/current'
    );
    
    const rawPreparation = response.data.data!.preparation;
    return rawPreparation ? adaptLegacyPreparation(rawPreparation) : null;
  }

  /**
   * Récupérer mes préparations (UNIFIÉ)
   */
  async getMyPreparations(filters?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PreparationHistoryData> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get<ApiResponse<PreparationHistoryData>>(
      `/preparations/my?${params}`
    );

    const data = response.data.data!;
    
    // ✅ Adapter toutes les préparations
    return {
      ...data,
      preparations: data.preparations.map(prep => adaptLegacyPreparation(prep))
    };
  }

  /**
   * Signaler un incident (UNIFIÉ)
   */
  async reportIssue(preparationId: string, data: IssueReportData): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('type', data.type);
      formData.append('description', data.description);
      formData.append('severity', data.severity || 'medium');
      if (data.photo) {
        formData.append('photo', data.photo);
      }

      await apiClient.post(`/preparations/${preparationId}/issue`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Erreur signalement incident:', error);
      return false;
    }
  }

  /**
   * Compléter une étape (UNIFIÉ)
   */
  async completeStep(preparationId: string, data: StepCompletionData): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('step', data.step);
      formData.append('photo', data.photo);
      if (data.notes) {
        formData.append('notes', data.notes);
      }

      await apiClient.put(`/preparations/${preparationId}/step`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Erreur complétion étape:', error);
      return false;
    }
  }

  /**
   * Terminer une préparation (UNIFIÉ)
   */
  async completePreparation(preparationId: string, notes?: string): Promise<boolean> {
    try {
      await apiClient.post(`/preparations/${preparationId}/complete`, {
        notes: notes || ''
      });
      return true;
    } catch (error) {
      console.error('❌ Erreur finalisation préparation:', error);
      return false;
    }
  }

  /**
   * Obtenir le détail d'une préparation (UNIFIÉ)
   */
  async getPreparationById(id: string): Promise<Preparation> {
    const response = await apiClient.get<ApiResponse<{ preparation: any }>>(
      `/preparations/${id}`
    );
    
    const rawPreparation = response.data.data!.preparation;
    return adaptLegacyPreparation(rawPreparation);
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
   * Obtenir l'historique d'un véhicule par plaque (UNIFIÉ)
   */
  async getVehicleHistory(licensePlate: string): Promise<{ preparations: Preparation[] }> {
    const response = await apiClient.get<ApiResponse<{ preparations: any[] }>>(
      `/preparations/vehicle-history/${licensePlate}`
    );
    
    const data = response.data.data!;
    return {
      preparations: data.preparations.map(prep => adaptLegacyPreparation(prep))
    };
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