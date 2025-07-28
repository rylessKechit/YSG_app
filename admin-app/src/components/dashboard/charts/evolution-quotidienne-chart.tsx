// admin-app/src/components/dashboard/charts/evolution-quotidienne-chart.tsx
'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/loading-spinner';

interface TimelineDataPoint {
  date: string;
  preparations: number;
  ponctualite: number;
  presents: number;
  retards: number;
  tempsMoyen?: number;
}

interface EvolutionQuotidienneChartProps {
  data: TimelineDataPoint[];
  isLoading?: boolean;
  className?: string;
  period?: 'today' | 'week' | 'month';
}

export function EvolutionQuotidienneChart({ 
  data, 
  isLoading = false, 
  className = "",
  period = 'week'
}: EvolutionQuotidienneChartProps) {
  
  // Formatage des données pour le graphique
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => ({
      ...item,
      date: item.date,
      // Formatage de la date pour l'affichage
      displayDate: format(parseISO(item.date), period === 'today' ? 'HH:mm' : 'dd/MM', { locale: fr }),
      // Calcul de la ponctualité en pourcentage
      ponctualiteRate: item.ponctualite || 0,
      // Temps moyen en minutes
      tempsMoyen: item.tempsMoyen || 0
    }));
  }, [data, period]);

  // Calcul des tendances
  const trends = useMemo(() => {
    if (chartData.length < 2) return null;
    
    const latest = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    
    return {
      preparations: {
        value: latest.preparations - previous.preparations,
        percentage: previous.preparations > 0 ? 
          ((latest.preparations - previous.preparations) / previous.preparations) * 100 : 0
      },
      ponctualite: {
        value: latest.ponctualiteRate - previous.ponctualiteRate,
        percentage: latest.ponctualiteRate - previous.ponctualiteRate
      }
    };
  }, [chartData]);

  // Formatage des tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {period === 'today' ? `${label}` : format(parseISO(label), 'dd MMMM yyyy', { locale: fr })}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">{entry.name}</span>
              </div>
              <span className="text-sm font-medium">
                {entry.dataKey === 'ponctualiteRate' ? 
                  `${entry.value}%` : 
                  entry.dataKey === 'tempsMoyen' ?
                    `${entry.value}min` :
                    entry.value
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Évolution quotidienne</CardTitle>
          <CardDescription>
            Pointages et préparations sur {period === 'today' ? 'la journée' : '7 jours'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Évolution quotidienne</CardTitle>
          <CardDescription>
            Pointages et préparations sur {period === 'today' ? 'la journée' : '7 jours'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-sm font-medium">Aucune donnée disponible</p>
              <p className="text-xs text-gray-400 mt-1">
                Les données apparaîtront une fois les premières préparations effectuées
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Évolution quotidienne</CardTitle>
            <CardDescription>
              Pointages et préparations sur {period === 'today' ? 'la journée' : '7 jours'}
            </CardDescription>
          </div>
          
          {/* Indicateurs de tendance */}
          {trends && (
            <div className="flex items-center space-x-2">
              <Badge 
                variant={trends.preparations.value >= 0 ? "default" : "destructive"}
                className="text-xs"
              >
                Préparations: {trends.preparations.value >= 0 ? '+' : ''}{trends.preparations.value}
              </Badge>
              <Badge 
                variant={trends.ponctualite.value >= 0 ? "default" : "destructive"}
                className="text-xs"
              >
                Ponctualité: {trends.ponctualite.value >= 0 ? '+' : ''}{trends.ponctualite.value.toFixed(1)}%
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="displayDate"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              yAxisId="left"
              orientation="left"
              tick={{ fontSize: 12 }}
              label={{ value: 'Nombre', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              label={{ value: 'Pourcentage (%)', angle: 90, position: 'insideRight' }}
              domain={[0, 100]}
            />
            
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Ligne de référence pour l'objectif de ponctualité */}
            <ReferenceLine 
              yAxisId="right"
              y={95} 
              stroke="#ef4444" 
              strokeDasharray="5 5"
              label={{ value: "Objectif 95%", position: "insideTopRight" }}
            />
            
            {/* Lignes de données */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="preparations"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              name="Préparations"
            />
            
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ponctualiteRate"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              name="Ponctualité (%)"
            />
            
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="presents"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
              name="Présents"
            />
            
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="retards"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
              name="Retards"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Statistiques résumées */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {chartData.reduce((sum, item) => sum + item.preparations, 0)}
            </p>
            <p className="text-sm text-gray-600">Total préparations</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {(chartData.reduce((sum, item) => sum + item.ponctualiteRate, 0) / chartData.length).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">Ponctualité moyenne</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {chartData.reduce((sum, item) => sum + item.presents, 0)}
            </p>
            <p className="text-sm text-gray-600">Présences</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {chartData.reduce((sum, item) => sum + item.retards, 0)}
            </p>
            <p className="text-sm text-gray-600">Retards</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}