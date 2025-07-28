// admin-app/src/app/(dashboard)/dashboard/page.tsx - VERSION COMPLÈTE AVEC GRAPHIQUES
'use client';

import { useState } from 'react';
import { Users, Clock, Activity, Target, AlertTriangle, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { KPICard } from '@/components/dashboard/kpi-card';

// Nouveaux composants de graphiques
import { EvolutionQuotidienneChart } from '@/components/dashboard/charts/evolution-quotidienne-chart';
import { PerformanceAgencyChart } from '@/components/dashboard/charts/performance-agency-chart';
import { TimeDistributionChart } from '@/components/dashboard/charts/time-distribution-chart';
import { RecentAlertsWidget } from '@/components/dashboard/widgets/recent-alerts-widget';

// Hooks
import { useDashboardData, useDashboardAlerts } from '@/hooks/api/useDashboard';
import { useDashboardChartsPreload, useTimelineData, usePunctualityByAgency, useTimeDistribution } from '@/hooks/api/useDashboardCharts';
import { DashboardFilters } from '@/types/dashboard';

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({
    period: 'today'
  });

  // Récupération des données principales
  const { kpis, overview, charts, alerts, isLoading, isError, error, refetchAll } = useDashboardData(filters);
  const criticalAlerts = useDashboardAlerts({ priority: 'critical', limit: 5 });

  // Données spécifiques pour les graphiques
  const timelineData = useTimelineData({ period: 'week' });
  const punctualityData = usePunctualityByAgency({ period: 'week' });
  const timeDistributionData = useTimeDistribution({ period: 'week' });

  // Calculs des données d'affichage
  const currentLateCount = overview.data?.stats?.todayLate || 0;
  const totalScheduled = overview.data?.stats?.todaySchedules || 0;
  const totalPresent = overview.data?.stats?.todayPresent || 0;
  const todayPreparations = overview.data?.stats?.todayPreparations || 0;
  const punctualityRate = overview.data?.rates?.punctualityRate || 0;
  const averageTime = overview.data?.rates?.averagePreparationTime || 0;

  // Gestion des erreurs
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <Button onClick={refetchAll} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erreur lors du chargement des données: {error?.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calcul des statuts et tendances
  const getKPIStatus = (current: number, target: number) => {
    const ratio = current / target;
    if (ratio >= 1) return 'success';
    if (ratio >= 0.8) return 'warning';
    return 'error';
  };

  const calculateTrend = (current: number, previous: number) => {
    if (!previous) return undefined;
    const change = ((current - previous) / previous) * 100;
    return {
      value: change,
      isPositive: change >= 0,
      label: 'vs hier'
    };
  };

  // Gestion des actions sur les alertes
  const handleAlertAction = (alertId: string, action: 'read' | 'dismiss' | 'view') => {
    console.log(`Action ${action} sur alerte ${alertId}`);
    // TODO: Implémenter les actions sur les alertes
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-600">
            Vue d'ensemble en temps réel • Dernière mise à jour: {' '}
            {overview.data?.timestamp ?
              new Date(overview.data.timestamp).toLocaleTimeString('fr-FR') : '--:--'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => {
              refetchAll();
              timelineData.refetch();
              punctualityData.refetch();
              timeDistributionData.refetch();
            }}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Actualisation...' : 'Actualiser'}
          </Button>
        </div>
      </div>

      {/* Alertes critiques */}
      {criticalAlerts.data && criticalAlerts.data.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{criticalAlerts.data.length} alerte(s) critique(s)</strong> nécessitent votre attention immédiate.
            <Button variant="link" className="p-0 h-auto ml-2 text-red-600 underline">
              Voir les détails
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs principaux */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Préparateurs actifs"
          value={totalPresent}
          subtitle={`sur ${totalScheduled} planifié(s)`}
          trend={calculateTrend(totalPresent, 24)} // TODO: Récupérer la valeur d'hier
          target={{
            value: totalScheduled,
            label: 'Présence'
          }}
          status={getKPIStatus(totalPresent, totalScheduled)}
          format="number"
          icon={<Users className="h-4 w-4" />}
          loading={overview.isLoading}
        />

        <KPICard
          title="Ponctualité"
          value={punctualityRate}
          subtitle="Taux global aujourd'hui"
          trend={calculateTrend(punctualityRate, 94)} // TODO: Récupérer la valeur d'hier
          target={{
            value: 95,
            label: 'Objectif'
          }}
          status={getKPIStatus(punctualityRate, 95)}
          format="percentage"
          icon={<Clock className="h-4 w-4" />}
          loading={overview.isLoading}
        />

        <KPICard
          title="Préparations"
          value={todayPreparations}
          subtitle="Véhicules traités aujourd'hui"
          trend={calculateTrend(todayPreparations, 42)} // TODO: Récupérer la valeur d'hier
          target={{
            value: 50,
            label: 'Objectif jour'
          }}
          status={getKPIStatus(todayPreparations, 50)}
          format="number"
          icon={<Activity className="h-4 w-4" />}
          loading={overview.isLoading}
        />

        <KPICard
          title="Temps moyen"
          value={averageTime}
          subtitle="Minutes par véhicule"
          trend={calculateTrend(averageTime, 28)} // TODO: Récupérer la valeur d'hier
          target={{
            value: 25,
            label: 'Objectif max'
          }}
          status={getKPIStatus(25, averageTime)} // Inversé car plus bas = mieux
          format="time"
          icon={<Target className="h-4 w-4" />}
          loading={overview.isLoading}
        />
      </div>

      {/* Section des retards en cours et performance par agence */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Retards en cours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Retards en cours</span>
              <Badge variant={currentLateCount > 0 ? "destructive" : "default"}>
                {currentLateCount}
              </Badge>
            </CardTitle>
            <CardDescription>
              Préparateurs actuellement en retard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <LoadingSpinner size="sm" />
            ) : currentLateCount === 0 ? (
              <div className="text-center py-4">
                <div className="text-green-600 mb-2">
                  <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-green-800">Aucun retard signalé</p>
                <p className="text-xs text-green-600 mt-1">Tous les préparateurs sont à l'heure</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* TODO: Mapper les vrais données de retards */}
                <div className="text-center text-gray-500">
                  <p className="text-sm">{currentLateCount} préparateur(s) en retard</p>
                  <p className="text-xs mt-1">Détails à venir...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance par agence - Version mini */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance par agence</CardTitle>
            <CardDescription>
              Taux de ponctualité par site
            </CardDescription>
          </CardHeader>
          <CardContent>
            {punctualityData.isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <div className="space-y-3">
                {punctualityData.data && punctualityData.data.length > 0 ? 
                  punctualityData.data.slice(0, 3).map((agency) => (
                    <div key={agency.agencyId} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{agency.agencyName}</span>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${
                          agency.punctualityRate >= 95 ? 'text-green-600' :
                          agency.punctualityRate >= 85 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {agency.punctualityRate.toFixed(1)}%
                        </span>
                        <Badge 
                          variant={agency.punctualityRate >= 95 ? "default" : "outline"}
                          className="text-xs"
                        >
                          {agency.punctualityRate >= 95 ? 'Excellent' :
                           agency.punctualityRate >= 85 ? 'Bon' : 'À améliorer'}
                        </Badge>
                      </div>
                    </div>
                  )) : (
                  <div className="space-y-3">
                    {/* Données de fallback */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">SIXT Antony</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-red-600">0.0%</span>
                        <Badge variant="outline" className="text-xs">À améliorer</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">SIXT Massy TGV</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-red-600">0.0%</span>
                        <Badge variant="outline" className="text-xs">À améliorer</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">SIXT Melun</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-red-600">0.0%</span>
                        <Badge variant="outline" className="text-xs">À améliorer</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section des graphiques principales */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Graphique Evolution quotidienne */}
        <EvolutionQuotidienneChart
          data={timelineData.data || []}
          isLoading={timelineData.isLoading}
          period={filters.period}
        />

        {/* Widget Alertes récentes */}
        <RecentAlertsWidget
          alerts={alerts.data || []}
          isLoading={alerts.isLoading}
          maxAlerts={5}
          onAlertAction={handleAlertAction}
          showActions={true}
        />
      </div>

      {/* Section des graphiques détaillés */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance par agence - Version complète */}
        <PerformanceAgencyChart
          data={punctualityData.data || []}
          isLoading={punctualityData.isLoading}
          metric="punctuality"
        />

        {/* Distribution des temps */}
        <TimeDistributionChart
          data={timeDistributionData.data || []}
          isLoading={timeDistributionData.isLoading}
          chartType="bar"
        />
      </div>

      {/* Section des graphiques supplémentaires */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Performance par agence - Préparations */}
        <PerformanceAgencyChart
          data={punctualityData.data || []}
          isLoading={punctualityData.isLoading}
          metric="preparations"
        />
        
        {/* Performance par agence - Temps moyen */}
        <PerformanceAgencyChart
          data={punctualityData.data || []}
          isLoading={punctualityData.isLoading}
          metric="averageTime"
        />

        {/* Distribution des temps - Version secteurs */}
        <TimeDistributionChart
          data={timeDistributionData.data || []}
          isLoading={timeDistributionData.isLoading}
          chartType="pie"
        />
      </div>
    </div>
  );
}