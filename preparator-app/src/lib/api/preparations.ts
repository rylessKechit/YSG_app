// lib/apiClient/preparations.ts
import { apiClient } from './client';

export interface VehicleFormData {
  agencyId: string;
  licensePlate: string;
  brand: string;
  model: string;
  color?: string;
  year?: number;
  fuelType: 'essence' | 'diesel' | 'electrique' | 'hybride';
  condition: 'excellent' | 'bon' | 'correct' | 'mediocre';
  notes?: string;
}

export interface Vehicle {
  licensePlate: string;
  brand: string;
  model: string;
  color?: string;
  year?: number;
  fuelType: string;
  condition: string;
  notes?: string;
  fullName: string;
}

export interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
  isDefault?: boolean;
}

export interface PreparationStep {
  type: string;
  label: string;
  completed: boolean;
  photoUrl?: string;
  completedAt?: Date;
  notes?: string;
  order: number;
}

export interface Preparation {
  id: string;
  vehicle: Vehicle;
  agency: Agency;
  startTime: Date;
  endTime?: Date;
  status: 'in_progress' | 'completed' | 'cancelled';
  steps: PreparationStep[];
  progress: number;
  currentDuration: number;
  totalMinutes?: number;
  isOnTime?: boolean;
  issues: any[];
  issuesCount: number;
  notes?: string;
  summary?: any;
  createdAt: Date;
}

export interface StepCompletionData {
  stepType: string;
  photo: File;
  notes?: string;
}

export interface IssueReportData {
  type: string;
  description: string;
  photo?: File;
  severity?: 'low' | 'medium' | 'high';
}

export interface PreparationHistory {
  preparations: Preparation[];
  filters: {
    startDate: Date;
    endDate: Date;
    agencyId?: string;
    search?: string;
  };
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface PreparationStats {
  totalPreparations: number;
  averageTime: number;
  onTimeRate: number;
  completionRate: number;
  bestTime: number;
  worstTime: number;
  weeklyStats: {
    date: string;
    count: number;
    averageTime: number;
  }[];
  stepStats: {
    stepType: string;
    averageTime: number;
    completionRate: number;
  }[];
}

class PreparationAPI {
  
  /**
   * Obtenir les agences de l'utilisateur connecté
   */
  async getUserAgencies(): Promise<{ agencies: Agency[] }> {
    const response = await apiClient.get('/preparations/user-agencies');
    return response.data.data;
  }

  /**
   * Obtenir la préparation en cours
   */
  async getCurrentPreparation(): Promise<{ preparation: Preparation | null }> {
    const response = await apiClient.get('/preparations/current');
    return response.data.data;
  }

  /**
   * Démarrer une nouvelle préparation
   */
  async startPreparation(data: VehicleFormData): Promise<{ preparation: Preparation }> {
    const response = await apiClient.post('/preparations/start', data);
    return response.data.data;
  }

  /**
   * Obtenir une préparation par ID
   */
  async getPreparation(id: string): Promise<{ preparation: Preparation }> {
    const response = await apiClient.get(`/preparations/${id}`);
    return response.data.data;
  }

  /**
   * Compléter une étape avec photo
   */
  async completeStep(preparationId: string, data: StepCompletionData): Promise<{ preparation: Preparation }> {
    const formData = new FormData();
    formData.append('stepType', data.stepType);
    formData.append('photo', data.photo);
    if (data.notes) {
      formData.append('notes', data.notes);
    }

    const response = await apiClient.put(`/preparations/${preparationId}/step`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data;
  }

  /**
   * Terminer une préparation
   */
  async completePreparation(preparationId: string, notes?: string): Promise<{ preparation: Preparation }> {
    const response = await apiClient.post(`/preparations/${preparationId}/complete`, {
      notes
    });
    return response.data.data;
  }

  /**
   * Signaler un incident
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

    const response = await apiClient.post(`/preparations/${preparationId}/issue`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data;
  }

  /**
   * Obtenir l'historique des préparations
   */
  async getHistory(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    agencyId?: string;
    search?: string;
  }): Promise<PreparationHistory> {
    const response = await apiClient.get('/preparations/history', { params });
    return response.data.data;
  }

  /**
   * Obtenir l'historique d'un véhicule par plaque
   */
  async getVehicleHistory(licensePlate: string): Promise<{
    licensePlate: string;
    preparations: Preparation[];
    summary: {
      totalPreparations: number;
      lastPreparation?: Date;
      averageTime: number;
      lastVehicleInfo?: Vehicle;
    };
  }> {
    const response = await apiClient.get(`/preparations/vehicle-history/${licensePlate}`);
    return response.data.data;
  }

  /**
   * Obtenir les statistiques personnelles
   */
  async getMyStats(params?: {
    startDate?: string;
    endDate?: string;
    agencyId?: string;
  }): Promise<PreparationStats> {
    const response = await apiClient.get('/preparations/my-stats', { params });
    return response.data.data;
  }

  /**
   * Annuler une préparation en cours
   */
  async cancelPreparation(preparationId: string, reason?: string): Promise<{ preparation: Preparation }> {
    const response = await apiClient.post(`/preparations/${preparationId}/cancel`, {
      reason
    });
    return response.data.data;
  }
}

export const preparationApi = new PreparationAPI();