// admin-app/src/components/timesheets/timesheets-analytics-view-fixed.tsx
'use client';

import { useState } from 'react';
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
  AlertTriangle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useTimesheetStats, usePunctualityReport } from '@/hooks/use-timesheets';
import { format, subDays, subMonths } from 'date-fns';

// ===== TYPES COMPATIBLES AVEC LE BACKEND =====
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
    groupBy: 'day',
    metric: 'punctuality',
    period: 'custom'
  });

  // ===== HOOKS DE DONNÉES =====
  const { 
    data: statsResponse, 
    isLoading: isLoadingStats 
  } = useTimesheetStats(analyticsFilters);

  const { 
    data: punctualityResponse, 
    isLoading: isLoadingPunctuality 
  } = usePunctualityReport(analyticsFilters);

  // ===== EXTRACTION DES DONNÉES DU BACKEND =====
  const statsData = statsResponse as BackendStatsData | undefined;
  const punctualityData = punctualityResponse as BackendPunctualityReportData | undefined;

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

  // ===== COMPOSANTS DE MÉTRIQUES =====
  const MetricCard = ({ 
    title, 
    value, 
    unit = '', 
    trend = 0, 
    icon: Icon, 
    color = 'blue' 
  }: {
    title: string;
    value: number | string;
    unit?: string;
    trend?: number;
    icon: any;
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">
              {value}{unit}
            </p>
            {trend !== 0 && (
              <Badge variant={trend > 0 ? 'default' : 'destructive'} className="mt-1">
                {trend > 0 ? '+' : ''}{trend}%
              </Badge>
            )}
          </div>
          <Icon className="h-8 w-8 text-blue-600" />
        </div>
      </CardContent>
    </Card>
  );

  const TopPerformersCard = ({ data }: { data?: BackendUserStat[] }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data && data.length > 0 ? (
            data.slice(0, 5).map((performer, index) => (
              <div key={performer.user._id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                    index === 1 ? 'bg-gray-100 text-gray-800' :
                    index === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">
                      {performer.user.firstName} {performer.user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {performer.totalTimesheets} pointages
                    </div>
                  </div>
                </div>
                <Badge variant="outline">
                  {Math.round(performer.punctualityRate)}%
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const TrendChart = ({ title, data }: { title: string; data?: BackendTrend[] }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
          <div className="text-center text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-2" />
            <p>Graphique en cours d'implémentation</p>
            <p className="text-sm">Données disponibles: {data?.length || 0} points</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ===== RENDU =====
  if (isLoadingStats && isLoadingPunctuality) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
              <span className="ml-2">Chargement des analytiques...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contrôles des analytiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Configuration des analytiques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Raccourcis de période */}
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handlePeriodPreset('week')}
            >
              7 derniers jours
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handlePeriodPreset('month')}
            >
              30 derniers jours
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handlePeriodPreset('quarter')}
            >
              3 derniers mois
            </Button>
          </div>

          {/* Période personnalisée */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Date début</label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Date fin</label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Grouper par</label>
              <Select 
                value={analyticsFilters.groupBy} 
                onValueChange={(value) => setAnalyticsFilters(prev => ({ ...prev, groupBy: value }))}
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
          </div>
        </CardContent>
      </Card>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Taux de ponctualité"
          value={Math.round(statsData?.globalStats?.punctualityRate || 0)}
          unit="%"
          trend={0}
          icon={Target}
          color="green"
        />
        <MetricCard
          title="Pointages complets"
          value={statsData?.globalStats?.completeTimesheets || 0}
          trend={0}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Temps moyen/jour"
          value={Math.round((statsData?.globalStats?.averageWorkedHours || 0) * 10) / 10}
          unit="h"
          trend={0}
          icon={Clock}
          color="purple"
        />
        <MetricCard
          title="Total pointages"
          value={statsData?.globalStats?.totalTimesheets || 0}
          trend={0}
          icon={Users}
          color="orange"
        />
      </div>

      {/* Graphiques et tableaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendance de ponctualité */}
        <TrendChart 
          title="Évolution de la ponctualité"
          data={statsData?.trends || []}
        />

        {/* Top performers */}
        <TopPerformersCard data={statsData?.userStats?.topPerformers || []} />
      </div>

      {/* Analyse par agence */}
      <Card>
        <CardHeader>
          <CardTitle>Performance par agence</CardTitle>
        </CardHeader>
        <CardContent>
          {statsData?.agencyStats && statsData.agencyStats.length > 0 ? (
            <div className="space-y-4">
              {statsData.agencyStats.map((agencyStat: BackendAgencyStat, index: number) => (
                <div key={agencyStat.agency._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{agencyStat.agency.name}</div>
                      <div className="text-sm text-gray-500">
                        {agencyStat.totalTimesheets} pointages
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">{Math.round(agencyStat.punctualityRate)}%</div>
                      <div className="text-sm text-gray-500">Ponctualité</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{Math.round(agencyStat.totalWorkedHours)}h</div>
                      <div className="text-sm text-gray-500">Heures travaillées</div>
                    </div>
                    <Badge 
                      variant={
                        agencyStat.punctualityRate >= 95 ? 'default' :
                        agencyStat.punctualityRate >= 85 ? 'secondary' :
                        'destructive'
                      }
                    >
                      {agencyStat.punctualityRate >= 95 ? 'Excellent' :
                       agencyStat.punctualityRate >= 85 ? 'Bon' :
                       'À améliorer'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <PieChart className="h-12 w-12 mx-auto mb-4" />
              <p>Aucune donnée d'agence disponible</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anomalies détectées */}
      {statsData?.anomalies && statsData.anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Anomalies détectées ({statsData.anomalies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statsData.anomalies.map((anomaly: BackendAnomaly, index: number) => (
                <Alert 
                  key={index} 
                  variant={anomaly.severity === 'high' || anomaly.severity === 'critical' ? 'destructive' : 'default'}
                >
                  <AlertDescription>
                    <div className="flex items-start justify-between">
                      <div>
                        <strong className="capitalize">{anomaly.type.replace('_', ' ')}:</strong> {anomaly.description}
                        {anomaly.user && (
                          <div className="text-sm mt-1">
                            Employé: {anomaly.user.firstName} {anomaly.user.lastName}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          anomaly.severity === 'critical' ? 'destructive' :
                          anomaly.severity === 'high' ? 'destructive' :
                          anomaly.severity === 'medium' ? 'secondary' :
                          'outline'
                        }>
                          {anomaly.severity}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {anomaly.count} occurrence(s)
                        </span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Résumé de la ponctualité */}
      {punctualityData?.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Analyse de ponctualité détaillée</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {punctualityData.summary.totalTimesheets}
                </div>
                <div className="text-sm text-gray-600">Total pointages analysés</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {Math.round(punctualityData.summary.overall.punctualityRate)}%
                </div>
                <div className="text-sm text-gray-600">Taux ponctualité global</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {Math.round(punctualityData.summary.overall.averageDelay)}min
                </div>
                <div className="text-sm text-gray-600">Retard moyen</div>
              </div>
            </div>

            {/* Catégories de ponctualité */}
            {punctualityData.summary.categories && punctualityData.summary.categories.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Répartition par catégorie</h4>
                <div className="space-y-2">
                  {punctualityData.summary.categories.map((category: BackendPunctualityCategory, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium">{category.category}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          {category.count} pointages ({Math.round(category.percentage)}%)
                        </span>
                        <span className="text-sm text-gray-600">
                          Retard moyen: {Math.round(category.averageDelay)}min
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}