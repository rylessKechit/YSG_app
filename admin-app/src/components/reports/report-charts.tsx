// src/components/reports/report-charts.tsx
'use client&apos;;

import React from 'react';
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
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Legend
} from &apos;recharts&apos;;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ReportChartData } from '@/types/reports';

interface ReportChartsProps {
  data: ReportChartData;
  type?: &apos;punctuality&apos; | &apos;performance&apos; | &apos;activity&apos;;
  isLoading?: boolean;
  onChartTypeChange?: (type: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export function ReportCharts({ data, type = 'punctuality', isLoading, onChartTypeChange }: ReportChartsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatTime = (value: number) => `${value.toFixed(1)}min`;
  const formatHours = (value: number) => {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return minutes > 0 ? `${hours}h${minutes.toString().padStart(2, &apos;0&apos;)}` : `${hours}h`;
  };

  const renderPunctualityCharts = () => (
    <>
      {/* Timeline de ponctualité */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Évolution de la Ponctualité</CardTitle>
              <CardDescription>Taux de ponctualité dans le temps</CardDescription>
            </div>
            <Select value="timeline" onValueChange={onChartTypeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timeline">Timeline</SelectItem>
                <SelectItem value="comparison">Comparaison</SelectItem>
                <SelectItem value="distribution">Distribution</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.punctuality.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString(&apos;fr-FR&apos;, { 
                  month: &apos;short&apos;, 
                  day: &apos;numeric&apos; 
                })}
              />
              <YAxis yAxisId="left" orientation="left" tickFormatter={formatPercentage} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === &apos;rate&apos; ? formatPercentage(value) : value,
                  name === &apos;rate&apos; ? &apos;Taux de ponctualité&apos; : 
                  name === &apos;onTime&apos; ? &apos;À l\&apos;heure' : &apos;En retard&apos;
                ]}
                labelFormatter={(label) => new Date(label).toLocaleDateString(&apos;fr-FR&apos;)}
              />
              <Legend />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="rate" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.3}
                name="Taux de ponctualité"
              />
              <Bar 
                yAxisId="right"
                dataKey="onTime" 
                fill="#3b82f6" 
                name="À l&apos;heure"
              />
              <Bar 
                yAxisId="right"
                dataKey="late" 
                fill="#ef4444" 
                name="En retard"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ponctualité par agence */}
      <Card>
        <CardHeader>
          <CardTitle>Ponctualité par Agence</CardTitle>
          <CardDescription>Comparaison des taux entre agences</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.punctuality.byAgency} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={formatPercentage} />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip 
                formatter={(value: number) => [formatPercentage(value), &apos;Taux de ponctualité&apos;]}
              />
              <Bar 
                dataKey="rate" 
                fill="#6366f1"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );

  const renderPerformanceCharts = () => (
    <>
      {/* Timeline de performance */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution des Temps de Préparation</CardTitle>
          <CardDescription>Temps moyen et objectifs dans le temps</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.performance.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString(&apos;fr-FR&apos;, { 
                  month: &apos;short&apos;, 
                  day: &apos;numeric&apos; 
                })}
              />
              <YAxis tickFormatter={formatTime} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatTime(value), 
                  name === &apos;averageTime&apos; ? &apos;Temps moyen&apos; : &apos;Objectif&apos;
                ]}
                labelFormatter={(label) => new Date(label).toLocaleDateString(&apos;fr-FR&apos;)}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="averageTime" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: &apos;#3b82f6&apos;, strokeWidth: 2, r: 4 }}
                name="Temps moyen"
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="#ef4444" 
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                name="Objectif"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribution des temps */}
      <Card>
        <CardHeader>
          <CardTitle>Distribution des Temps</CardTitle>
          <CardDescription>Répartition des préparations par durée</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.performance.distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === &apos;count&apos; ? `${value} préparations` : formatPercentage(value),
                  name === &apos;count&apos; ? &apos;Nombre&apos; : &apos;Pourcentage&apos;
                ]}
              />
              <Bar 
                dataKey="count" 
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Badges de répartition */}
          <div className="flex flex-wrap gap-2 mt-4">
            {data.performance.distribution.map((item, index) => (
              <Badge 
                key={item.range}
                variant="secondary"
                className={
                  item.percentage > 30 ? &apos;bg-red-100 text-red-800&apos; :
                  item.percentage > 20 ? &apos;bg-yellow-100 text-yellow-800&apos; :
                  &apos;bg-green-100 text-green-800&apos;
                }
              >
                {item.range}: {formatPercentage(item.percentage)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderActivityCharts = () => (
    <>
      {/* Activité par heure */}
      <Card>
        <CardHeader>
          <CardTitle>Activité par Heure</CardTitle>
          <CardDescription>Répartition de l&apos;activité dans la journée</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.activity.hourly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour" 
                tickFormatter={(value) => `${value}h`}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [`${value}`, &apos;Activité&apos;]}
                labelFormatter={(label) => `${label}h00`}
              />
              <Area 
                type="monotone" 
                dataKey="activity" 
                stroke="#8b5cf6" 
                fill="#8b5cf6" 
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Badges d'intensité */}
          <div className="flex flex-wrap gap-2 mt-4">
            {data.activity.hourly.map((hour) => (
              <Badge 
                key={hour.hour}
                variant="secondary"
                className={
                  hour.intensity === &apos;high&apos; ? &apos;bg-red-100 text-red-800&apos; :
                  hour.intensity === &apos;medium&apos; ? &apos;bg-yellow-100 text-yellow-800&apos; :
                  &apos;bg-gray-100 text-gray-600&apos;
                }
              >
                {hour.hour}h - {hour.intensity}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activité par jour de la semaine */}
      <Card>
        <CardHeader>
          <CardTitle>Activité Hebdomadaire</CardTitle>
          <CardDescription>Répartition par jour de la semaine</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Graphique en barres */}
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.activity.weekly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={formatHours} />
                <Tooltip 
                  formatter={(value: number) => [formatHours(value), &apos;Heures&apos;]}
                />
                <Bar 
                  dataKey="hours" 
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Graphique en secteurs */}
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.activity.weekly}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ day, percentage }) => `${day} ${percentage.toFixed(1)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="percentage"
                >
                  {data.activity.weekly.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, &apos;Pourcentage&apos;]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderChartsByType = () => {
    switch (type) {
      case &apos;punctuality&apos;:
        return renderPunctualityCharts();
      case &apos;performance&apos;:
        return renderPerformanceCharts();
      case &apos;activity&apos;:
        return renderActivityCharts();
      default:
        return renderPunctualityCharts();
    }
  };

  return (
    <div className="space-y-6">
      {renderChartsByType()}
    </div>
  );
}