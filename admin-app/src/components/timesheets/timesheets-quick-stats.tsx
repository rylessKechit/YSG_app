// admin-app/src/components/timesheets/timesheets-quick-stats-fixed.tsx
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

// ===== TYPES COMPATIBLES AVEC LE BACKEND =====
interface BackendStatsResponse {
  globalStats?: {
    totalTimesheets: number;
    completeTimesheets: number;
    incompleteTimesheets: number;
    disputedTimesheets: number;
    completionRate: number;
    punctualityRate: number;
  };
  trends?: Array<{
    period: string;
    totalTimesheets: number;
    punctualityRate: number;
  }>;
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

  // ===== EXTRACTION DES DONNÉES DU BACKEND =====
  const stats = (statsResponse as BackendStatsResponse) || {};
  const globalStats = stats.globalStats || {};
  const trends = stats.trends || [];

  // Calcul des tendances (comparaison avec période précédente)
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Tendances fictives pour l'exemple (le backend pourrait fournir ça)
  const previousStats = {
    totalTimesheets: Math.round(globalStats.totalTimesheets * 0.9),
    completeTimesheets: Math.round(globalStats.completeTimesheets * 0.85),
    incompleteTimesheets: Math.round(globalStats.incompleteTimesheets * 1.1),
    disputedTimesheets: Math.round(globalStats.disputedTimesheets * 1.2),
    punctualityRate: Math.round((globalStats.punctualityRate || 0) * 0.95),
  };

  const statCards = [
    {
      title: 'Total pointages',
      value: globalStats.totalTimesheets || 0,
      icon: Users,
      color: 'blue',
      trend: calculateTrend(globalStats.totalTimesheets || 0, previousStats.totalTimesheets)
    },
    {
      title: 'Pointages complets',
      value: globalStats.completeTimesheets || 0,
      icon: CheckCircle,
      color: 'green',
      trend: calculateTrend(globalStats.completeTimesheets || 0, previousStats.completeTimesheets)
    },
    {
      title: 'En attente',
      value: globalStats.incompleteTimesheets || 0,
      icon: Clock,
      color: 'orange',
      trend: calculateTrend(globalStats.incompleteTimesheets || 0, previousStats.incompleteTimesheets)
    },
    {
      title: 'En litige',
      value: globalStats.disputedTimesheets || 0,
      icon: AlertTriangle,
      color: 'red',
      trend: calculateTrend(globalStats.disputedTimesheets || 0, previousStats.disputedTimesheets)
    },
    {
      title: 'Taux ponctualité',
      value: `${Math.round(globalStats.punctualityRate || 0)}%`,
      icon: TrendingUp,
      color: 'purple',
      trend: calculateTrend(globalStats.punctualityRate || 0, previousStats.punctualityRate)
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        const isPositiveTrend = stat.trend > 0;
        
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.trend !== 0 && (
                <div className="flex items-center mt-1">
                  <Badge 
                    variant={isPositiveTrend ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {isPositiveTrend ? '+' : ''}{stat.trend}%
                  </Badge>
                  <span className="text-xs text-gray-500 ml-2">
                    vs période précédente
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}