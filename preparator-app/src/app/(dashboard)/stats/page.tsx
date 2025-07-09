// app/(dashboard)/stats/page.tsx
// ✅ Page des statistiques complète

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  Target, 
  Car,
  BarChart3,
  Zap,
  RefreshCw,
  Filter
} from 'lucide-react';

import { useStats } from '@/hooks/useStats';
import { usePreparationStore } from '@/lib/stores/preparation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { StatsCard } from '@/components/stats/StatsCard';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { StatsChart } from '@/components/stats/StatsChart';

const PERIOD_LABELS = {
  'today': "Aujourd'hui",
  'week': 'Cette semaine',
  'month': 'Ce mois-ci'
};

export default function StatsPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Hooks
  const { userAgencies, getUserAgencies } = usePreparationStore();
  const {
    stats,
    isLoading,
    error,
    currentFilters,
    loadStats,
    refresh,
    setPeriod,
    setAgency,
    clearError,
    isEmpty,
    lastUpdated
  } = useStats({
    autoLoad: true,
    defaultPeriod: 'today'
  });

  // Charger les agences au montage
  useEffect(() => {
    const loadAgencies = async () => {
      try {
        await getUserAgencies();
      } catch (error) {
        console.error('Erreur chargement agences:', error);
      }
    };

    loadAgencies();
  }, [getUserAgencies]);

  // Gestion des erreurs
  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur",
        description: error,
        variant: "destructive"
      });
      clearError();
    }
  }, [error, toast, clearError]);

  // Gestionnaires d'événements
  const handleBack = () => {
    router.push('/preparations');
  };

  const handleRefresh = async () => {
    try {
      await refresh();
      toast({
        title: "Actualisé",
        description: "Les statistiques ont été mises à jour."
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les statistiques.",
        variant: "destructive"
      });
    }
  };

  const handlePeriodChange = async (period: 'today' | 'week' | 'month') => {
    await setPeriod(period);
  };

  const handleAgencyChange = async (agencyId: string) => {
    await setAgency(agencyId === 'all' ? undefined : agencyId);
  };

  // Calculs pour l'affichage
  const formatTime = (minutes: number) => {
    if (!minutes || minutes === 0) return '0min';
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const formatNumber = (value: number, decimals: number = 1) => {
    return Number(value).toFixed(decimals).replace(/\.?0+$/, '');
  };

  const getPerformanceVariant = (onTimeRate: number) => {
    if (onTimeRate >= 90) return 'success';
    if (onTimeRate >= 70) return 'warning';
    return 'danger';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Mes statistiques
                </h1>
                <p className="text-sm text-gray-600">
                  {PERIOD_LABELS[currentFilters.period]}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <div className="px-4 pb-3 border-t border-gray-100">
          <div className="flex space-x-3">
            {/* Période */}
            <Select
              value={currentFilters.period}
              onValueChange={handlePeriodChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois-ci</SelectItem>
              </SelectContent>
            </Select>

            {/* Agence */}
            <Select
              value={currentFilters.agencyId || 'all'}
              onValueChange={handleAgencyChange}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Toutes les agences" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les agences</SelectItem>
                {userAgencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name} ({agency.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-20">
        {/* État vide */}
        {isEmpty && !isLoading && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune donnée disponible
              </h3>
              <p className="text-gray-600">
                Aucune préparation trouvée pour la période sélectionnée.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Statistiques principales */}
        {stats && (
          <>
            {/* Métriques principales */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatsCard
                title="Total préparations"
                value={stats.totalPreparations}
                icon={<Car className="w-5 h-5 text-blue-600" />}
                subtitle={`Sur ${PERIOD_LABELS[currentFilters.period].toLowerCase()}`}
                isLoading={isLoading}
              />
              
              <StatsCard
                title="Temps moyen"
                value={formatTime(stats.averageTime)}
                icon={<Clock className="w-5 h-5 text-purple-600" />}
                subtitle="Par préparation"
                isLoading={isLoading}
              />
              
              <StatsCard
                title="Taux de réussite"
                value={`${formatNumber(stats.onTimeRate)}%`}
                icon={<Target className="w-5 h-5 text-green-600" />}
                subtitle="Préparations dans les temps"
                variant={getPerformanceVariant(stats.onTimeRate)}
                isLoading={isLoading}
              />
              
              <StatsCard
                title="Meilleur temps"
                value={formatTime(stats.bestTime)}
                icon={<Zap className="w-5 h-5 text-orange-600" />}
                subtitle="Record personnel"
                isLoading={isLoading}
              />
            </div>

            {/* Répartition par type de véhicule */}
            {stats.vehicleTypeStats && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Car className="w-5 h-5" />
                    <span>Par type de véhicule</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Véhicules particuliers */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">🚗</span>
                        <div>
                          <p className="font-medium text-gray-900">Particuliers</p>
                          <p className="text-sm text-gray-600">
                            {stats.vehicleTypeStats.particulier.count} préparations
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatTime(stats.vehicleTypeStats.particulier.averageTime)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatNumber(stats.vehicleTypeStats.particulier.onTimeRate)}% à temps
                        </p>
                      </div>
                    </div>

                    {/* Véhicules utilitaires */}
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">🚐</span>
                        <div>
                          <p className="font-medium text-gray-900">Utilitaires</p>
                          <p className="text-sm text-gray-600">
                            {stats.vehicleTypeStats.utilitaire.count} préparations
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatTime(stats.vehicleTypeStats.utilitaire.averageTime)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatNumber(stats.vehicleTypeStats.utilitaire.onTimeRate)}% à temps
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Évolution hebdomadaire */}
            {stats.weeklyStats && stats.weeklyStats.length > 0 && (
              <StatsChart
                title="Évolution sur la période"
                data={stats.weeklyStats}
                isLoading={isLoading}
              />
            )}

            {/* Performance par étape */}
            {stats.stepStats && stats.stepStats.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Performance par étape</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.stepStats.map((step, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{step.icon}</span>
                          <div>
                            <p className="font-medium text-gray-900">{step.stepLabel}</p>
                            <p className="text-sm text-gray-600">
                              {formatNumber(step.completionRate)}% de réussite
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatTime(step.averageTime)}
                          </p>
                          <p className="text-xs text-gray-500">Temps moyen</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informations de mise à jour */}
            {lastUpdated && (
              <div className="text-center text-xs text-gray-500 mt-6">
                Dernière mise à jour : {lastUpdated.toLocaleTimeString('fr-FR')}
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation Bottom */}
      <BottomNavigation />
    </div>
  );
}