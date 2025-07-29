// admin-app/src/components/dashboard/kpi-card.tsx - VERSION CORRIGÉE
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  target?: {
    value: number;
    label: string;
  };
  status?: 'success' | 'warning' | 'error' | 'neutral';
  format?: 'number' | 'percentage' | 'time' | 'currency';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const statusColors = {
  success: 'text-green-600 bg-green-50 border-green-200',
  warning: 'text-orange-600 bg-orange-50 border-orange-200',
  error: 'text-red-600 bg-red-50 border-red-200',
  neutral: 'text-gray-600 bg-gray-50 border-gray-200',
};

const statusBadgeColors = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-orange-100 text-orange-800',
  error: 'bg-red-100 text-red-800',
  neutral: 'bg-gray-100 text-gray-800',
};

// ✅ CORRECTION: Fonction de formatage améliorée
function formatValue(value: number | string, format: KPICardProps['format']): string {
  if (typeof value === 'string') return value;
  
  // ✅ Gestion des valeurs nulles/invalides
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }
  
  switch (format) {
    case 'percentage':
      return `${Number(value).toFixed(1)}%`;
    case 'time':
      // ✅ CORRECTION: Meilleur formatage du temps
      if (value === 0) return '0min';
      if (value < 60) return `${Math.round(value)}min`;
      const hours = Math.floor(value / 60);
      const minutes = Math.round(value % 60);
      if (minutes === 0) return `${hours}h`;
      return `${hours}h${minutes.toString().padStart(2, '0')}`;
    case 'currency':
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
      }).format(value);
    case 'number':
    default:
      // ✅ CORRECTION: Formatage des nombres entiers vs décimaux
      if (Number.isInteger(value)) {
        return new Intl.NumberFormat('fr-FR').format(value);
      } else {
        return new Intl.NumberFormat('fr-FR', { 
          minimumFractionDigits: 1,
          maximumFractionDigits: 1 
        }).format(value);
      }
  }
}

function TrendIcon({ trend }: { trend: KPICardProps['trend'] }) {
  if (!trend) return null;
  
  if (trend.value === 0) {
    return <Minus className="h-4 w-4 text-gray-500" />;
  }
  
  return trend.isPositive ?
    <TrendingUp className="h-4 w-4 text-green-600" /> :
    <TrendingDown className="h-4 w-4 text-red-600" />;
}

function LoadingSkeleton({ size }: { size: KPICardProps['size'] }) {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
  };

  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
      <div className={`bg-gray-200 rounded w-1/2 mb-1 ${sizeClasses[size || 'md']}`}></div>
      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
    </div>
  );
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  target,
  status = 'neutral',
  format = 'number',
  size = 'md',
  loading = false,
  icon,
  onClick,
  className
}: KPICardProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  const cardClasses = cn(
    'transition-all duration-200 hover:shadow-md',
    statusColors[status],
    onClick && 'cursor-pointer hover:scale-[1.02]',
    className
  );

  return (
    <Card className={cardClasses} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">
          {title}
        </CardTitle>
        <div className="flex items-center space-x-2">
          {icon && (
            <div className="text-gray-400">
              {icon}
            </div>
          )}
          {status === 'error' && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <LoadingSkeleton size={size} />
        ) : (
          <div className="space-y-2">
            {/* Valeur principale */}
            <div className={cn('font-bold text-gray-900', sizeClasses[size])}>
              {formatValue(value, format)}
            </div>
            
            {/* Sous-titre */}
            {subtitle && (
              <p className="text-xs text-gray-600">
                {subtitle}
              </p>
            )}
            
            {/* Tendance */}
            {trend && (
              <div className="flex items-center space-x-1">
                <TrendIcon trend={trend} />
                <span className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}>
                  {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">
                  {trend.label}
                </span>
              </div>
            )}
            
            {/* Objectif */}
            {target && (
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  Objectif: {formatValue(target.value, format)}
                </span>
                <Badge variant="outline" className={cn('text-xs', statusBadgeColors[status])}>
                  {target.label}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}