// admin-app/src/hooks/api/usePreparationsReport.ts
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

// ================================
// TYPES
// ================================

interface PreparationsReportFilters {
  agencyId: string;
  startDate: string;
  endDate: string;
  format?: 'json' | 'excel';
}

interface PreparationsReportMetrics {
  totalPreparations: number;
  exteriorOrInterior: number;
  fuel: number;
  specialWash: number;
  details: Array<{
    id: string;
    vehicule: string;
    preparateur: string;
    dateCreation: string;
    dateCompletion?: string;
    statut: string;
    hasExterior: boolean;
    hasInterior: boolean;
    hasFuel: boolean;
    hasSpecialWash: boolean;
    exteriorOrInterior: boolean;
    etapesTotal: number;
    etapesCompletees: number;
  }>;
}

interface PreparationsReportData {
  agence: {
    id: string;
    nom: string;
    code: string;
  };
  periode: {
    debut: string;
    fin: string;
    jours: number;
  };
  metriques: PreparationsReportMetrics;
  genereA: string;
  generePar: string;
}

interface PreparationsReportResponse {
  success: boolean;
  data: PreparationsReportData;
  message: string;
}

// ================================
// API CLIENT
// ================================

const preparationsReportApi = {
  /**
   * Générer le rapport des préparations (format JSON)
   */
  async generateReport(filters: PreparationsReportFilters): Promise<PreparationsReportResponse> {
    const params = new URLSearchParams({
      agencyId: filters.agencyId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      format: filters.format || 'json'
    });

    const response = await apiClient.get<PreparationsReportResponse>(
      `/admin/reports/preparations?${params.toString()}`
    );

    return response.data;
  },

  /**
   * Télécharger le rapport Excel
   */
  async downloadExcel(filters: Omit<PreparationsReportFilters, 'format'>): Promise<void> {
    const params = new URLSearchParams({
      agencyId: filters.agencyId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      format: 'excel'
    });

    const response = await apiClient.get(
      `/admin/reports/preparations?${params.toString()}`,
      {
        responseType: 'blob',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      }
    );

    // Créer et télécharger le fichier
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Générer un nom de fichier avec la date
    const startDate = new Date(filters.startDate).toISOString().split('T')[0];
    const endDate = new Date(filters.endDate).toISOString().split('T')[0];
    link.download = `rapport-preparations-${startDate}-${endDate}.xlsx`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
  }
};

// ================================
// HOOK PRINCIPAL
// ================================

export function usePreparationsReport() {
  
  // Mutation pour générer le rapport JSON
  const generateReportMutation = useMutation({
    mutationFn: preparationsReportApi.generateReport,
    onError: (error: any) => {
      console.error('Erreur génération rapport:', error);
      const message = error.response?.data?.message || 'Erreur lors de la génération du rapport';
      toast.error(message);
    }
  });

  // Mutation pour télécharger l'Excel
  const downloadExcelMutation = useMutation({
    mutationFn: preparationsReportApi.downloadExcel,
    onError: (error: any) => {
      console.error('Erreur téléchargement Excel:', error);
      const message = error.response?.data?.message || 'Erreur lors du téléchargement';
      toast.error(message);
    }
  });

  return {
    // Fonctions
    generateReport: generateReportMutation.mutateAsync,
    downloadExcel: downloadExcelMutation.mutateAsync,
    
    // États
    isGenerating: generateReportMutation.isPending,
    isDownloading: downloadExcelMutation.isPending,
    
    // Erreurs
    generateError: generateReportMutation.error,
    downloadError: downloadExcelMutation.error,
    
    // Données
    reportData: generateReportMutation.data,
    
    // Reset
    reset: () => {
      generateReportMutation.reset();
      downloadExcelMutation.reset();
    }
  };
}

// ================================
// INTERFACE POUR L'AGENCE
// ================================

export interface Agency {
  id: string;
  name: string;
  code: string;
}

export function useAgencies(): {
  data: Agency[] | undefined;
  isLoading: boolean;
  error: any;
  refetch: () => Promise<void>;
} {
  // Cette liste devrait venir d'une vraie API
  const mockAgencies: Agency[] = [
    { id: '676c52b41c4b0b8ae40d7d1e', name: 'Paris Nord', code: 'PN' },
    { id: '676c52b41c4b0b8ae40d7d1f', name: 'Lyon Centre', code: 'LC' },
    { id: '676c52b41c4b0b8ae40d7d20', name: 'Marseille Est', code: 'ME' },
    { id: '676c52b41c4b0b8ae40d7d21', name: 'Toulouse Sud', code: 'TS' },
  ];

  return {
    data: mockAgencies,
    isLoading: false,
    error: null,
    refetch: async () => Promise.resolve()
  };
}