// src/components/reports/activity-report.tsx
'use client&apos;;

import React from 'react';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building, 
  Activity,
  BarChart3
} from &apos;lucide-react&apos;;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from &apos;recharts&apos;;
import { ActivityReportData } from '@/types/reports';

interface ActivityReportProps {
  data: ActivityReportData;
  isLoading?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export function ActivityReport({ data, isLoading }: ActivityReportProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h${m.toString().padStart(2, &apos;0&apos;)}` : `${h}h`;
  };

  const getIntensityColor = (intensite: string) => {
    switch (intensite) {
      case &apos;pic&apos;: return &apos;bg-red-100 text-red-800&apos;;
      case &apos;forte&apos;: return &apos;bg-orange-100 text-orange-800&apos;;
      case &apos;moyenne&apos;: return &apos;bg-yellow-100 text-yellow-800&apos;;
      case &apos;faible&apos;: return &apos;bg-gray-100 text-gray-600&apos;;
      default: return &apos;bg-gray-100 text-gray-600&apos;;
    }
  };

  const getTrendIcon = (tendance: string) => {
    switch (tendance) {
      case &apos;hausse&apos;: return <TrendingUp className="h-4 w-4 text-green-500" />;
      case &apos;baisse&apos;: return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Métriques de volumétrie */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Heures</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(data.volumetrie.totalHeures)}</div>
            <div className="flex items-center space-x-2 mt-1">
              {data.tendances.croissance > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm ${data.tendances.croissance > 0 ? &apos;text-green-600&apos; : &apos;text-red-600'}`}>
                {data.tendances.croissance > 0 ? &apos;+&apos; : &apos;'}{data.tendances.croissance.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jours Actifs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.volumetrie.joursAvecActivite}</div>
            <p className="text-xs text-muted-foreground">
              / {data.volumetrie.totalJoursOuvres} jours ouvrés
            </p>
            <Progress 
              value={(data.volumetrie.joursAvecActivite / data.volumetrie.totalJoursOuvres) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moyenne/Jour</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(data.volumetrie.moyenneHeuresParJour)}</div>
            <p className="text-xs text-muted-foreground">
              Heures par jour d&apos;activité
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Période</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {new Date(data.periode.debut).toLocaleDateString('fr-FR', { day: &apos;2-digit&apos;, month: &apos;short&apos; })} - 
              {new Date(data.periode.fin).toLocaleDateString('fr-FR', { day: &apos;2-digit&apos;, month: &apos;short&apos; })}
            </div>
            <p className="text-xs text-muted-foreground">
              Analyse d&apos;activité
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Répartition par agence */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Graphique en secteurs */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Agence</CardTitle>
            <CardDescription>
              Pourcentage d&apos;activité par agence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.repartition.parAgence}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ nom, pourcentageTotal }) => `${nom} ${pourcentageTotal.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="pourcentageTotal"
                >
                  {data.repartition.parAgence.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, &apos;Pourcentage&apos;]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tableau détaillé agences */}
        <Card>
          <CardHeader>
            <CardTitle>Détail par Agence</CardTitle>
            <CardDescription>
              Heures et moyennes par agence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.repartition.parAgence.map((agence, index) => (
                <div key={agence.agenceId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <div className="font-medium">{agence.nom}</div>
                      <div className="text-sm text-muted-foreground">
                        Pic: {agence.picActivite}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatHours(agence.totalHeures)}</div>
                    <div className="text-sm text-muted-foreground">
                      {agence.pourcentageTotal.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activité par jour de la semaine */}
      <Card>
        <CardHeader>
          <CardTitle>Activité par Jour de la Semaine</CardTitle>
          <CardDescription>
            Répartition de l&apos;activité selon les jours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.repartition.parJourSemaine}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="jour" />
              <YAxis tickFormatter={(value) => `${value}h`} />
              <Tooltip 
                formatter={(value: number) => [`${formatHours(value)}`, &apos;Heures totales&apos;]}
              />
              <Bar 
                dataKey="totalHeures" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Activité par heure de la journée */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition Horaire</CardTitle>
          <CardDescription>
            Intensité de l&apos;activité par heure de la journée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.repartition.parHeureJour}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="heure" 
                tickFormatter={(value) => `${value}h`}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [`${value}`, &apos;Activité totale&apos;]}
                labelFormatter={(label) => `${label}h00`}
              />
              <Area 
                type="monotone" 
                dataKey="totalActivite" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Badges d'intensité */}
          <div className="flex flex-wrap gap-2 mt-4">
            {data.repartition.parHeureJour.map((hour) => (
              <Badge 
                key={hour.heure}
                variant="secondary"
                className={getIntensityColor(hour.intensite)}
              >
                {hour.heure}h - {hour.intensite}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance des utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle>Performance des Préparateurs</CardTitle>
          <CardDescription>
            Activité et régularité par préparateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.repartition.parUtilisateur.slice(0, 10).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-medium">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{user.prenom} {user.nom}</div>
                    <div className="text-sm text-muted-foreground">{user.agence}</div>
                  </div>
                </div>
                
                <div className="text-right space-y-1">
                  <div className="font-medium">{formatHours(user.totalHeures)}</div>
                  <div className="text-sm text-muted-foreground">
                    {user.joursActifs} jours actifs
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge variant="secondary">
                    Régularité: {user.regularite.toFixed(1)}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatHours(user.moyenneParJour)}/jour
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Saisonnalité */}
      {data.tendances.saisonnalite && data.tendances.saisonnalite.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tendances Saisonnières</CardTitle>
            <CardDescription>
              Évolution de l&apos;activité par mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.tendances.saisonnalite}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`${value}`, &apos;Activité&apos;]}
                />
                <Line 
                  type="monotone" 
                  dataKey="activite" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: &apos;#8b5cf6&apos; }}
                />
              </LineChart>
            </ResponsiveContainer>
            
            {/* Tendances par mois */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {data.tendances.saisonnalite.map((mois) => (
                <div key={mois.mois} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm font-medium">{mois.mois}</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(mois.tendance)}
                    <span className="text-xs text-muted-foreground">{mois.tendance}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}