// admin-app/src/app/(dashboard)/preparations/components/preparation-stats.tsx
'use client';

import { 
  Clock, 
  Target, 
  CheckCircle, 
  Activity,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/loading-spinner';

import type { 
  PreparationGlobalStats, 
  PreparationStatusStats 
} from '@/types/preparation';
import { formatDuration } from '@/types/preparation';

interface PreparationStatsProps {
  stats: PreparationGlobalStats;
  statusStats: PreparationStatusStats;
  isLoading?: boolean;
}

export function PreparationStatsCards({
  stats,
  statusStats,
  isLoading = false
}: PreparationStatsProps) {

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <LoadingSpinner />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceIcon = (rate: number) => {
    return rate >= 70 ? TrendingUp : TrendingDown;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Temps moyen */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Temps moyen</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatDuration(stats.averageTime)}
          </div>
          <div className="text-xs text-muted-foreground">
            {stats.totalPreparations} préparations
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <Progress 
                value={Math.min((stats.averageTime / 45) * 100, 100)} 
                className="flex-1 h-2"
              />
              <span className="text-xs text-muted-foreground">
                {Math.round(Math.min((stats.averageTime / 45) * 100, 100))}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Objectif: 30min
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Taux de ponctualité */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ponctualité</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">
              {stats.onTimeRate}%
            </div>
            <div className={getPerformanceColor(stats.onTimeRate)}>
              {(() => {
                const Icon = getPerformanceIcon(stats.onTimeRate);
                return <Icon className="h-4 w-4" />;
              })()}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Respect des délais
          </div>
          <div className="mt-2">
            <Progress 
              value={stats.onTimeRate} 
              className="h-2"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Objectif: 85%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Taux de complétion */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Complétion</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">
              {stats.completionRate}%
            </div>
            <div className={getPerformanceColor(stats.completionRate)}>
              {(() => {
                const Icon = getPerformanceIcon(stats.completionRate);
                return <Icon className="h-4 w-4" />;
              })()}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Préparations terminées
          </div>
          <div className="mt-2">
            <Progress 
              value={stats.completionRate} 
              className="h-2"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {statusStats.completed} sur {stats.totalPreparations}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activité */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Activité</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.totalPreparations}
          </div>
          <div className="text-xs text-muted-foreground">
            Total préparations
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>En cours</span>
              <Badge variant="outline" className="text-xs">
                {statusStats.inProgress || 0}
              </Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span>En attente</span>
              <Badge variant="outline" className="text-xs">
                {statusStats.pending || 0}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}