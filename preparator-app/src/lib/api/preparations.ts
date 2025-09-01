// ========================================
// FICHIER: preparator-app/src/lib/api/preparations.ts
// ✅ MODIFICATION : Mise à jour API pour le nouveau workflow
// ========================================

import { apiClient } from './client';
import type { 
  Preparation,
  PreparationHistory,
  PreparationStats,
  VehicleFormData,
  IssueReportData,
  ApiResponse,
  PreparationFilters
} from '@/lib/types';

// ✅ NOUVEAU : Interface pour complétion étape sans photo
interface SimpleStepCompletionData {
  step: string;
  notes?: string;
}

// ✅ NOUVEAU : Interface pour récupération planning du jour
interface TodayScheduleAgency {
  hasSchedule: boolean;
  defaultAgency: {
    id: string;
    name: string;
    code: string;
    client: string;
  } | null;
  schedule?: {
    id: string;
    startTime: string;
    endTime: string;
    date: string;
  };
  message?: string;
}

export class PreparationAPI {
  /**
   * ✅ NOUVEAU : Obtenir l'agence du planning d'aujourd'hui
   */
  async getTodayScheduleAgency(): Promise<TodayScheduleAgency> {
    const response = await apiClient.get<ApiResponse<TodayScheduleAgency>>('/preparations/today-schedule-agency');
    return response.data.data!;
  }

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
   * Obtenir une préparation spécifique
   */
  async getPreparation(preparationId: string): Promise<{ preparation: Preparation }> {
    const response = await apiClient.get<ApiResponse<{ preparation: Preparation }>>(
      `/preparations/${preparationId}`
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
   * ✅ NOUVEAU : Compléter une étape SANS photo (version simplifiée)
   */
  async completeStepSimple(preparationId: string, data: SimpleStepCompletionData): Promise<{ preparation: Preparation }> {
    const response = await apiClient.put<ApiResponse<{ preparation: Preparation }>>(
      `/preparations/${preparationId}/step`,
      {
        step: data.step,
        notes: data.notes || ''
      }
    );
    return response.data.data!;
  }

  /**
   * ✅ ANCIEN : Compléter une étape AVEC photo (pour compatibilité si besoin)
   */
  async completeStepWithPhoto(preparationId: string, stepType: string, photo: File, notes?: string): Promise<{ preparation: Preparation }> {
    const formData = new FormData();
    formData.append('step', stepType);
    formData.append('photo', photo);
    if (notes) {
      formData.append('notes', notes);
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
      notes && notes.trim() ? { notes: notes.trim() } : {}
    );
    
    return response.data.data!;
  }

  /**
   * Annuler une préparation
   */
  async cancelPreparation(preparationId: string, reason?: string): Promise<{ preparation: Preparation }> {
    const response = await apiClient.post<ApiResponse<{ preparation: Preparation }>>(
      `/preparations/${preparationId}/cancel`,
      { reason: reason || 'Annulée par l\'utilisateur' }
    );
    
    return response.data.data!;
  }

  /**
   * Signaler un problème/incident
   */
  async reportIssue(preparationId: string, data: IssueReportData): Promise<{ issue: any }> {
    const formData = new FormData();
    formData.append('type', data.type);
    formData.append('description', data.description);
    if (data.severity) {
      formData.append('severity', data.severity);
    }
    if (data.photo) {
      formData.append('photo', data.photo);
    }

    const response = await apiClient.post<ApiResponse<{ issue: any }>>(
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
  async getPreparationsHistory(filters: PreparationFilters = {}): Promise<PreparationHistory> {
    const params = new URLSearchParams();
    
    if (filters.startDate) {
      params.append('startDate', filters.startDate.toISOString().split('T')[0]);
    }
    if (filters.endDate) {
      params.append('endDate', filters.endDate.toISOString().split('T')[0]);
    }
    if (filters.agencyId) {
      params.append('agencyId', filters.agencyId);
    }
    if (filters.vehicleType) {
      params.append('vehicleType', filters.vehicleType);
    }
    if (filters.status) {
      params.append('status', filters.status);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }

    const response = await apiClient.get<ApiResponse<PreparationHistory>>(
      `/preparations/history?${params.toString()}`
    );
    
    return response.data.data!;
  }

  /**
   * Obtenir les statistiques personnelles
   */
  async getMyStats(): Promise<PreparationStats> {
    const response = await apiClient.get<ApiResponse<PreparationStats>>('/preparations/my-stats');
    return response.data.data!;
  }

  /**
   * Obtenir l'historique d'un véhicule par plaque
   */
  async getVehicleHistory(licensePlate: string): Promise<{ preparations: Preparation[] }> {
    const response = await apiClient.get<ApiResponse<{ preparations: Preparation[] }>>(
      `/preparations/vehicle-history/${encodeURIComponent(licensePlate)}`
    );
    
    return response.data.data!;
  }

  /**
   * Obtenir les photos d'une préparation
   */
  async getPreparationPhotos(preparationId: string): Promise<{ photos: any[] }> {
    const response = await apiClient.get<ApiResponse<{ photos: any[] }>>(
      `/preparations/${preparationId}/photos`
    );
    
    return response.data.data!;
  }
}

// ✅ Instance par défaut exportée
export const preparationAPI = new PreparationAPI();