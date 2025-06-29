// src/hooks/api/useReports.ts - HOOKS AVEC ENDPOINTS BACKEND RÉELS
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  reportsApi, 
  downloadBlob, 
  getDefaultReportFilters 
} from '@/lib/api/reports';
import { 
  ReportFilters, 
  ReportExportOptions,
  PunctualityReportData,
  PerformanceReportData,
  ActivityReportData,
  ReportListResponse
} from '@/types/reports';
import { useState } from 'react';

// ================================
// QUERY KEYS
// ================================

export const REPORTS_QUERY_KEYS = {
  all: ['reports'] as const,
  lists: () => [...REPORTS_QUERY_KEYS.all, 'list'] as const,
  list: (filters: any) => [...REPORTS_QUERY_KEYS.lists(), { filters }] as const,
  punctuality: (filters: ReportFilters) => [...REPORTS_QUERY_KEYS.all, 'punctuality', filters] as const,
  performance: (filters: ReportFilters) => [...REPORTS_QUERY_KEYS.all, 'performance', filters] as const,
  activity: (filters: ReportFilters) => [...REPORTS_QUERY_KEYS.all, 'activity', filters] as const,
  quickMetrics: (period: string) => [...REPORTS_QUERY_KEYS.all, 'quick-metrics', period] as const,
  templates: () => [...REPORTS_QUERY_KEYS.all, 'templates'] as const,
};

// ================================
// HOOK POUR MÉTRIQUES RAPIDES
// ================================

export function useQuickMetrics(period: string = 'week') {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.quickMetrics(period),
    queryFn: () => reportsApi.getQuickMetrics(period),
    enabled: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
    select: (data) => data.data,
    meta: {
      errorMessage: 'Erreur lors du chargement des métriques'
    }
  });
}

// ================================
// HOOKS POUR RAPPORTS DÉTAILLÉS
// ================================

export function usePunctualityReport(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.punctuality(filters),
    queryFn: () => reportsApi.getPunctualityReport(filters),
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    select: (data) => data.data,
    meta: {
      errorMessage: 'Erreur lors du chargement du rapport de ponctualité'
    }
  });
}

export function usePerformanceReport(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.performance(filters),
    queryFn: () => reportsApi.getPerformanceReport(filters),
    enabled: true,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    select: (data) => data.data,
    meta: {
      errorMessage: 'Erreur lors du chargement du rapport de performance'
    }
  });
}

export function useActivityReport(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.activity(filters),
    queryFn: () => reportsApi.getActivityReport(filters),
    enabled: true,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    select: (data) => data.data,
    meta: {
      errorMessage: 'Erreur lors du chargement du rapport d\'activité'
    }
  });
}

// ================================
// HOOK POUR LISTE DES RAPPORTS
// ================================

export function useReportsList(filters: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
} = {}) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.list(filters),
    queryFn: () => reportsApi.getReportsList(filters),
    enabled: true,
    staleTime: 1 * 60 * 1000,
    retry: 1,
    select: (data) => data.data,
    meta: {
      errorMessage: 'Erreur lors du chargement de la liste des rapports'
    }
  });
}

// ================================
// HOOK POUR TEMPLATES
// ================================

export function useReportTemplates() {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.templates(),
    queryFn: () => reportsApi.getReportTemplates(),
    enabled: true,
    staleTime: 30 * 60 * 1000, // 30 minutes pour les templates
    retry: 1,
    select: (data) => data.data,
    meta: {
      errorMessage: 'Erreur lors du chargement des templates'
    }
  });
}

// ================================
// MUTATIONS
// ================================

// Mutation pour exporter un rapport
export function useExportReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: ReportExportOptions) => reportsApi.exportReport(options),
    onSuccess: (data, variables) => {
      toast.success('Export en cours de génération...');
      
      // Invalider les listes pour actualiser le statut
      queryClient.invalidateQueries({ 
        queryKey: REPORTS_QUERY_KEYS.lists() 
      });

      // Si c'est un téléchargement direct
      if (data.data.downloadUrl) {
        toast.success('Téléchargement prêt !');
        // Déclencher le téléchargement
        window.open(data.data.downloadUrl, '_blank');
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de l\'export');
    },
  });
}

// Mutation pour télécharger un rapport
export function useDownloadReport() {
  return useMutation({
    mutationFn: ({ reportId, format, filename }: { 
      reportId: string; 
      format: string; 
      filename: string; 
    }) => reportsApi.downloadReport(reportId, format).then(blob => ({ blob, filename })),
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename);
      toast.success('Téléchargement terminé !');
    },
    onError: (error: any) => {
      toast.error('Erreur lors du téléchargement');
      console.error('Erreur téléchargement:', error);
    },
  });
}

// Mutation pour supprimer un rapport
export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => reportsApi.deleteReport(reportId),
    onSuccess: () => {
      toast.success('Rapport supprimé avec succès');
      
      // Invalider les listes
      queryClient.invalidateQueries({ 
        queryKey: REPORTS_QUERY_KEYS.lists() 
      });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la suppression');
    },
  });
}

// ================================
// HOOK COMPOSITE POUR PAGE PRINCIPALE
// ================================

export function useReportsPage() {
  const quickMetrics = useQuickMetrics('week');
  const savedReports = useReportsList({ page: 1, limit: 10 });
  const templates = useReportTemplates();

  // Mutations
  const exportReport = useExportReport();
  const downloadReport = useDownloadReport();
  const deleteReport = useDeleteReport();

  return {
    // Données
    quickMetrics: quickMetrics.data,
    savedReports: savedReports.data,
    templates: templates.data,
    
    // États de chargement
    isLoadingMetrics: quickMetrics.isLoading,
    isLoadingSavedReports: savedReports.isLoading,
    isLoadingTemplates: templates.isLoading,
    
    // Erreurs
    metricsError: quickMetrics.error,
    savedReportsError: savedReports.error,
    templatesError: templates.error,
    
    // Actions
    exportReport: exportReport.mutate,
    downloadReport: downloadReport.mutate,
    deleteReport: deleteReport.mutate,
    
    // États des mutations
    isExporting: exportReport.isPending,
    isDownloading: downloadReport.isPending,
    isDeleting: deleteReport.isPending,
    
    // Rafraîchissement
    refetchMetrics: quickMetrics.refetch,
    refetchSavedReports: savedReports.refetch,
    refetchTemplates: templates.refetch,
  };
}

// ================================
// HOOK POUR FORMULAIRE DE RAPPORT
// ================================

export function useReportForm() {
  const [filters, setFilters] = useState<ReportFilters>(
    getDefaultReportFilters('month')
  );

  const updateFilters = (newFilters: Partial<ReportFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters(getDefaultReportFilters('month'));
  };

  return {
    filters,
    updateFilters,
    resetFilters,
    validateParams: () => console.info('Validation à implémenter'),
    estimateTime: () => console.info('Estimation à implémenter'),
    validation: null,
    estimation: null,
    isValidating: false,
    isEstimating: false,
  };
}

// ================================
// HOOK POUR CACHE INTELLIGENT
// ================================

export function useReportsCache() {
  const queryClient = useQueryClient();

  const prefetchPunctualityReport = (filters: ReportFilters) => {
    queryClient.prefetchQuery({
      queryKey: REPORTS_QUERY_KEYS.punctuality(filters),
      queryFn: () => reportsApi.getPunctualityReport(filters),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchPerformanceReport = (filters: ReportFilters) => {
    queryClient.prefetchQuery({
      queryKey: REPORTS_QUERY_KEYS.performance(filters),
      queryFn: () => reportsApi.getPerformanceReport(filters),
      staleTime: 5 * 60 * 1000,
    });
  };

  const invalidateAllReports = () => {
    queryClient.invalidateQueries({ 
      queryKey: REPORTS_QUERY_KEYS.all 
    });
  };

  const clearReportsCache = () => {
    queryClient.removeQueries({ 
      queryKey: REPORTS_QUERY_KEYS.all 
    });
  };

  return {
    prefetchPunctualityReport,
    prefetchPerformanceReport,
    invalidateAllReports,
    clearReportsCache,
  };
}