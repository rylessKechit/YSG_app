// src/components/schedules/schedule-stats.tsx - VERSION SANS SIMULATION
'use client';

import { useState, useMemo } from 'react';
import { 
  Calendar,
  Clock,
  Users,
  Building,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertCircle
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

import { useScheduleStats } from '@/hooks/api/useSchedules';
import { useAgencies } from '@/hooks/api/useAgencies';

export function ScheduleStats() {
  // États locaux pour les filtres
  const [timePeriod, setTimePeriod] = useState('month');
  const [selectedAgency, setSelectedAgency] = useState<string>('all');

  // Calcul des filtres
  const statsFilters = useMemo(() => {
    const now = new Date();
    let startDate: string;
    
    switch (timePeriod) {
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        startDate = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        const monthStart = new Date(now);
        monthStart.setMonth(now.getMonth() - 1);
        startDate = monthStart.toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarterStart = new Date(now);
        quarterStart.setMonth(now.getMonth() - 3);
        startDate = quarterStart.toISOString().split('T')[0];
        break;
      default:
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    }

    return {
      startDate,
      endDate: now.toISOString().split('T')[0],
      ...(selectedAgency !== 'all' && { agency: selectedAgency })
    };
  }, [timePeriod, selectedAgency]);

  // Hooks API - UNIQUEMENT des vraies données
  const { data: stats, isLoading, error, refetch } = useScheduleStats(statsFilters);
  const { data: agenciesData } = useAgencies({ limit: 100 });

  // ✅ DONNÉES RÉELLES SEULEMENT - pas de simulation
  const chartData = useMemo(() => {
    if (!stats) return null;

    // Données pour le graphique de tendance - VRAIES DONNÉES
    const trendData = stats.busiestrDays?.map(day => ({
      date: new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      plannings: day.count,
      heures: Math.round(day.hours * 10) / 10
    })) || [];

    // Données pour le graphique des agences - VRAIES DONNÉES
    const agencyData = stats.agencyStats?.map(agency => ({
      name: agency.agencyName,
      plannings: agency.totalSchedules,
      heures: Math.round(agency.totalHours * 10) / 10,
      utilisateurs: agency.activeUsers
    })) || [];

    // Données pour le graphique en secteurs des utilisateurs - VRAIES DONNÉES
    const usersPieData = stats.userStats?.slice(0, 5).map((user, index) => ({
      name: user.userName,
      value: user.totalHours,
      color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index]
    })) || [];

    return {
      trend: trendData,
      agencies: agencyData,
      usersPie: usersPieData
    };
  }, [stats]);

  // ✅ MÉTRIQUES RÉELLES SEULEMENT - AUCUNE SIMULATION
  const metrics = useMemo(() => {
    if (!stats) return null;

    return {
      totalHours: Math.round(stats.totalWorkingHours || 0),
      totalSchedules: stats.totalSchedules || 0,
      avgPerUser: Math.round((stats.averagePerUser || 0) * 10) / 10,
      avgPerDay: Math.round((stats.averagePerDay || 0) * 10) / 10,
      uniqueUsers: stats.userStats?.length || 0,
      uniqueAgencies: stats.agencyStats?.length || 0
    };
  }, [stats]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">Erreur lors du chargement des statistiques</p>
            <p className="text-sm text-gray-500 mb-4">
              {error?.message || 'Impossible de récupérer les données depuis l\'API'}
            </p>
            <Button onClick={() => refetch()}>Réessayer</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si pas de données, afficher un message informatif
  if (!stats || !chartData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Aucune donnée disponible</p>
            <p className="text-sm text-gray-500">
              Aucun planning trouvé pour la période sélectionnée
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const agencies = agenciesData?.agencies || [];

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={timePeriod} onValueChange={setTimePeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">7 derniers jours</SelectItem>
            <SelectItem value="month">30 derniers jours</SelectItem>
            <SelectItem value="quarter">3 derniers mois</SelectItem>
            <SelectItem value="year">Cette année</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedAgency} onValueChange={setSelectedAgency}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Agence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les agences</SelectItem>
            {agencies.map((agency) => (
              <SelectItem key={agency.id} value={agency.id}>
                {agency.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Métriques principales */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Plannings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalSchedules}</div>
              <p className="text-xs text-muted-foreground">
                plannings actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Heures totales</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalHours}h</div>
              <p className="text-xs text-muted-foreground">
                heures planifiées
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Préparateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.uniqueUsers}</div>
              <p className="text-xs text-muted-foreground">
                utilisateurs actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Moyenne/jour</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avgPerDay}</div>
              <p className="text-xs text-muted-foreground">
                plannings par jour
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendance des plannings */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution des plannings</CardTitle>
            <CardDescription>
              Nombre de plannings par jour
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="plannings" 
                    stroke="#3B82F6" 
                    strokeWidth={2} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Aucune donnée à afficher
              </div>
            )}
          </CardContent>
        </Card>

        {/* Répartition par agence */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par agence</CardTitle>
            <CardDescription>
              Plannings par agence
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.agencies.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.agencies}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="plannings" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Aucune donnée à afficher
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top utilisateurs */}
        <Card>
          <CardHeader>
            <CardTitle>Top préparateurs</CardTitle>
            <CardDescription>
              Répartition des heures par préparateur
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.usersPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={chartData.usersPie}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.usersPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Aucune donnée à afficher
              </div>
            )}
          </CardContent>
        </Card>

        {/* Résumé détaillé */}
        <Card>
          <CardHeader>
            <CardTitle>Résumé détaillé</CardTitle>
            <CardDescription>
              Statistiques de la période
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Utilisation */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Moyenne par utilisateur:</span>
                  <span className="font-medium">{metrics ? metrics.avgPerUser : '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Agences impliquées:</span>
                  <span className="font-medium">{metrics ? metrics.uniqueAgencies : '-'}</span>
                </div>
              </div>

              {/* Jour le plus chargé */}
              {stats.busiestrDays && stats.busiestrDays.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Jour le plus chargé:</h4>
                  <div className="flex justify-between text-sm">
                    <span>{new Date(stats.busiestrDays[0].date).toLocaleDateString('fr-FR')}</span>
                    <Badge variant="secondary">{stats.busiestrDays[0].count} plannings</Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}