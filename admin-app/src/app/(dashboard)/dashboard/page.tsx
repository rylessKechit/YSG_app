// src/app/(dashboard)/dashboard/page.tsx
'use client&apos;;

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
    period: &apos;today'
  });

  // Récupération des données en temps réel
  const { kpis, overview, charts, alerts, isLoading, isError, error, refetchAll } = useDashboardData(filters);
  const criticalAlerts = useDashboardAlerts({ priority: 'critical', limit: 5 });

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
    if (ratio >= 1) return &apos;success';
    if (ratio >= 0.8) return &apos;warning';
    return &apos;error';
  };

  const calculateTrend = (current: number, previous: number) => {
    if (!previous) return undefined;
    const change = ((current - previous) / previous) * 100;
    return {
      value: change,
      isPositive: change >= 0,
      label: &apos;vs hier'
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-600">
            Vue d&apos;ensemble en temps réel • Dernière mise à jour: {' '}
            {kpis.data?.timestamp ? new Date(kpis.data.timestamp).toLocaleTimeString('fr-FR') : '--:--'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={refetchAll}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? &apos;Actualisation...' : 'Actualiser'}
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
          value={kpis.data?.preparateurs?.present || 0}
          subtitle={`sur ${kpis.data?.preparateurs?.total || 0} total`}`
          trend={calculateTrend(
            kpis.data?.preparateurs?.present || 0,
            24 // TODO: Récupérer la valeur d'hier depuis l'API
          )}
          target={{
            value: kpis.data?.preparateurs?.total || 0,
            label: &apos;Présence'
          }}
          status={getKPIStatus(
            kpis.data?.preparateurs?.present || 0,
            kpis.data?.preparateurs?.total || 1
          )}
          format="number"
          icon={<Users className="h-4 w-4" />}
          loading={kpis.isLoading}
        />

        <KPICard
          title="Ponctualité"
          value={kpis.data?.ponctualite?.global || 0}
          subtitle="Taux global aujourd&apos;hui"
          trend={calculateTrend(
            kpis.data?.ponctualite?.global || 0,
            94 // TODO: Récupérer la valeur d'hier'
          )}
          target={{
            value: kpis.data?.objectifs?.ponctualiteMin || 95,
            label: &apos;Objectif'
          }}
          status={getKPIStatus(
            kpis.data?.ponctualite?.global || 0,
            kpis.data?.objectifs?.ponctualiteMin || 95
          )}
          format="percentage"
          icon={<Clock className="h-4 w-4" />}
          loading={kpis.isLoading}
        />

        <KPICard
          title="Préparations"
          value={kpis.data?.preparations?.aujourdhui || 0}
          subtitle="Véhicules traités aujourd&apos;hui"
          trend={calculateTrend(
            kpis.data?.preparations?.aujourdhui || 0,
            42 // TODO: Récupérer la valeur d'hier'
          )}
          target={{
            value: kpis.data?.objectifs?.preparationsJour || 50,
            label: &apos;Objectif jour'
          }}
          status={getKPIStatus(
            kpis.data?.preparations?.aujourdhui || 0,
            kpis.data?.objectifs?.preparationsJour || 50
          )}
          format="number"
          icon={<Activity className="h-4 w-4" />}
          loading={kpis.isLoading}
        />

        <KPICard
          title="Temps moyen"
          value={kpis.data?.preparations?.tempsMoyen || 0}
          subtitle="Minutes par véhicule"
          trend={calculateTrend(
            kpis.data?.preparations?.tempsMoyen || 0,
            25 // TODO: Récupérer la valeur d'hier'
          )}
          target={{
            value: kpis.data?.objectifs?.tempsMoyenMax || 30,
            label: &apos;Max souhaité'
          }}
          status={getKPIStatus(
            kpis.data?.objectifs?.tempsMoyenMax || 30,
            kpis.data?.preparations?.tempsMoyen || 0
          )}
          format="time"
          icon={<Target className="h-4 w-4" />}
          loading={kpis.isLoading}
        />
      </div>

      {/* Alertes et performances */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Retards en cours */}
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
            {kpis.isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-orange-600">
                    {kpis.data?.preparateurs?.late || 0}
                  </span>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700">
                    En retard
                  </Badge>
                </div>
                
                {(kpis.data?.preparateurs?.late ?? 0) > 0 ? (
                  <Button variant="outline" size="sm" className="w-full">
                    Voir les détails
                  </Button>
                ) : (
                  <div className="flex items-center text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aucun retard signalé
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Préparations en cours */}
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
                
                <div className="text-sm text-gray-600">
                  <div>• Terminées: {kpis.data?.preparations?.terminees || 0}</div>
                  <div>• En retard: {kpis.data?.preparations?.enRetard || 0}</div>
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
            {kpis.isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <div className="space-y-3">
                {kpis.data?.ponctualite?.parAgence?.slice(0, 3).map((agence) => (
                  <div key={agence.agencyId} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{agence.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{agence.rate.toFixed(1)}%</span>
                      <Badge 
                        variant="outline" 
                        className={
                          agence.rate >= 95 
                            ? "bg-green-50 text-green-700" 
                            : agence.rate >= 85 
                              ? "bg-orange-50 text-orange-700"
                              : "bg-red-50 text-red-700"
                        }
                      >
                        {agence.rate >= 95 ? &apos;Excellent&apos; : agence.rate >= 85 ? &apos;Correct&apos; : &apos;À améliorer'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Graphiques timeline */}
      {charts.data?.timeline && (
        <Card>
          <CardHeader>
            <CardTitle>Évolution des préparations</CardTitle>
            <CardDescription>
              Nombre de véhicules préparés par jour (7 derniers jours)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
              <div className="text-center text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Graphique en cours d&apos;implémentation</p>
                <p className="text-sm">Données disponibles: {charts.data.timeline.length} points</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Raccourcis vers les fonctions les plus utilisées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col">
              <Users className="h-6 w-6 mb-2" />
              Gestion utilisateurs
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Clock className="h-6 w-6 mb-2" />
              Plannings
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Activity className="h-6 w-6 mb-2" />
              Rapports
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Target className="h-6 w-6 mb-2" />
              Paramètres
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}