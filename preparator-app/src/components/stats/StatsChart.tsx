import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WeeklyStatPoint } from '@/lib/types/stats';

interface StatsChartProps {
  title: string;
  data: WeeklyStatPoint[];
  isLoading?: boolean;
}

export function StatsChart({ title, data, isLoading = false }: StatsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center text-gray-500">
            Aucune donnée disponible pour cette période
          </div>
        </CardContent>
      </Card>
    );
  }

  // Graphique simple avec barres CSS
  const maxCount = Math.max(...data.map(d => d.count), 1); // Éviter division par 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((point, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-20 text-xs text-gray-600 text-right">
                {point.date}
              </div>
              <div className="flex-1">
                <div className="bg-gray-200 rounded h-6 relative overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${Math.max((point.count / maxCount) * 100, 2)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                    {point.count > 0 ? point.count : '0'}
                  </span>
                </div>
              </div>
              <div className="w-16 text-xs text-gray-600 text-right">
                {point.count > 0 ? `${point.averageTime}min` : '-'}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}