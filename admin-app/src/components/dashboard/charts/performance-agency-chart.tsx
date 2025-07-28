// admin-app/src/components/dashboard/charts/performance-agency-chart.tsx
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
  Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface AgencyPerformanceData {
  agencyId: string;
  agencyName: string;
  punctualityRate: number;
  totalPreparations: number;
  completedPreparations: number;
  averageTime: number;
  onTime?: number;
  total?: number;
}

interface PerformanceAgencyChartProps {
  data: AgencyPerformanceData[];
  isLoading?: boolean;
  className?: string;
  metric?: 'punctuality' | 'preparations' | 'averageTime';
}

export function PerformanceAgencyChart({ 
  data, 
  isLoading = false, 
  className = "",
  metric = 'punctuality'
}: PerformanceAgencyChartProps) {
  
  // Configuration des métriques
  const metricConfig = {
    punctuality: {
      title: 'Taux de Ponctualité par Agence',
      description: 'Comparaison des performances de ponctualité',
      dataKey: 'punctualityRate' as keyof AgencyPerformanceData,
      unit: '%',
      color: '#10b981',
      target: 95,
      format: (value: number) => `${value.toFixed(1)}%`,
      isReversed: false // Plus haut = mieux
    },
    preparations: {
      title: 'Préparations par Agence',
      description: 'Nombre total de préparations effectuées',
      dataKey: 'totalPreparations' as keyof AgencyPerformanceData,
      unit: '',
      color: '#3b82f6', 
      target: 50,
      format: (value: number) => `${value}`,
      isReversed: false // Plus haut = mieux
    },
    averageTime: {
      title: 'Temps Moyen par Agence',
      description: 'Temps moyen de préparation en minutes',
      dataKey: 'averageTime' as keyof AgencyPerformanceData,
      unit: 'min',
      color: '#f59e0b',
      target: 25,
      format: (value: number) => `${value.toFixed(1)} min`,
      isReversed: true // Plus bas = mieux
    }
  };

  const config = metricConfig[metric];

  // Préparation et tri des données
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const processedData = data.map(item => {
      // Calcul du status basé sur la métrique
      let status: 'excellent' | 'good' | 'warning' | 'poor';
      const value = item[config.dataKey] as number;
      
      if (metric === 'punctuality') {
        if (value >= 95) status = 'excellent';
        else if (value >= 85) status = 'good';
        else if (value >= 70) status = 'warning';
        else status = 'poor';
      } else if (metric === 'averageTime') {
        if (value <= 20) status = 'excellent';
        else if (value <= 25) status = 'good';
        else if (value <= 35) status = 'warning';
        else status = 'poor';
      } else {
        // preparations
        if (value >= config.target) status = 'excellent';
        else if (value >= config.target * 0.8) status = 'good';
        else if (value >= config.target * 0.6) status = 'warning';
        else status = 'poor';
      }

      return {
        ...item,
        value,
        status,
        // Nom raccourci pour l'affichage
        shortName: item.agencyName.replace('SIXT ', '').substring(0, 10)
      };
    });

    // Tri selon la métrique (inverse pour averageTime)
    return processedData.sort((a, b) => {
      return config.isReversed ? a.value - b.value : b.value - a.value;
    });
  }, [data, metric, config]);

  // Couleurs selon le statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return '#10b981'; // vert
      case 'good': return '#3b82f6';      // bleu
      case 'warning': return '#f59e0b';   // orange
      case 'poor': return '#ef4444';      // rouge
      default: return '#6b7280';          // gris
    }
  };

  // Calcul des statistiques globales
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const values = chartData.map(item => item.value);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const best = Math.max(...values);
    const worst = Math.min(...values);
    
    const bestAgency = chartData.find(item => item.value === (config.isReversed ? worst : best));
    const worstAgency = chartData.find(item => item.value === (config.isReversed ? best : worst));
    
    return {
      average,
      best: config.isReversed ? worst : best,
      worst: config.isReversed ? best : worst,
      bestAgency: config.isReversed ? chartData[chartData.length - 1] : chartData[0],
      worstAgency: config.isReversed ? chartData[0] : chartData[chartData.length - 1],
      aboveTarget: chartData.filter(item => 
        config.isReversed ? item.value <= config.target : item.value >= config.target
      ).length
    };
  }, [chartData, config]);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-[200px]">
          <p className="font-medium text-gray-900 mb-3">{data.agencyName}</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Ponctualité:</span>
              <span className="font-medium">{data.punctualityRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Préparations:</span>
              <span className="font-medium">{data.totalPreparations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Temps moyen:</span>
              <span className="font-medium">{data.averageTime.toFixed(1)} min</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-gray-600">Status:</span>
              <Badge 
                variant={data.status === 'excellent' || data.status === 'good' ? "default" : "destructive"}
                className="text-xs"
              >
                {data.status === 'excellent' ? 'Excellent' :
                 data.status === 'good' ? 'Bon' :
                 data.status === 'warning' ? 'À surveiller' : 'À améliorer'}
              </Badge>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
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
          <CardTitle>{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium">Aucune donnée d'agence disponible</p>
              <p className="text-xs text-gray-400 mt-1">
                Les données apparaîtront une fois les agences configurées
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
            <CardTitle>{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          
          {/* Indicateur de performance globale */}
          {stats && (
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {config.format(stats.average)}
              </div>
              <p className="text-sm text-gray-600">Moyenne</p>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
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
              dataKey="shortName" 
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ 
                value: config.unit ? `Valeur (${config.unit})` : 'Valeur', 
                angle: -90, 
                position: 'insideLeft' 
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
              name={config.title}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getStatusColor(entry.status)} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Statistiques et insights */}
        {stats && (
          <div className="mt-6 space-y-4">
            {/* Résumé des performances */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">
                  {stats.aboveTarget}
                </p>
                <p className="text-xs text-gray-600">
                  Agences au-dessus de l'objectif
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {config.format(stats.average)}
                </p>
                <p className="text-xs text-gray-600">Moyenne générale</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <p className="text-lg font-bold text-green-600">
                    {config.format(stats.best)}
                  </p>
                </div>
                <p className="text-xs text-gray-600">Meilleure performance</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <p className="text-lg font-bold text-red-600">
                    {config.format(stats.worst)}
                  </p>
                </div>
                <p className="text-xs text-gray-600">À améliorer</p>
              </div>
            </div>

            {/* Top et Bottom performers */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Meilleure performance</span>
                </div>
                <p className="text-sm text-green-700">
                  <strong>{stats.bestAgency.agencyName}</strong> - {config.format(stats.bestAgency.value)}
                </p>
              </div>
              
              <div className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-800">À améliorer</span>
                </div>
                <p className="text-sm text-orange-700">
                  <strong>{stats.worstAgency.agencyName}</strong> - {config.format(stats.worstAgency.value)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}