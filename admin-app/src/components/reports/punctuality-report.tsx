'use client&apos;;

import React from 'react';
import { Clock, TrendingUp, TrendingDown, Users, AlertTriangle } from 'lucide-react';
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
  Cell
} from &apos;recharts&apos;;
import { PunctualityReportData } from '@/types/reports';

interface PunctualityReportProps {
  data: PunctualityReportData;
  isLoading?: boolean;
}

export function PunctualityReport({ data, isLoading }: PunctualityReportProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
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

  const getStatusColor = (taux: number) => {
    if (taux >= 95) return &apos;text-green-600 bg-green-50&apos;;
    if (taux >= 85) return &apos;text-yellow-600 bg-yellow-50&apos;;
    return &apos;text-red-600 bg-red-50&apos;;
  };

  const getStatusLabel = (statut: string) => {
    const labels = {
      excellent: &apos;Excellent&apos;,
      bon: &apos;Bon&apos;,
      moyen: &apos;Moyen&apos;,
      faible: &apos;Faible&apos;
    };
    return labels[statut as keyof typeof labels] || statut;
  };

  return (
    <div className="space-y-6">
      {/* Métriques globales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux Global</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.global.tauxPonctualite.toFixed(1)}%</div>
            <div className="flex items-center space-x-2 mt-1">
              {data.global.evolution > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm ${data.global.evolution > 0 ? &apos;text-green-600&apos; : &apos;text-red-600'}`}>
                {data.global.evolution > 0 ? &apos;+&apos; : &apos;'}{data.global.evolution.toFixed(1)}%
              </span>
            </div>
            <Progress value={data.global.tauxPonctualite} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pointages</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.global.totalPointages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Sur {data.periode.jours} jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retards</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.global.retards}</div>
            <p className="text-xs text-muted-foreground">
              Retard moyen: {data.global.retardMoyen.toFixed(1)} min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objectif</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.global.objectif}%</div>
            <Badge 
              variant={data.global.tauxPonctualite >= data.global.objectif ? &quot;default&quot; : "destructive"}
              className="mt-2"
            >
              {data.global.tauxPonctualite >= data.global.objectif ? &apos;Atteint&apos; : &apos;Non atteint&apos;}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Graphique par agence */}
      <Card>
        <CardHeader>
          <CardTitle>Ponctualité par Agence</CardTitle>
          <CardDescription>
            Comparaison des taux de ponctualité entre agences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.parAgence}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nom" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value) => [`${value}%`, &apos;Taux de ponctualité&apos;]}
                labelFormatter={(label) => `Agence: ${label}`}
              />
              <Bar 
                dataKey="taux" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tableau détaillé par agence */}
      <Card>
        <CardHeader>
          <CardTitle>Détail par Agence</CardTitle>
          <CardDescription>
            Analyse détaillée de chaque agence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Agence</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Pointages</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">À l&apos;heure</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Retards</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Taux</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Retard moyen</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.parAgence.map((agence, index) => (
                    <tr key={agence.agenceId} className={index % 2 === 0 ? &apos;bg-white&apos; : 'bg-gray-50'}>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{agence.nom}</div>
                          <div className="text-sm text-gray-500">{agence.code}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{agence.totalPointages}</td>
                      <td className="px-4 py-3 text-right text-green-600">{agence.ponctuelArrivees}</td>
                      <td className="px-4 py-3 text-right text-red-600">{agence.retards}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${getStatusColor(agence.taux)}`}>
                          {agence.taux.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{agence.retardMoyen.toFixed(1)} min</td>
                      <td className="px-4 py-3 text-center">
                        <Badge 
                          variant={agence.statut === &apos;excellent&apos; || agence.statut === &apos;bon&apos; ? &apos;default&apos; : 'secondary'}
                          className={
                            agence.statut === &apos;excellent&apos; ? &apos;bg-green-100 text-green-800&apos; :
                            agence.statut === &apos;bon&apos; ? &apos;bg-blue-100 text-blue-800&apos; :
                            agence.statut === &apos;moyen&apos; ? &apos;bg-yellow-100 text-yellow-800&apos; :
                            &apos;bg-red-100 text-red-800&apos;
                          }
                        >
                          {getStatusLabel(agence.statut)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tendances par jour de la semaine */}
      {data.tendances?.parJourSemaine && (
        <Card>
          <CardHeader>
            <CardTitle>Tendances par Jour</CardTitle>
            <CardDescription>
              Analyse de la ponctualité selon les jours de la semaine
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.tendances.parJourSemaine}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="jour" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, &apos;Taux de ponctualité&apos;]}
                />
                <Bar 
                  dataKey="taux" 
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top/Flop performers */}
      {data.topFlop && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Meilleurs Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.topFlop.meilleursPerformers.slice(0, 5).map((user) => (
                  <div key={user.userId} className="flex justify-between items-center">
                    <span className="text-sm">{user.prenom} {user.nom}</span>
                    <Badge className="bg-green-100 text-green-800">
                      {user.taux.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-blue-600">Bonnes Performances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.topFlop.bonnesPerformances.slice(0, 5).map((user) => (
                  <div key={user.userId} className="flex justify-between items-center">
                    <span className="text-sm">{user.prenom} {user.nom}</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {user.taux.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600">À Améliorer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.topFlop.aAmeliorer.slice(0, 5).map((user) => (
                  <div key={user.userId} className="flex justify-between items-center">
                    <span className="text-sm">{user.prenom} {user.nom}</span>
                    <Badge className="bg-orange-100 text-orange-800">
                      {user.taux.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}