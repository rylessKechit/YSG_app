// src/components/schedules/schedule-stats.tsx
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
  PieChart,
  Download,
  Filter
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
import { Progress } from '@/components/ui/progress';
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

  // Hooks API
  const { data: stats, isLoading, error } = useScheduleStats(statsFilters);
  const { data: agenciesData } = useAgencies({ limit: 100 });

  // Données pour les graphiques
  const chartData = useMemo(() => {
    if (!stats) return null;

    // Données pour le graphique de tendance
    const trendData = stats.busiestrDays?.map(day => ({
      date: new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      plannings: day.count,
      heures: Math.round(day.hours * 10) / 10
    })) || [];

    // Données pour le graphique des agences
    const agencyData = stats.agencyStats?.map(agency => ({
      name: agency.agencyName,
      plannings: agency.totalSchedules,
      heures: Math.round(agency.totalHours * 10) / 10,
      utilisateurs: agency.activeUsers
    })) || [];

    // Données pour le graphique en secteurs des utilisateurs
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

  // Calculs des métriques clés
  const metrics = useMemo(() => {
    if (!stats) return null;

    const totalHours = stats.totalWorkingHours || 0;
    const totalSchedules = stats.totalSchedules || 0;
    const avgPerUser = stats.averagePerUser || 0;
    const avgPerDay = stats.averagePerDay || 0;

    // Comparaison avec la période précédente (simulée)
    const prevTotalHours = totalHours * 0.9; // -10% simulation
    const prevTotalSchedules = totalSchedules * 0.95; // -5% simulation

    const hoursGrowth = prevTotalHours > 0 ? ((totalHours - prevTotalHours) / prevTotalHours) * 100 : 0;
    const schedulesGrowth = prevTotalSchedules > 0 ? ((totalSchedules - prevTotalSchedules) / prevTotalSchedules) * 100 : 0;

    return {
      totalHours: Math.round(totalHours),
      totalSchedules,
      avgPerUser: Math.round(avgPerUser * 10) / 10,
      avgPerDay: Math.round(avgPerDay * 10) / 10,
      hoursGrowth: Math.round(hoursGrowth * 10) / 10,
      schedulesGrowth: Math.round(schedulesGrowth * 10) / 10
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
            <p className="text-red-600 mb-2">Erreur lors du chargement des statistiques</p>
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const agencies = agenciesData?.data?.agencies || [];

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">7 derniers jours</SelectItem>
              <SelectItem value="month">30 derniers jours</SelectItem>
              <SelectItem value="quarter">3 derniers mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedAgency} onValueChange={setSelectedAgency}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes les agences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les agences</SelectItem>
              {agencies.map((agency: any) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exporter le rapport
        </Button>
      </div>

      {/* Métriques principales */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Heures totales</p>
                  <div className="text-2xl font-bold">{metrics.totalHours}h</div>
                </div>
                <div className="flex items-center">
                  {metrics.hoursGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm ml-1 ${metrics.hoursGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(metrics.hoursGrowth)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Plannings totaux</p>
                  <div className="text-2xl font-bold">{metrics.totalSchedules}</div>
                </div>
                <div className="flex items-center">
                  {metrics.schedulesGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm ml-1 ${metrics.schedulesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(metrics.schedulesGrowth)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Moyenne par utilisateur</p>
                <div className="text-2xl font-bold">{metrics.avgPerUser}h</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Moyenne par jour</p>
                <div className="text-2xl font-bold">{metrics.avgPerDay}h</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Graphiques */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Tendance des plannings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Évolution des plannings
            </CardTitle>
            <CardDescription>
              Nombre de plannings et heures par jour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData?.trend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="plannings" fill="#3B82F6" name="Plannings" />
                <Bar yAxisId="right" dataKey="heures" fill="#10B981" name="Heures" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition par utilisateur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Top 5 Utilisateurs
            </CardTitle>
            <CardDescription>
              Répartition des heures par préparateur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  dataKey="value"
                  data={chartData?.usersPie || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}h`}
                >
                  {chartData?.usersPie?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques détaillées */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Performance par agence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Performance par Agence
            </CardTitle>
            <CardDescription>
              Comparaison des agences par nombre de plannings et heures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.agencyStats?.slice(0, 5).map((agency, index) => (
                <div key={agency.agencyId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-medium">{agency.agencyName}</span>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">{agency.totalSchedules} plannings</div>
                      <div className="text-gray-500">{Math.round(agency.totalHours)}h</div>
                    </div>
                  </div>
                  <Progress 
                    value={(agency.totalSchedules / (stats?.totalSchedules || 1)) * 100} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{agency.activeUsers} utilisateur(s) actif(s)</span>
                    <span>{Math.round((agency.totalSchedules / (stats?.totalSchedules || 1)) * 100)}% du total</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top utilisateurs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Préparateurs
            </CardTitle>
            <CardDescription>
              Classement par nombre d'heures travaillées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.userStats?.slice(0, 5).map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={index < 3 ? "default" : "secondary"}
                      className={
                        index === 0 ? "bg-yellow-500" :
                        index === 1 ? "bg-gray-400" :
                        index === 2 ? "bg-amber-600" : ""
                      }
                    >
                      {index + 1}
                    </Badge>
                    <div>
                      <div className="font-medium">{user.userName}</div>
                      <div className="text-sm text-gray-500">
                        {user.totalDays} jour(s) • {user.averagePerDay}h/jour en moyenne
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{Math.round(user.totalHours)}h</div>
                    <div className="text-xs text-gray-500">
                      {Math.round((user.totalHours / (stats?.totalWorkingHours || 1)) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphique des agences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Comparaison des Agences
          </CardTitle>
          <CardDescription>
            Nombre de plannings et heures par agence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData?.agencies || []} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="plannings" fill="#3B82F6" name="Plannings" />
              <Bar dataKey="heures" fill="#10B981" name="Heures" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Résumé de la période */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé de la période</CardTitle>
          <CardDescription>
            Vue d'ensemble des performances sur la période sélectionnée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Efficacité */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Efficacité
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Taux d'utilisation:</span>
                  <span className="font-medium">85%</span>
                </div>
                <Progress value={85} className="h-2" />
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Moyenne heures/jour:</span>
                  <span className="font-medium">{metrics?.avgPerDay}h</span>
                </div>
              </div>
            </div>

            {/* Planification */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Planification
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Jours planifiés:</span>
                  <span className="font-medium">{stats?.busiestrDays?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pic d'activité:</span>
                  <span className="font-medium">
                    {stats?.busiestrDays?.[0]?.count || 0} plannings
                  </span>
                </div>
              </div>
            </div>

            {/* Ressources */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Ressources
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Préparateurs actifs:</span>
                  <span className="font-medium">{stats?.userStats?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Agences impliquées:</span>
                  <span className="font-medium">{stats?.agencyStats?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}