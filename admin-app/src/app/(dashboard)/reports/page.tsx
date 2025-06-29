// src/app/(dashboard)/reports/page.tsx - VERSION CORRIGÉE AVEC VRAIES DONNÉES
'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  Download, 
  FileText, 
  TrendingUp, 
  Users, 
  Clock, 
  BarChart3,
  Filter,
  RefreshCw,
  Plus,
  Eye,
  AlertCircle
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import des hooks et composants réels
import { 
  useReportsPage, 
  usePunctualityReport,
  usePerformanceReport,
  useActivityReport,
  useReportsList
} from '@/hooks/api/useReports';
import { PunctualityReport } from '@/components/reports/punctuality-report';
import { PerformanceReport } from '@/components/reports/performance-report';
import { ActivityReport } from '@/components/reports/activity-report';
import { ReportFilters } from '@/components/reports/report-filters';
import { ReportExportDialog } from '@/components/reports/report-export-dialog';
import { getDefaultReportFilters } from '@/lib/api/reports';
import { ReportFilters as ReportFiltersType } from '@/types/reports';

const ReportsPage: React.FC = () => {
  // États pour les filtres
  const [filters, setFilters] = useState<ReportFiltersType>(
    getDefaultReportFilters('month')
  );
  const [activeReportType, setActiveReportType] = useState<'ponctualite' | 'performance' | 'activite'>('ponctualite');
  const [showFilters, setShowFilters] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Hooks pour récupérer les données réelles
  const {
    quickMetrics,
    savedReports,
    isLoadingMetrics,
    isLoadingSavedReports,
    metricsError,
    savedReportsError,
    exportReport,
    downloadReport,
    deleteReport,
    isExporting,
    isDownloading,
    isDeleting,
    refetchMetrics,
    refetchSavedReports
  } = useReportsPage();

  // Hooks pour les rapports spécifiques
  const punctualityReport = usePunctualityReport(filters);
  const performanceReport = usePerformanceReport(filters);
  const activityReport = useActivityReport(filters);
  const reportsList = useReportsList({ page: 1, limit: 10 });

  // Gestion des filtres
  const handleFiltersChange = (newFilters: ReportFiltersType) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    // Les hooks se rafraîchissent automatiquement quand les filtres changent
    refetchMetrics();
  };

  const handleGenerateReport = (type: 'ponctualite' | 'performance' | 'activite') => {
    setActiveReportType(type);
    setExportDialogOpen(true);
  };

  const handleExportReport = (exportOptions: any) => {
    exportReport(exportOptions);
  };

  const handleDownloadReport = (reportId: string, format: string, filename: string) => {
    downloadReport({ reportId, format, filename });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="default" className="bg-green-100 text-green-800">Prêt</Badge>;
      case 'generating':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">En cours</Badge>;
      case 'error':
        return <Badge variant="destructive">Erreur</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  // Gestion des erreurs
  if (metricsError || savedReportsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rapports</h1>
            <p className="text-muted-foreground">Générez et consultez vos rapports d'analyse</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erreur lors du chargement des données. Veuillez réessayer.
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={() => {
                refetchMetrics();
                refetchSavedReports();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapports</h1>
          <p className="text-muted-foreground">
            Générez et consultez vos rapports d'analyse
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtres
          </Button>
          <Button 
            className="flex items-center gap-2"
            onClick={() => setExportDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nouveau rapport
          </Button>
        </div>
      </div>

      {/* KPIs réels du backend */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ponctualité</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingMetrics ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            ) : quickMetrics ? (
              <>
                <div className="text-2xl font-bold">{quickMetrics.punctuality?.rate?.toFixed(1) || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {quickMetrics.punctuality?.trend > 0 ? '+' : ''}{quickMetrics.punctuality?.trend?.toFixed(1) || 0}% par rapport au mois dernier
                </p>
              </>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">N/A</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps Moyen</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingMetrics ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            ) : quickMetrics ? (
              <>
                <div className="text-2xl font-bold">{quickMetrics.performance?.averageTime?.toFixed(1) || 0} min</div>
                <p className="text-xs text-muted-foreground">
                  Temps de préparation moyen
                </p>
              </>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">N/A</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activité Totale</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingMetrics ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            ) : quickMetrics ? (
              <>
                <div className="text-2xl font-bold">{quickMetrics.activity?.totalHours?.toFixed(0) || 0}h</div>
                <p className="text-xs text-muted-foreground">
                  Cette semaine
                </p>
              </>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">N/A</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Évolution</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingMetrics ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            ) : quickMetrics ? (
              <>
                <div className="text-2xl font-bold">
                  {quickMetrics.activity?.trend > 0 ? '+' : ''}{quickMetrics.activity?.trend?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Performance générale
                </p>
              </>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">N/A</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtres (conditionnel) */}
      {showFilters && (
        <ReportFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onApply={handleApplyFilters}
          isLoading={isLoadingMetrics}
          availableAgencies={[
            { id: 'paris', name: 'Paris Centre' },
            { id: 'orly', name: 'Orly' },
            { id: 'cdg', name: 'Charles de Gaulle' }
          ]}
          showAdvanced={true}
        />
      )}

      {/* Onglets principaux */}
      <Tabs defaultValue="quick" className="space-y-6">
        <TabsList>
          <TabsTrigger value="quick">Rapports Rapides</TabsTrigger>
          <TabsTrigger value="detailed">Rapports Détaillés</TabsTrigger>
          <TabsTrigger value="saved">Rapports Sauvegardés</TabsTrigger>
        </TabsList>

        {/* Rapports Rapides */}
        <TabsContent value="quick" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Rapport Ponctualité */}
            <Card className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Rapport de Ponctualité</CardTitle>
                  {punctualityReport.isLoading ? (
                    <Badge variant="default" className="bg-yellow-100 text-yellow-800">Chargement</Badge>
                  ) : punctualityReport.error ? (
                    <Badge variant="destructive">Erreur</Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-100 text-green-800">Prêt</Badge>
                  )}
                </div>
                <CardDescription>Analyse des retards et respect des horaires</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleGenerateReport('ponctualite')}
                    disabled={isExporting}
                    className="flex-1"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Générer
                  </Button>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Rapport Performance */}
            <Card className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Rapport de Performance</CardTitle>
                  {performanceReport.isLoading ? (
                    <Badge variant="default" className="bg-yellow-100 text-yellow-800">Chargement</Badge>
                  ) : performanceReport.error ? (
                    <Badge variant="destructive">Erreur</Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-100 text-green-800">Prêt</Badge>
                  )}
                </div>
                <CardDescription>Temps de préparation et efficacité</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleGenerateReport('performance')}
                    disabled={isExporting}
                    className="flex-1"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Générer
                  </Button>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Rapport Activité */}
            <Card className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Rapport d'Activité</CardTitle>
                  {activityReport.isLoading ? (
                    <Badge variant="default" className="bg-yellow-100 text-yellow-800">Chargement</Badge>
                  ) : activityReport.error ? (
                    <Badge variant="destructive">Erreur</Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-100 text-green-800">Prêt</Badge>
                  )}
                </div>
                <CardDescription>Volume et répartition des activités</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleGenerateReport('activite')}
                    disabled={isExporting}
                    className="flex-1"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Générer
                  </Button>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rapports Détaillés avec données réelles */}
        <TabsContent value="detailed" className="space-y-4">
          <Tabs value={activeReportType} onValueChange={setActiveReportType as any}>
            <TabsList>
              <TabsTrigger value="ponctualite">Ponctualité</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="activite">Activité</TabsTrigger>
            </TabsList>

            <TabsContent value="ponctualite">
              {punctualityReport.data ? (
                <PunctualityReport 
                  data={punctualityReport.data} 
                  isLoading={punctualityReport.isLoading}
                />
              ) : punctualityReport.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Erreur lors du chargement du rapport de ponctualité
                  </AlertDescription>
                </Alert>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">
                      Aucune donnée de ponctualité disponible pour la période sélectionnée
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="performance">
              {performanceReport.data ? (
                <PerformanceReport 
                  data={performanceReport.data} 
                  isLoading={performanceReport.isLoading}
                />
              ) : performanceReport.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Erreur lors du chargement du rapport de performance
                  </AlertDescription>
                </Alert>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">
                      Aucune donnée de performance disponible pour la période sélectionnée
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activite">
              {activityReport.data ? (
                <ActivityReport 
                  data={activityReport.data} 
                  isLoading={activityReport.isLoading}
                />
              ) : activityReport.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Erreur lors du chargement du rapport d'activité
                  </AlertDescription>
                </Alert>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">
                      Aucune donnée d'activité disponible pour la période sélectionnée
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Rapports Sauvegardés avec données réelles */}
        <TabsContent value="saved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rapports Générés</CardTitle>
              <CardDescription>
                Vos rapports générés et sauvegardés
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSavedReports ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                          <div className="h-3 bg-gray-200 rounded w-48"></div>
                        </div>
                      </div>
                      <div className="h-8 w-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : savedReports && savedReports.reports?.length > 0 ? (
                <div className="space-y-4">
                  {savedReports.reports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{report.titre}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{report.type}</span>
                            <span>{formatDate(report.creeA)}</span>
                            <span>{report.taille ? `${(report.taille / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</span>
                            <Badge variant="secondary">{report.format.toUpperCase()}</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(report.statut)}
                        {report.statut === 'ready' && (
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadReport(
                                report.id, 
                                report.format, 
                                `${report.titre}.${report.format}`
                              )}
                              disabled={isDownloading}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Aucun rapport sauvegardé pour le moment
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog d'export */}
      <ReportExportDialog
        reportType={activeReportType}
        isOpen={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExportReport}
        isExporting={isExporting}
      />
    </div>
  );
};

export default ReportsPage;