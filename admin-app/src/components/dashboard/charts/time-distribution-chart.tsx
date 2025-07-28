// admin-app/src/components/dashboard/charts/time-distribution-chart.tsx
'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Clock, AlertTriangle, CheckCircle, Timer } from 'lucide-react';
import { useState } from 'react';

interface TimeDistributionData {
  range: string;
  count: number;
  percentage: number;
  min?: number;
  max?: number;
}

interface TimeDistributionChartProps {
  data: TimeDistributionData[];
  isLoading?: boolean;
  className?: string;
  chartType?: 'bar' | 'pie';
}

export function TimeDistributionChart({ 
  data, 
  isLoading = false, 
  className = "",
  chartType: initialChartType = 'bar'
}: TimeDistributionChartProps) {
  
  const [chartType, setChartType] = useState<'bar' | 'pie'>(initialChartType);

  // Préparation des données avec couleurs et statuts
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => {
      // Déterminer le statut selon la tranche de temps
      let status: 'excellent' | 'good' | 'warning' | 'poor';
      let color: string;
      
      if (item.range.includes('0-15')) {
        status = 'excellent';
        color = '#10b981'; // vert
      } else if (item.range.includes('15-30')) {
        status = 'good';
        color = '#3b82f6'; // bleu
      } else if (item.range.includes('30-45')) {
        status = 'warning';
        color = '#f59e0b'; // orange
      } else if (item.range.includes('45-60')) {
        status = 'warning';
        color = '#f97316'; // orange foncé
      } else {
        status = 'poor';
        color = '#ef4444'; // rouge
      }

      return {
        ...item,
        status,
        color,
        // Calcul du pourcentage cumulé
        displayLabel: `${item.range} (${item.percentage}%)`
      };
    });
  }, [data]);

  // Calcul des statistiques
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const totalCount = chartData.reduce((sum, item) => sum + item.count, 0);
    const underThirtyMin = chartData
      .filter(item => !item.range.includes('60+') && !item.range.includes('45-60'))
      .reduce((sum, item) => sum + item.count, 0);
    
    const excellentCount = chartData
      .filter(item => item.status === 'excellent')
      .reduce((sum, item) => sum + item.count, 0);
    
    const problematicCount = chartData
      .filter(item => item.status === 'poor')
      .reduce((sum, item) => sum + item.count, 0);
    
    return {
      totalPreparations: totalCount,
      underThirtyMinPercent: totalCount > 0 ? (underThirtyMin / totalCount) * 100 : 0,
      excellentPercent: totalCount > 0 ? (excellentCount / totalCount) * 100 : 0,
      problematicPercent: totalCount > 0 ? (problematicCount / totalCount) * 100 : 0,
      averageRange: chartData.length > 0 ? 
        chartData.reduce((sum, item, index) => sum + (index * item.percentage), 0) / 100 : 0
    };
  }, [chartData]);

  // Custom Tooltip pour graphique en barres
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{data.range}</p>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Préparations:</span>
              <span className="font-medium">{data.count}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pourcentage:</span>
              <span className="font-medium">{data.percentage}%</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-gray-600">Évaluation:</span>
              <Badge 
                variant={data.status === 'excellent' || data.status === 'good' ? "default" : "destructive"}
                className="text-xs"
              >
                {data.status === 'excellent' ? 'Excellent' :
                 data.status === 'good' ? 'Bon' :
                 data.status === 'warning' ? 'À surveiller' : 'Problématique'}
              </Badge>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip pour graphique en secteurs
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.range}</p>
          <p className="text-sm text-gray-600">
            {data.count} préparations ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Distribution des Temps</CardTitle>
          <CardDescription>
            Répartition des préparations par durée
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
          <CardTitle>Distribution des Temps</CardTitle>
          <CardDescription>
            Répartition des préparations par durée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Timer className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium">Aucune donnée de temps disponible</p>
              <p className="text-xs text-gray-400 mt-1">
                Les données apparaîtront une fois les préparations terminées
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
            <CardTitle>Distribution des Temps</CardTitle>
            <CardDescription>
              Répartition des préparations par durée
            </CardDescription>
          </div>
          
          {/* Sélecteur de type de graphique */}
          <div className="flex items-center space-x-2">
            <Button
              variant={chartType === 'bar' ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              Barres
            </Button>
            <Button
              variant={chartType === 'pie' ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType('pie')}
            >
              Secteurs
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Graphique principal */}
        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'bar' ? (
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="range" 
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Nombre de préparations', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomBarTooltip />} />
              
              <Bar 
                dataKey="count" 
                name="Préparations"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="count"
                label={({ range, percentage }) => `${range}: ${percentage}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          )}
        </ResponsiveContainer>

        {/* Statistiques détaillées */}
        {stats && (
          <div className="mt-6 space-y-4">
            {/* KPIs principaux */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <p className="text-lg font-bold text-green-600">
                    {stats.underThirtyMinPercent.toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-gray-600">≤ 30 minutes</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Timer className="h-4 w-4 text-blue-600" />
                  <p className="text-lg font-bold text-blue-600">
                    {stats.excellentPercent.toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-gray-600">≤ 15 minutes</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <p className="text-lg font-bold text-red-600">
                    {stats.problematicPercent.toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-gray-600"> 60 minutes</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <p className="text-lg font-bold text-gray-900">
                    {stats.totalPreparations}
                  </p>
                </div>
                <p className="text-xs text-gray-600">Total</p>
              </div>
            </div>

            {/* Légende avec badges */}
            <div className="space-y-2">
              <p className="font-medium text-gray-900 mb-3">Évaluation des performances</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {chartData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 rounded border">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.range}</p>
                      <p className="text-xs text-gray-500">{item.count} préparations</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights et recommandations */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-800 mb-1">Analyse de performance</p>
                  <div className="text-sm text-blue-700 space-y-1">
                    {stats.excellentPercent >= 50 && (
                      <p>✅ Excellente performance : {stats.excellentPercent.toFixed(1)}% des préparations en moins de 15 minutes</p>
                    )}
                    {stats.underThirtyMinPercent >= 80 && (
                      <p>✅ Bon respect des objectifs : {stats.underThirtyMinPercent.toFixed(1)}% des préparations sous 30 minutes</p>
                    )}
                    {stats.problematicPercent > 15 && (
                      <p>⚠️ Attention : {stats.problematicPercent.toFixed(1)}% des préparations dépassent 60 minutes</p>
                    )}
                    {stats.problematicPercent <= 5 && (
                      <p>✅ Très peu de dépassements : seulement {stats.problematicPercent.toFixed(1)}% au-delà de 60 minutes</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}