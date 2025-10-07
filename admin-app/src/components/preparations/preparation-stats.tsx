// admin-app/src/components/preparations/preparation-stats.tsx
'use client';

import React from 'react';
import { 
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Users,
  Car
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/common/loading-spinner';

// Import des types depuis le fichier preparation.ts
import type { PreparationStats, PreparationStatusStats } from '@/types/preparation';

// Interface des props - complètement séparée pour éviter les conflits
interface StatsCardsProps {
  stats?: PreparationStats | null | undefined;
  statusStats?: PreparationStatusStats | undefined;
  isLoading?: boolean;
}

// Interface pour les cartes individuelles
interface StatCardConfig {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: 'default' | 'success' | 'warning' | 'danger';
  progress?: number;
}

// Utilitaires de formatage
function formatDuration(minutes?: number | null): string {
  if (!minutes || minutes === 0) return '0 min';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}min`;
  }
}

function formatPercentage(value?: number | null): string {
  if (!value && value !== 0) return '0%';
  return `${Math.round(value)}%`;
}

function getPercentageColor(percentage: number): 'success' | 'warning' | 'danger' | 'default' {
  if (percentage >= 80) return 'success';
  if (percentage >= 60) return 'warning';
  if (percentage >= 40) return 'default';
  return 'danger';
}

// Fonction pour extraire les statistiques de statut
function getStatusCounts(stats?: PreparationStats | null, statusStats?: PreparationStatusStats): {
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
} {
  // Utilise statusStats en priorité
  if (statusStats) {
    return {
      pending: statusStats.pending || 0,
      inProgress: statusStats.inProgress || 0,
      completed: statusStats.completed || 0,
      cancelled: statusStats.cancelled || 0
    };
  }

  // Fallback vers stats.byStatus
  if (stats?.byStatus) {
    return {
      pending: stats.byStatus.pending || 0,
      inProgress: stats.byStatus.inProgress || 0,
      completed: stats.byStatus.completed || 0,
      cancelled: stats.byStatus.cancelled || 0
    };
  }

  // Fallback vers les propriétés directes
  return {
    pending: stats?.pending || 0,
    inProgress: stats?.inProgress || 0,
    completed: stats?.completed || 0,
    cancelled: stats?.cancelled || 0
  };
}

// Composant principal
export function PreparationStatsCards({ stats, statusStats, isLoading }: StatsCardsProps) {
  // État de chargement
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardTitle>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-1"></div>
              <div className="h-3 bg-muted rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Pas de données
  if (!stats && !statusStats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="opacity-60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {['Total', 'Temps moyen', 'Ponctualité', 'Complétées'][i]}
              </CardTitle>
              <div className="h-4 w-4 rounded bg-muted"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">-</div>
              <p className="text-xs text-muted-foreground">Aucune donnée</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Extraction sécurisée des données
  const statusCounts = getStatusCounts(stats, statusStats);
  const totalPreparations = stats?.totalPreparations || stats?.total || 0;
  const averageTime = stats?.averageTime || 0;
  const onTimeRate = stats?.onTimeRate || 0;
  const completionRate = stats?.completionRate || 0;

  // Configuration des cartes de statistiques - SEULEMENT 4 CARTES
  const statCards: StatCardConfig[] = [
    {
      title: 'Préparations du Mois',
      value: totalPreparations.toLocaleString(),
      description: 'Depuis le début du mois',
      icon: <Activity className="h-4 w-4" />,
      color: 'default'
    },
    {
      title: 'Préparations Aujourd\'hui',
      value: '0', // TODO: Récupérer depuis les vraies données
      description: 'Effectuées aujourd\'hui',
      icon: <Car className="h-4 w-4" />,
      color: 'default'
    },
    {
      title: 'Temps Moyen',
      value: formatDuration(averageTime),
      description: 'Par préparation',
      icon: <Clock className="h-4 w-4" />,
      color: averageTime <= 30 ? 'success' : averageTime <= 45 ? 'warning' : 'danger'
    },
    {
      title: 'Taux de Complétion',
      value: formatPercentage(completionRate),
      description: 'Préparations terminées',
      icon: <CheckCircle className="h-4 w-4" />,
      color: getPercentageColor(completionRate),
      progress: completionRate
    }
  ];

  return (
    <div className="space-y-6">
      {/* Cartes principales - SEULEMENT 4 CARTES */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`
                ${card.color === 'success' ? 'text-green-600' : ''}
                ${card.color === 'warning' ? 'text-yellow-600' : ''}
                ${card.color === 'danger' ? 'text-red-600' : ''}
                ${card.color === 'default' ? 'text-muted-foreground' : ''}
              `}>
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.description && (
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              )}
              
              {/* Barre de progression pour les pourcentages */}
              {card.progress !== undefined && (
                <div className="mt-2">
                  <Progress 
                    value={card.progress} 
                    className="h-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Export par défaut pour compatibilité
export default PreparationStatsCards;