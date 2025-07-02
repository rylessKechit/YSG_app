'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Timer,
  Target
} from 'lucide-react';

import { TimesheetGlobalStats, ComparisonSummary } from '@/types/timesheet';
import { formatDuration } from '@/lib/utils/timesheet-utils';

interface TimesheetStatsProps {
  stats: TimesheetGlobalStats | ComparisonSummary;
  type?: 'global' | 'comparison';
  isLoading?: boolean;
}

export function TimesheetStats({ 
  stats, 
  type = 'global',
  isLoading = false 
}: TimesheetStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (type === 'comparison') {
    const comparisonStats = stats as ComparisonSummary;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total pointages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comparisonStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Comparaisons analysées
            </p>
          </CardContent>
        </Card>

        {/* Ponctualité */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ponctualité</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {comparisonStats.punctualityRate}%
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={comparisonStats.punctualityRate} className="flex-1" />
              <span className="text-xs text-muted-foreground">
                {comparisonStats.onTimeCount}/{comparisonStats.total}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Retards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retards</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {comparisonStats.lateCount}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                Retard moyen: {comparisonStats.averageDelay}min
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Manquants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manquants</CardTitle>
            <X className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {comparisonStats.missingCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Pointages non effectués
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Stats globales
  const globalStats = stats as TimesheetGlobalStats;
  
  const getTrendIcon = (current: number, target: number) => {
    if (current > target) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (current < target) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total pointages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pointages</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.totalTimesheets}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {globalStats.completeTimesheets} complets
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Taux de finalisation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalisation</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {globalStats.completionRate}%
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={globalStats.completionRate} className="flex-1" />
              <span className="text-xs text-muted-foreground">
                {globalStats.completeTimesheets}/{globalStats.totalTimesheets}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Ponctualité */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ponctualité</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {globalStats.punctualityRate}%
            </div>
            <div className="flex items-center gap-2 mt-1">
              {getTrendIcon(globalStats.punctualityRate, 90)}
              <span className="text-xs text-muted-foreground">
                Objectif: 90%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Temps moyen travaillé */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps moyen</CardTitle>
            <Timer className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {globalStats.averageWorkedHours.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {globalStats.totalWorkedHours.toFixed(0)}h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Détails supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Retards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Analyse des retards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Retard moyen</span>
              <Badge variant="outline">
                {globalStats.averageDelay}min
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Retard maximum</span>
              <Badge variant="destructive">
                {globalStats.maxDelay}min
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Statuts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              Répartition statuts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Complets</span>
              <div className="flex items-center gap-2">
                <div className="w-12 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${globalStats.completionRate}%` }}
                  />
                </div>
                <span className="text-xs">{globalStats.completeTimesheets}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Incomplets</span>
              <div className="flex items-center gap-2">
                <div className="w-12 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full" 
                    style={{ width: `${100 - globalStats.completionRate}%` }}
                  />
                </div>
                <span className="text-xs">{globalStats.incompleteTimesheets}</span>
              </div>
            </div>
            
            {globalStats.disputedTimesheets > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">En litige</span>
                <Badge variant="destructive" className="text-xs">
                  {globalStats.disputedTimesheets}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Productivité */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Productivité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Heures totales</span>
              <span className="font-medium">
                {formatDuration(globalStats.totalWorkedHours * 60)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Moyenne/pointage</span>
              <span className="font-medium">
                {formatDuration(globalStats.averageWorkedHours * 60)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Efficacité</span>
              <Badge variant={globalStats.punctualityRate >= 90 ? 'default' : 'secondary'}>
                {globalStats.punctualityRate >= 90 ? 'Excellente' : 
                 globalStats.punctualityRate >= 75 ? 'Bonne' : 'À améliorer'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}