// admin-app/src/components/timesheets/timesheets-analytics-view.tsx
'use client';

import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Calendar,
  BarChart3,
  PieChart,
  Target,
  Award,
  Building,
  AlertTriangle,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
  TrendingDown,
  Filter,
  Download,
  RefreshCw,
  Eye,
  MoreHorizontal
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import { useTimesheetStats, usePunctualityReport } from '@/hooks/use-timesheets';
import { format, subDays, subMonths, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

// ===== TYPES BACKEND EXACTS =====
interface BackendGlobalStats {
  totalTimesheets: number;
  completeTimesheets: number;
  incompleteTimesheets: number;
  disputedTimesheets: number;
  completionRate: number;
  averageWorkedHours: number;
  totalWorkedHours: number;
  punctualityRate: number;
  averageDelay: number;
  maxDelay: number;
}

interface BackendTrend {
  period: string;
  totalTimesheets: number;
  punctualityRate: number;
  averageDelay: number;
  totalWorkedHours: number;
}

interface BackendUserStat {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  totalTimesheets: number;
  punctualityRate: number;
  averageDelay: number;
  totalWorkedHours: number;
}

interface BackendAgencyStat {
  agency: {
    _id: string;
    name: string;
    code?: string;
  };
  totalTimesheets: number;
  punctualityRate: number;
  averageDelay: number;
  totalWorkedHours: number;
}

interface BackendAnomaly {
  type: 'consistent_delay' | 'round_times' | 'no_breaks' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  description: string;
  count: number;
  details?: any;
}

interface BackendStatsData {
  globalStats: BackendGlobalStats;
  trends: BackendTrend[];
  userStats: {
    topPerformers: BackendUserStat[];
    needsImprovement: BackendUserStat[];
  };
  agencyStats: BackendAgencyStat[];
  anomalies: BackendAnomaly[];
  period: {
    type: string;
    start: string;
    end: string;
    groupBy: string;
  };
}

interface BackendPunctualityCategory {
  category: string;
  count: number;
  percentage: number;
  averageDelay: number;
  maxDelay: number;
  uniqueUsers: number;
  uniqueAgencies: number;
}

interface BackendPunctualityReportData {
  summary: {
    totalTimesheets: number;
    categories: BackendPunctualityCategory[];
    overall: {
      punctualityRate: number;
      averageDelay: number;
    };
  };
  details: Array<{
    _id: string;
    count: number;
    averageDelay: number;
    maxDelay: number;
    users: BackendUserStat['user'][];
    agencies: BackendAgencyStat['agency'][];
  }>;
  period: {
    start: string;
    end: string;
  };
}

interface TimesheetsAnalyticsViewProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  onDateRangeChange: (startDate: string, endDate: string) => void;
}

export function TimesheetsAnalyticsView({ dateRange, onDateRangeChange }: TimesheetsAnalyticsViewProps) {
  // ===== ÉTAT LOCAL =====
  const [analyticsFilters, setAnalyticsFilters] = useState({
    ...dateRange,
    groupBy: 'day' as 'day' | 'week' | 'month',
    metric: 'punctuality' as string,
    period: 'custom' as string
  });

  const [activeView, setActiveView] = useState<'overview' | 'trends' | 'users' | 'agencies' | 'anomalies'>('overview');

  // ===== HOOKS DE DONNÉES =====
  const { 
    data: statsResponse, 
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats
  } = useTimesheetStats(analyticsFilters);

  const { 
    data: punctualityResponse, 
    isLoading: isLoadingPunctuality,
    error: punctualityError,
    refetch: refetchPunctuality
  } = usePunctualityReport(analyticsFilters);

  // ===== EXTRACTION DES DONNÉES DU BACKEND =====
  const statsData = statsResponse as BackendStatsData | undefined;
  const punctualityData = punctualityResponse as BackendPunctualityReportData | undefined;

  // ===== MÉTRIQUES CALCULÉES =====
  const metrics = useMemo(() => {
    if (!statsData?.globalStats) return null;

    const { globalStats } = statsData;
    
    return {
      totalTimesheets: globalStats.totalTimesheets,
      punctualityRate: Math.round(globalStats.punctualityRate * 10) / 10,
      averageDelay: Math.round(globalStats.averageDelay * 10) / 10,
      completionRate: Math.round(globalStats.completionRate * 10) / 10,
      totalWorkedHours: Math.round(globalStats.totalWorkedHours * 10) / 10,
      averageWorkedHours: Math.round(globalStats.averageWorkedHours * 10) / 10,
      completeTimesheets: globalStats.completeTimesheets,
      incompleteTimesheets: globalStats.incompleteTimesheets,
      disputedTimesheets: globalStats.disputedTimesheets,
      maxDelay: Math.round(globalStats.maxDelay * 10) / 10
    };
  }, [statsData]);

  // ===== HANDLERS =====
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newDateRange = {
      ...dateRange,
      [field]: value
    };
    onDateRangeChange(newDateRange.startDate, newDateRange.endDate);
    setAnalyticsFilters(prev => ({ ...prev, ...newDateRange }));
  };

  const handlePeriodPreset = (preset: string) => {
    const now = new Date();
    let startDate: Date;
    
    switch (preset) {
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subMonths(now, 1);
        break;
      case 'quarter':
        startDate = subMonths(now, 3);
        break;
      default:
        startDate = subDays(now, 7);
    }
    
    const newRange = {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(now, 'yyyy-MM-dd')
    };
    
    onDateRangeChange(newRange.startDate, newRange.endDate);
    setAnalyticsFilters(prev => ({ ...prev, ...newRange }));
  };

  const handleRefresh = () => {
    refetchStats();
    refetchPunctuality();
  };

  // ===== COMPOSANTS DE MÉTRIQUES =====
  const MetricCard = ({ 
    title, 
    value, 
    unit = '', 
    trend, 
    icon: Icon, 
    color = 'blue',
    subtitle,
    details
  }: {
    title: string;
    value: number | string;
    unit?: string;
    trend?: number;
    icon: any;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
    subtitle?: string;
    details?: string;
  }) => {
    const colorClasses = {
      blue: 'text-blue-600 bg-blue-50',
      green: 'text-green-600 bg-green-50',
      red: 'text-red-600 bg-red-50',
      yellow: 'text-yellow-600 bg-yellow-50',
      purple: 'text-purple-600 bg-purple-50'
    };

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">
                  {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}{unit}
                </p>
                {trend !== undefined && trend !== 0 && (
                  <Badge variant={trend > 0 ? 'default' : 'destructive'} className="text-xs">
                    {trend > 0 ? '+' : ''}{trend}%
                  </Badge>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
              )}
              {details && (
                <p className="text-xs text-gray-400 mt-1">{details}</p>
              )}
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const TrendChart = ({ data }: { data?: BackendTrend[] }) => {
    if (!data || data.length === 0) return null;

    const maxValue = Math.max(...data.map(d => d.punctualityRate));
    
    return (
      <div className="space-y-3">
        {data.map((trend, index) => {
          const date = parseISO(trend.period);
          const dateLabel = isValid(date) ? format(date, 'dd MMM', { locale: fr }) : trend.period;
          const percentage = (trend.punctualityRate / maxValue) * 100;
          
          return (
            <div key={index} className="flex items-center gap-4">
              <div className="w-16 text-sm text-gray-600">
                {dateLabel}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">
                    {Math.round(trend.punctualityRate * 10) / 10}%
                  </span>
                  <span className="text-xs text-gray-500">
                    {trend.totalTimesheets} pointages
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const TopPerformersCard = ({ data }: { data?: BackendUserStat[] }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-600" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data && data.length > 0 ? (
            data.slice(0, 5).map((performer, index) => {
              const medalColors = ['bg-yellow-100 text-yellow-800', 'bg-gray-100 text-gray-800', 'bg-orange-100 text-orange-800'];
              const medalColor = index < 3 ? medalColors[index] : 'bg-blue-100 text-blue-800';
              
              return (
                <div key={performer.user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${medalColor}`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {performer.user.firstName} {performer.user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {performer.totalTimesheets} pointages
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-600">
                      {Math.round(performer.punctualityRate * 10) / 10}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.round(performer.totalWorkedHours)} h
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 text-center py-4">Aucune donnée disponible</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const AgencyStatsCard = ({ data }: { data?: BackendAgencyStat[] }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5 text-blue-600" />
          Performance par Agence
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data && data.length > 0 ? (
            data.map((agency) => (
              <div key={agency.agency._id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{agency.agency.name}</p>
                  <p className="text-xs text-gray-500">
                    {agency.agency.code && `${agency.agency.code} • `}
                    {agency.totalTimesheets} pointages
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${
                    agency.punctualityRate >= 90 ? 'text-green-600' :
                    agency.punctualityRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {Math.round(agency.punctualityRate * 10) / 10}%
                  </div>
                  <div className="text-xs text-gray-500">
                    Retard moy: {Math.round(agency.averageDelay)} min
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">Aucune donnée disponible</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const AnomaliesCard = ({ data }: { data?: BackendAnomaly[] }) => {
    const severityConfig = {
      low: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      medium: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      high: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
      critical: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Anomalies Détectées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data && data.length > 0 ? (
              data.slice(0, 10).map((anomaly, index) => {
                const config = severityConfig[anomaly.severity];
                const Icon = config.icon;
                
                return (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{anomaly.description}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-500">
                          {anomaly.count} occurrence{anomaly.count > 1 ? 's' : ''}
                        </span>
                        {anomaly.user && (
                          <span className="text-xs text-gray-500">
                            {anomaly.user.firstName} {anomaly.user.lastName}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {anomaly.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-green-600 font-medium">Aucune anomalie détectée</p>
                <p className="text-gray-500 text-sm">Tous les pointages semblent normaux</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const PunctualityCategoriesCard = ({ data }: { data?: BackendPunctualityReportData }) => {
    if (!data?.summary?.categories) return null;

    const categories = data.summary.categories;
    const total = categories.reduce((sum, cat) => sum + cat.count, 0);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-purple-600" />
            Répartition Ponctualité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((category, index) => {
              const percentage = total > 0 ? (category.count / total) * 100 : 0;
              const colorClass = 
                category.category === 'on_time' ? 'bg-green-500' :
                category.category === 'slight_delay' ? 'bg-yellow-500' :
                category.category === 'moderate_delay' ? 'bg-orange-500' : 'bg-red-500';

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {category.category.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-600">
                      {category.count} ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${colorClass}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                  {category.averageDelay > 0 && (
                    <p className="text-xs text-gray-500">
                      Retard moyen: {Math.round(category.averageDelay)} min
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ===== GESTION DES ÉTATS DE CHARGEMENT ET D'ERREUR =====
  if (isLoadingStats || isLoadingPunctuality) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner className="mr-2" />
        <span>Chargement des analyses...</span>
      </div>
    );
  }

  if (statsError && punctualityError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des données d'analyse. Veuillez réessayer.
          <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-2">
            <RefreshCw className="h-4 w-4 mr-1" />
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec filtres */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                Analyses Avancées
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Analyse détaillée des pointages et performances
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualiser
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Exporter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtres de période */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handlePeriodPreset('week')}
                className={analyticsFilters.period === 'week' ? 'bg-blue-50 border-blue-200' : ''}
              >
                7 derniers jours
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handlePeriodPreset('month')}
                className={analyticsFilters.period === 'month' ? 'bg-blue-50 border-blue-200' : ''}
              >
                30 derniers jours
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handlePeriodPreset('quarter')}
                className={analyticsFilters.period === 'quarter' ? 'bg-blue-50 border-blue-200' : ''}
              >
                3 derniers mois
              </Button>
            </div>
          </div>

          {/* Période personnalisée */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Date début</label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date fin</label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Grouper par</label>
              <Select 
                value={analyticsFilters.groupBy} 
                onValueChange={(value: 'day' | 'week' | 'month') => 
                  setAnalyticsFilters(prev => ({ ...prev, groupBy: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Jour</SelectItem>
                  <SelectItem value="week">Semaine</SelectItem>
                  <SelectItem value="month">Mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Vue</label>
              <Select 
                value={activeView} 
                onValueChange={(value: 'overview' | 'trends' | 'users' | 'agencies' | 'anomalies') => 
                  setActiveView(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Vue d'ensemble</SelectItem>
                  <SelectItem value="trends">Tendances</SelectItem>
                  <SelectItem value="users">Utilisateurs</SelectItem>
                  <SelectItem value="agencies">Agences</SelectItem>
                  <SelectItem value="anomalies">Anomalies</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métriques principales */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Pointages"
            value={metrics.totalTimesheets}
            icon={Activity}
            color="blue"
            subtitle={`Période: ${format(parseISO(dateRange.startDate), 'dd MMM', { locale: fr })} - ${format(parseISO(dateRange.endDate), 'dd MMM', { locale: fr })}`}
          />
          <MetricCard
            title="Taux de Ponctualité"
            value={metrics.punctualityRate}
            unit="%"
            icon={Target}
            color={metrics.punctualityRate >= 90 ? 'green' : metrics.punctualityRate >= 80 ? 'yellow' : 'red'}
            subtitle="Objectif: 90%"
          />
          <MetricCard
            title="Retard Moyen"
            value={metrics.averageDelay}
            unit=" min"
            icon={Clock}
            color={metrics.averageDelay <= 5 ? 'green' : metrics.averageDelay <= 15 ? 'yellow' : 'red'}
            details={`Max: ${metrics.maxDelay} min`}
          />
          <MetricCard
            title="Heures Travaillées"
            value={metrics.totalWorkedHours}
            unit=" h"
            icon={TrendingUp}
            color="purple"
            subtitle={`Moyenne: ${metrics.averageWorkedHours}h/pointage`}
          />
        </div>
      )}

      {/* Métriques secondaires */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Pointages Complets"
            value={metrics.completeTimesheets}
            icon={CheckCircle2}
            color="green"
            subtitle={`${metrics.completionRate}% de complétion`}
          />
          <MetricCard
            title="Pointages Incomplets"
            value={metrics.incompleteTimesheets}
            icon={AlertCircle}
            color="yellow"
            subtitle="Nécessitent une attention"
          />
          <MetricCard
            title="Pointages en Litige"
            value={metrics.disputedTimesheets}
            icon={XCircle}
            color="red"
            subtitle="À résoudre rapidement"
          />
        </div>
      )}

      {/* Contenu selon la vue active */}
      <div className="space-y-6">
        {activeView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Tendances Récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart data={statsData?.trends} />
              </CardContent>
            </Card>
            
            <PunctualityCategoriesCard data={punctualityData} />
          </div>
        )}

        {activeView === 'trends' && (
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Analyse des Tendances
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsData?.trends && statsData.trends.length > 0 ? (
                  <div className="space-y-6">
                    <TrendChart data={statsData.trends} />
                    
                    {/* Tableau détaillé des tendances */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Période</th>
                            <th className="text-right py-3 px-4">Pointages</th>
                            <th className="text-right py-3 px-4">Ponctualité</th>
                            <th className="text-right py-3 px-4">Retard Moyen</th>
                            <th className="text-right py-3 px-4">Heures</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statsData.trends.map((trend, index) => {
                            const date = parseISO(trend.period);
                            const dateLabel = isValid(date) ? 
                              format(date, 'dd MMM yyyy', { locale: fr }) : 
                              trend.period;
                            
                            return (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium">{dateLabel}</td>
                                <td className="py-3 px-4 text-right">{trend.totalTimesheets}</td>
                                <td className="py-3 px-4 text-right">
                                  <span className={`font-semibold ${
                                    trend.punctualityRate >= 90 ? 'text-green-600' :
                                    trend.punctualityRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {Math.round(trend.punctualityRate * 10) / 10}%
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">{Math.round(trend.averageDelay)} min</td>
                                <td className="py-3 px-4 text-right">{Math.round(trend.totalWorkedHours)} h</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Aucune donnée de tendance disponible pour cette période
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopPerformersCard data={statsData?.userStats?.topPerformers} />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  À Améliorer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statsData?.userStats?.needsImprovement && statsData.userStats.needsImprovement.length > 0 ? (
                    statsData.userStats.needsImprovement.slice(0, 5).map((user, index) => (
                      <div key={user.user._id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 text-red-800 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {user.user.firstName} {user.user.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {user.totalTimesheets} pointages
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-red-600">
                            {Math.round(user.punctualityRate * 10) / 10}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round(user.averageDelay)} min retard
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <p className="text-green-600 font-medium">Excellentes performances</p>
                      <p className="text-gray-500 text-sm">Tous les utilisateurs performent bien</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'agencies' && (
          <div className="grid grid-cols-1 gap-6">
            <AgencyStatsCard data={statsData?.agencyStats} />
            
            {/* Tableau détaillé des agences */}
            {statsData?.agencyStats && statsData.agencyStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Analyse Détaillée par Agence</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Agence</th>
                          <th className="text-right py-3 px-4">Pointages</th>
                          <th className="text-right py-3 px-4">Ponctualité</th>
                          <th className="text-right py-3 px-4">Retard Moyen</th>
                          <th className="text-right py-3 px-4">Heures Totales</th>
                          <th className="text-right py-3 px-4">Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statsData.agencyStats
                          .sort((a, b) => b.punctualityRate - a.punctualityRate)
                          .map((agency) => {
                            const performance = 
                              agency.punctualityRate >= 95 ? 'Excellente' :
                              agency.punctualityRate >= 90 ? 'Très bonne' :
                              agency.punctualityRate >= 80 ? 'Bonne' :
                              agency.punctualityRate >= 70 ? 'Moyenne' : 'À améliorer';
                            
                            const performanceColor =
                              agency.punctualityRate >= 95 ? 'text-green-700' :
                              agency.punctualityRate >= 90 ? 'text-green-600' :
                              agency.punctualityRate >= 80 ? 'text-yellow-600' :
                              agency.punctualityRate >= 70 ? 'text-orange-600' : 'text-red-600';

                            return (
                              <tr key={agency.agency._id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <div>
                                    <p className="font-medium">{agency.agency.name}</p>
                                    {agency.agency.code && (
                                      <p className="text-xs text-gray-500">{agency.agency.code}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">{agency.totalTimesheets}</td>
                                <td className="py-3 px-4 text-right">
                                  <span className={`font-semibold ${performanceColor}`}>
                                    {Math.round(agency.punctualityRate * 10) / 10}%
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">{Math.round(agency.averageDelay)} min</td>
                                <td className="py-3 px-4 text-right">{Math.round(agency.totalWorkedHours)} h</td>
                                <td className="py-3 px-4 text-right">
                                  <Badge variant="outline" className={performanceColor}>
                                    {performance}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeView === 'anomalies' && (
          <div className="grid grid-cols-1 gap-6">
            <AnomaliesCard data={statsData?.anomalies} />
            
            {/* Statistiques sur les anomalies */}
            {statsData?.anomalies && statsData.anomalies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Analyse des Anomalies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {(['critical', 'high', 'medium', 'low'] as const).map(severity => {
                      const count = statsData.anomalies.filter(a => a.severity === severity).length;
                      const color = {
                        critical: 'text-red-600 bg-red-50',
                        high: 'text-orange-600 bg-orange-50', 
                        medium: 'text-yellow-600 bg-yellow-50',
                        low: 'text-blue-600 bg-blue-50'
                      }[severity];
                      
                      return (
                        <div key={severity} className={`p-4 rounded-lg ${color}`}>
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-sm font-medium capitalize">{severity}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Détail par Type d'Anomalie</h4>
                    {(['consistent_delay', 'round_times', 'no_breaks', 'suspicious_pattern'] as const).map(type => {
                      const anomaliesOfType = statsData.anomalies.filter(a => a.type === type);
                      if (anomaliesOfType.length === 0) return null;
                      
                      return (
                        <div key={type} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium capitalize">
                              {type.replace('_', ' ')}
                            </h5>
                            <Badge variant="outline">
                              {anomaliesOfType.length} détection{anomaliesOfType.length > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {anomaliesOfType.slice(0, 3).map((anomaly, index) => (
                              <div key={index} className="text-sm text-gray-600 flex items-center justify-between">
                                <span>{anomaly.description}</span>
                                <div className="flex items-center gap-2">
                                  {anomaly.user && (
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      {anomaly.user.firstName} {anomaly.user.lastName}
                                    </span>
                                  )}
                                  <Badge variant={
                                    anomaly.severity === 'critical' ? 'destructive' :
                                    anomaly.severity === 'high' ? 'destructive' :
                                    anomaly.severity === 'medium' ? 'default' : 'secondary'
                                  } className="text-xs">
                                    {anomaly.severity}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            {anomaliesOfType.length > 3 && (
                              <p className="text-xs text-gray-500">
                                +{anomaliesOfType.length - 3} autre{anomaliesOfType.length - 3 > 1 ? 's' : ''}...
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Résumé de la période */}
      {statsData?.period && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>
                  <strong>Période analysée:</strong> {' '}
                  {format(parseISO(statsData.period.start), 'dd MMM yyyy', { locale: fr })} -{' '}
                  {format(parseISO(statsData.period.end), 'dd MMM yyyy', { locale: fr })}
                </span>
                <span>
                  <strong>Groupement:</strong> {statsData.period.groupBy}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Dernière mise à jour: {format(new Date(), 'HH:mm', { locale: fr })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}