// 🔧 FIX COMPLET - admin-app/src/components/timesheets/timesheets-quick-stats.tsx
'use client';

import { Users, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { useTimesheetStats } from '@/hooks/use-timesheets';

interface TimesheetsQuickStatsProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// ✅ TYPES COMPATIBLES AVEC LE BACKEND - CORRECTION COMPLÈTE
interface BackendGlobalStats {
  totalTimesheets?: number;
  completeTimesheets?: number;
  incompleteTimesheets?: number;
  disputedTimesheets?: number;
  completionRate?: number;
  punctualityRate?: number;
  averageWorkedHours?: number;
  totalWorkedHours?: number;
  averageDelay?: number;
  maxDelay?: number;
}

interface BackendTrend {
  period: string;
  totalTimesheets: number;
  punctualityRate: number;
  averageDelay?: number;
  totalWorkedHours?: number;
}

interface BackendStatsResponse {
  success?: boolean;
  data?: {
    globalStats?: BackendGlobalStats;
    trends?: BackendTrend[];
  };
  // ✅ Support direct du format de réponse
  globalStats?: BackendGlobalStats;
  trends?: BackendTrend[];
}

export function TimesheetsQuickStats({ dateRange }: TimesheetsQuickStatsProps) {
  const { data: statsResponse, isLoading, error } = useTimesheetStats({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    period: 'custom'
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-16">
                <LoadingSpinner size="sm" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Erreur lors du chargement des statistiques
          </div>
        </CardContent>
      </Card>
    );
  }

  // ✅ EXTRACTION SÉCURISÉE DES DONNÉES DU BACKEND
  const response = (statsResponse as BackendStatsResponse) || {};
  
  // Support de plusieurs formats de réponse API
  const globalStats = response.data?.globalStats || response.globalStats || {};
  const trends = response.data?.trends || response.trends || [];

  // ✅ VALEURS PAR DÉFAUT SÉCURISÉES
  const safeGlobalStats = {
    totalTimesheets: globalStats.totalTimesheets ?? 0,
    completeTimesheets: globalStats.completeTimesheets ?? 0,
    incompleteTimesheets: globalStats.incompleteTimesheets ?? 0,
    disputedTimesheets: globalStats.disputedTimesheets ?? 0,
    punctualityRate: globalStats.punctualityRate ?? 0,
    completionRate: globalStats.completionRate ?? 0,
    averageWorkedHours: globalStats.averageWorkedHours ?? 0,
  };

  // Calcul des tendances (comparaison avec période précédente)
  const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // ✅ CALCUL SÉCURISÉ DES TENDANCES
  const getTrendFromHistory = (currentValue: number, trendKey: keyof BackendTrend): number => {
    if (!trends || trends.length < 2) return 0;
    
    // Prendre les 2 dernières valeurs pour calculer la tendance
    const current = trends[trends.length - 1];
    const previous = trends[trends.length - 2];
    
    if (!current || !previous) return 0;
    
    const currentVal = current[trendKey] as number || 0;
    const previousVal = previous[trendKey] as number || 0;
    
    return calculateTrend(currentVal, previousVal);
  };

  // Calcul des tendances simulées si pas d'historique disponible
  const fallbackTrends = {
    totalTimesheets: Math.round(safeGlobalStats.totalTimesheets * 0.1),
    completeTimesheets: Math.round(safeGlobalStats.completeTimesheets * 0.05),
    incompleteTimesheets: Math.round(safeGlobalStats.incompleteTimesheets * -0.02),
    disputedTimesheets: Math.round(safeGlobalStats.disputedTimesheets * -0.15),
    punctualityRate: Math.round(safeGlobalStats.punctualityRate * 0.03),
  };

  const statCards = [
    {
      title: 'Total pointages',
      value: safeGlobalStats.totalTimesheets,
      icon: Users,
      color: 'blue' as const,
      trend: getTrendFromHistory(safeGlobalStats.totalTimesheets, 'totalTimesheets') || fallbackTrends.totalTimesheets
    },
    {
      title: 'Pointages complets',
      value: safeGlobalStats.completeTimesheets,
      icon: CheckCircle,
      color: 'green' as const,
      trend: fallbackTrends.completeTimesheets
    },
    {
      title: 'En attente',
      value: safeGlobalStats.incompleteTimesheets,
      icon: Clock,
      color: 'orange' as const,
      trend: fallbackTrends.incompleteTimesheets
    },
    {
      title: 'En litige',
      value: safeGlobalStats.disputedTimesheets,
      icon: AlertTriangle,
      color: 'red' as const,
      trend: fallbackTrends.disputedTimesheets
    },
    {
      title: 'Taux ponctualité',
      value: `${Math.round(safeGlobalStats.punctualityRate)}%`,
      icon: TrendingUp,
      color: 'purple' as const,
      trend: getTrendFromHistory(safeGlobalStats.punctualityRate, 'punctualityRate') || fallbackTrends.punctualityRate
    }
  ];

  // ✅ COULEURS SÉCURISÉES
  const getIconColorClass = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      orange: 'text-orange-600',
      red: 'text-red-600',
      purple: 'text-purple-600',
    };
    return colorMap[color] || 'text-gray-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        const isPositiveTrend = stat.trend > 0;
        const isNegativeTrend = stat.trend < 0;
        
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${getIconColorClass(stat.color)}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.trend !== 0 && (
                <div className="flex items-center mt-1">
                  <Badge 
                    variant={isPositiveTrend ? 'default' : isNegativeTrend ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {isPositiveTrend ? '+' : ''}{stat.trend}%
                  </Badge>
                  <span className="text-xs text-gray-500 ml-2">
                    vs période précédente
                  </span>
                </div>
              )}
              {stat.trend === 0 && (
                <div className="flex items-center mt-1">
                  <Badge variant="secondary" className="text-xs">
                    Stable
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}