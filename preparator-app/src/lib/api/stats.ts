// lib/api/stats.ts
// ✅ API pour les statistiques

import { apiClient } from './client';
import type { ApiResponse } from '@/lib/types';
import type { DetailedStats, StatsFilter } from '@/lib/types/stats';

class StatsApi {
  /**
   * Obtenir les statistiques personnelles détaillées
   */
  async getMyStats(filters: StatsFilter): Promise<DetailedStats> {
    const params = new URLSearchParams({
      period: filters.period
    });

    if (filters.agencyId) {
      params.append('agencyId', filters.agencyId);
    }

    const response = await apiClient.get<ApiResponse<DetailedStats>>(
      `/preparations/my-stats?${params}`
    );
    
    return response.data.data!;
  }

  /**
   * Obtenir les statistiques de performance
   */
  async getPerformanceStats(filters: StatsFilter): Promise<DetailedStats> {
    const params = new URLSearchParams({
      period: filters.period
    });

    if (filters.agencyId) {
      params.append('agencyId', filters.agencyId);
    }

    const response = await apiClient.get<ApiResponse<DetailedStats>>(
      `/profile/performance?${params}`
    );
    
    return response.data.data!;
  }
}

export const statsApi = new StatsApi();