// admin-app/src/app/(dashboard)/dashboard/page.tsx - VERSION CORRIGÉE
'use client';

import { useState } from 'react';
import { Users, Clock, Activity, Target, AlertTriangle, CheckCircle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { KPICard } from '@/components/dashboard/kpi-card';

import { useDashboardData, useDashboardAlerts } from '@/hooks/api/useDashboard';
import { DashboardFilters } from '@/lib/api/dashboard';

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({
    period: 'today'
  });

  // Récupération des données en temps réel
  const { kpis, overview, charts, alerts, isLoading, isError, error, refetchAll } = useDashboardData(filters);
  const criticalAlerts = useDashboardAlerts({ priority: 'critical', limit: 5 });

  // ✅ CORRECTION : Utiliser les données de overview au lieu de kpis pour les retards
  const currentLateCount = overview.data?.stats?.todayLate || 0;
  const totalScheduled = overview.data?.stats?.todaySchedules || 0;
  const totalPresent = overview.data?.stats?.todayPresent || 0;

  // Gestion des erreurs
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <Button onClick={refetchAll} variant="outline">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-600">
            Vue d'ensemble en temps réel • Dernière mise à jour: {' '}
            {overview.data?.timestamp ? new Date(overview.data.timestamp).toLocaleTimeString('fr-FR') : '--:--'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={refetchAll}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
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
            <Button variant="link" className="p-0 h-auto ml-2">
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
          value={overview.data?.rates?.punctualityRate || 0}
          subtitle="Taux global aujourd'hui"
          trend={calculateTrend(
            overview.data?.rates?.punctualityRate || 0,
            94 // TODO: Récupérer la valeur d'hier'
          )}
          target={{
            value: 95,
            label: 'Objectif'
          }}
          status={getKPIStatus(
            overview.data?.rates?.punctualityRate || 0,
            95
          )}
          format="percentage"
          icon={<Clock className="h-4 w-4" />}
          loading={overview.isLoading}
        />

        <KPICard
          title="Préparations"
          value={overview.data?.stats?.todayPreparations || 0}
          subtitle="Véhicules traités aujourd'hui"
          trend={calculateTrend(
            overview.data?.stats?.todayPreparations || 0,
            42 // TODO: Récupérer la valeur d'hier'
          )}
          target={{
            value: 50,
            label: 'Objectif jour'
          }}
          status={getKPIStatus(
            overview.data?.stats?.todayPreparations || 0,
            50
          )}
          format="number"
          icon={<Activity className="h-4 w-4" />}
          loading={overview.isLoading}
        />

        <KPICard
          title="Temps moyen"
          value={26} // TODO: Récupérer depuis l'API
          subtitle="Minutes par véhicule"
          trend={calculateTrend(26, 25)} // TODO: Récupérer la valeur d'hier
          target={{
            value: 30,
            label: 'Max souhaité'
          }}
          status={getKPIStatus(30, 26)}
          format="time"
          icon={<Target className="h-4 w-4" />}
          loading={overview.isLoading}
        />
      </div>

      {/* Alertes et performances */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ✅ CORRECTION MAJEURE : Retards en cours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Retards en cours</span>
            </CardTitle>
            <CardDescription>
              Préparateurs actuellement en retard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-orange-600">
                    {currentLateCount}
                  </span>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700">
                    En retard
                  </Badge>
                </div>
                
                {currentLateCount > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {currentLateCount} employé(s) en retard sur {totalScheduled} planifié(s)
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Voir détails
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <p className="text-sm text-gray-600">
                      ✅ Aucun retard signalé
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Préparations actives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span>Préparations actives</span>
            </CardTitle>
            <CardDescription>
              Véhicules en cours de préparation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600">
                    {overview.data?.stats?.ongoingPreparations || 0}
                  </span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    En cours
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    • Terminées: {overview.data?.stats?.todayPreparations || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    • En retard: 0
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance par agence */}
        <Card>
          <CardHeader>
            <CardTitle>Performance par agence</CardTitle>
            <CardDescription>
              Taux de ponctualité par site
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <div className="space-y-3">
                {/* TODO: Mapper les vraies données d'agences */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">SIXT Antony</span>
                  <span className="text-sm text-red-600">0.0%</span>
                  <Badge variant="outline" className="text-xs">À améliorer</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">SIXT Massy TGV</span>
                  <span className="text-sm text-red-600">0.0%</span>
                  <Badge variant="outline" className="text-xs">À améliorer</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">SIXT Melun</span>
                  <span className="text-sm text-red-600">0.0%</span>
                  <Badge variant="outline" className="text-xs">À améliorer</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section graphiques et alertes détaillées */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Graphique timeline placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution quotidienne</CardTitle>
            <CardDescription>
              Pointages et préparations sur 7 jours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              Graphique à venir
            </div>
          </CardContent>
        </Card>

        {/* Alertes récentes */}
        <Card>
          <CardHeader>
            <CardTitle>Alertes récentes</CardTitle>
            <CardDescription>
              Dernières notifications importantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.isLoading ? (
              <LoadingSpinner size="sm" />
            ) : alerts.data && alerts.data.length > 0 ? (
              <div className="space-y-3">
                {alerts.data.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50"
                  >
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {alert.title}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-gray-500">
                <CheckCircle className="h-4 w-4" />
                <p className="text-sm">Aucune alerte récente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}