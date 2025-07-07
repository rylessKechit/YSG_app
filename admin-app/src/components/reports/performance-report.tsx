// src/components/reports/performance-report.tsx
'use client&apos;;

import React from 'react';
import { Clock, TrendingUp, TrendingDown, Target, Award, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart
} from &apos;recharts&apos;;
import { PerformanceReportData } from '@/types/reports';

interface PerformanceReportProps {
  data: PerformanceReportData;
  isLoading?: boolean;
}

export function PerformanceReport({ data, isLoading }: PerformanceReportProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
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

  const getEfficiencyColor = (efficacite: string) => {
    switch (efficacite) {
      case &apos;excellent&apos;: return &apos;text-green-600 bg-green-50&apos;;
      case &apos;bon&apos;: return &apos;text-blue-600 bg-blue-50&apos;;
      case &apos;moyen&apos;: return &apos;text-yellow-600 bg-yellow-50&apos;;
      case &apos;faible&apos;: return &apos;text-red-600 bg-red-50&apos;;
      default: return &apos;text-gray-600 bg-gray-50&apos;;
    }
  };

  const getEfficiencyLabel = (efficacite: string) => {
    const labels = {
      excellent: &apos;Excellent&apos;,
      bon: &apos;Bon&apos;,
      moyen: &apos;Moyen&apos;,
      faible: &apos;Faible&apos;
    };
    return labels[efficacite as keyof typeof labels] || efficacite;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h${mins.toString().padStart(2, '0')}`;
    }
    return `${mins}min`;
  };

  return (
    <div className="space-y-6">
      {/* Métriques globales de performance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps Moyen Global</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(data.global.tempsMoyenGlobal)}</div>
            <div className="flex items-center space-x-2 mt-1">
              {data.comparaison && (
                <>
                  {data.comparaison.periodePrecedente.evolution > 0 ? (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm ${data.comparaison.periodePrecedente.evolution > 0 ? &apos;text-green-600&apos; : &apos;text-red-600'}`}>
                    {data.comparaison.periodePrecedente.evolution > 0 ? &apos;&apos; : &apos;+'}{Math.abs(data.comparaison.periodePrecedente.evolution).toFixed(1)}min
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objectif Temps</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(data.global.objectifTemps)}</div>
            <Progress 
              value={(data.global.objectifTemps / data.global.tempsMoyenGlobal) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux Respect Objectif</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.global.tauxRespectObjectif.toFixed(1)}%</div>
            <Badge 
              variant={data.global.tauxRespectObjectif >= 80 ? &quot;default&quot; : "destructive"}
              className="mt-2"
            >
              {data.global.tauxRespectObjectif >= 80 ? &apos;Satisfaisant&apos; : &apos;À améliorer&apos;}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Préparations</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.global.totalPreparations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Période: {data.periode.debut} - {data.periode.fin}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique d'évolution des performances */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution des Performances</CardTitle>
          <CardDescription>
            Temps moyen de préparation dans le temps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.tendances.evolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString(&apos;fr-FR&apos;, { 
                  month: &apos;short&apos;, 
                  day: &apos;numeric&apos; 
                })}
              />
              <YAxis tickFormatter={(value) => `${value}min`} />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(1)} min`, &apos;Temps moyen&apos;]}
                labelFormatter={(label) => new Date(label).toLocaleDateString(&apos;fr-FR&apos;)}
              />
              <Area 
                type="monotone" 
                dataKey="tempsMoyen" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.1}
              />
              <Line 
                type="monotone" 
                dataKey="tempsMoyen" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: &apos;#3b82f6&apos; }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance par agence */}
      <Card>
        <CardHeader>
          <CardTitle>Performance par Agence</CardTitle>
          <CardDescription>
            Comparaison des temps moyens et efficacité par agence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Graphique en barres */}
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.parAgence}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nom" />
                <YAxis tickFormatter={(value) => `${value}min`} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)} min`, &apos;Temps moyen&apos;]}
                />
                <Bar 
                  dataKey="tempsMoyen" 
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Tableau détaillé */}
            <div className="rounded-md border mt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium">Agence</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Préparations</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Temps Moyen</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Objectif</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Taux Réussite</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Efficacité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.parAgence.map((agence, index) => (
                      <tr key={agence.agenceId} className={index % 2 === 0 ? &apos;bg-white&apos; : 'bg-gray-50'}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{agence.nom}</div>
                        </td>
                        <td className="px-4 py-3 text-right">{agence.totalPreparations}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatTime(agence.tempsMoyen)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {formatTime(agence.tempsMoyenObjectif)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${agence.tauxReussiteObjectif >= 80 ? &apos;text-green-600&apos; : &apos;text-red-600'}`}>
                            {agence.tauxReussiteObjectif.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge 
                            variant="secondary"
                            className={getEfficiencyColor(agence.efficacite)}
                          >
                            {getEfficiencyLabel(agence.efficacite)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pics d'activité */}
      <Card>
        <CardHeader>
          <CardTitle>Pics d&apos;Activité</CardTitle>
          <CardDescription>
            Répartition des préparations par heure de la journée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.tendances.picActivite}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="heure" 
                tickFormatter={(value) => `${value}h`}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === &apos;nombrePreparations&apos; ? `${value} préparations` : `${value.toFixed(1)} min`,
                  name === &apos;nombrePreparations&apos; ? &apos;Nombre&apos; : &apos;Temps moyen&apos;
                ]}
                labelFormatter={(label) => `${label}h00`}
              />
              <Bar 
                dataKey="nombrePreparations" 
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Classement des utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle>Classement des Préparateurs</CardTitle>
          <CardDescription>
            Performance individuelle des préparateurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.parUtilisateur.slice(0, 10).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index < 3 
                      ? &apos;bg-yellow-100 text-yellow-800&apos; 
                      : &apos;bg-gray-100 text-gray-600&apos;
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{user.prenom} {user.nom}</div>
                    <div className="text-sm text-muted-foreground">{user.agence}</div>
                  </div>
                </div>
                
                <div className="text-right space-y-1">
                  <div className="font-medium">{formatTime(user.tempsMoyen)}</div>
                  <div className="text-sm text-muted-foreground">
                    {user.totalPreparations} préparations
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge variant="secondary" className="mb-1">
                    Constance: {user.constance.toFixed(1)}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    Best: {formatTime(user.meilleurePerformance)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}