// src/lib/api/reports.ts - COMPATIBLE AVEC NOUVEAUX ENDPOINTS BACKEND
import { apiClient, apiRequest, ApiResponse } from './client';
import { 
  ReportFilters, 
  ReportExportOptions,
  PunctualityReportData,
  PerformanceReportData,
  ActivityReportData,
  ReportListResponse,
  ReportExportResponse
} from '@/types/reports';

// ================================
// API CLIENT POUR RAPPORTS - ENDPOINTS RÉELS
// ================================

export const reportsApi = {
  // ================================
  // MÉTRIQUES RAPIDES
  // ================================
  
  async getQuickMetrics(period: string = 'week'): Promise<ApiResponse<any>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<any>>(`/admin/reports/quick-metrics?period=${period}`),
      { 
        showErrorToast: false,
        retryCount: 1 
      }
    );
  },

  // ================================
  // RAPPORTS DÉTAILLÉS
  // ================================
  
  async getPunctualityReport(filters: ReportFilters = {}): Promise<ApiResponse<PunctualityReportData>> {
    const queryParams = new URLSearchParams();
    
    if (filters.period) queryParams.append('period', filters.period);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.format) queryParams.append('format', filters.format);
    if (filters.includeDetails !== undefined) {
      queryParams.append('includeDetails', filters.includeDetails.toString());
    }
    
    if (filters.agencies && filters.agencies.length > 0) {
      filters.agencies.forEach(agency => {
        queryParams.append('agencies[]', agency);
      });
    }

    return apiRequest(
      () => apiClient.get<ApiResponse<PunctualityReportData>>(
        `/admin/reports/ponctualite?${queryParams.toString()}`
      ),
      { 
        showErrorToast: true,
        retryCount: 1 
      }
    );
  },

  async getPerformanceReport(filters: ReportFilters = {}): Promise<ApiResponse<PerformanceReportData>> {
    const queryParams = new URLSearchParams();
    
    if (filters.period) queryParams.append('period', filters.period);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.includeComparison !== undefined) {
      queryParams.append('includeComparison', filters.includeComparison.toString());
    }
    
    if (filters.agencies && filters.agencies.length > 0) {
      filters.agencies.forEach(agency => {
        queryParams.append('agencies[]', agency);
      });
    }

    return apiRequest(
      () => apiClient.get<ApiResponse<PerformanceReportData>>(
        `/admin/reports/performance?${queryParams.toString()}`
      ),
      { 
        showErrorToast: true,
        retryCount: 1 
      }
    );
  },

  async getActivityReport(filters: ReportFilters = {}): Promise<ApiResponse<ActivityReportData>> {
    const queryParams = new URLSearchParams();
    
    if (filters.period) queryParams.append('period', filters.period);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    
    if (filters.agencies && filters.agencies.length > 0) {
      filters.agencies.forEach(agency => {
        queryParams.append('agencies[]', agency);
      });
    }

    return apiRequest(
      () => apiClient.get<ApiResponse<ActivityReportData>>(
        `/admin/reports/activite?${queryParams.toString()}`
      ),
      { 
        showErrorToast: true,
        retryCount: 1 
      }
    );
  },

  // ================================
  // EXPORT ET GESTION
  // ================================
  
  async exportReport(options: ReportExportOptions): Promise<ApiResponse<ReportExportResponse['data']>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<ReportExportResponse['data']>>(
        '/admin/reports/export',
        options
      ),
      { 
        showErrorToast: true,
        retryCount: 0
      }
    );
  },

  async downloadReport(reportId: string, format: string): Promise<Blob> {
    try {
      const response = await apiClient.get(
        `/admin/reports/${reportId}/download?format=${format}`,
        {
          responseType: 'blob',
          headers: {
            'Accept': format === 'excel' 
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : format === 'pdf' 
              ? 'application/pdf'
              : 'text/csv'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erreur téléchargement rapport:', error);
      throw error;
    }
  },

  async getReportsList(filters: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  } = {}): Promise<ApiResponse<ReportListResponse>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<ReportListResponse>>('/admin/reports', {
        params: filters
      }),
      { 
        showErrorToast: true,
        retryCount: 1 
      }
    );
  },

  async getReportTemplates(): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    type: string;
    description: string;
    defaultFilters: ReportFilters;
  }>>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<any>>('/admin/reports/templates'),
      { 
        showErrorToast: false,
        retryCount: 1 
      }
    );
  },

  async deleteReport(reportId: string): Promise<ApiResponse<void>> {
    return apiRequest(
      () => apiClient.delete<ApiResponse<void>>(`/admin/reports/${reportId}`),
      { 
        showErrorToast: true,
        retryCount: 0 
      }
    );
  }
};

// ================================
// HELPERS
// ================================

export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function formatDateParams(startDate?: Date, endDate?: Date): {
  startDate?: string;
  endDate?: string;
} {
  return {
    startDate: startDate?.toISOString().split('T')[0],
    endDate: endDate?.toISOString().split('T')[0]
  };
}

export function getDefaultReportFilters(period: string = 'month'): ReportFilters {
  const now = new Date();
  const startDate = new Date();
  
  switch (period) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }
  
  return {
    period: period as any,
    startDate: startDate.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
    format: 'json',
    includeDetails: false,
    includeComparison: false
  };
}