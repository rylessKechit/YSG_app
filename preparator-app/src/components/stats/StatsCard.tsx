// components/stats/StatsCard.tsx
// ✅ Composant pour afficher une statistique

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  isLoading?: boolean;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  isLoading = false
}: StatsCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-orange-200 bg-orange-50';
      case 'danger':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-8 bg-gray-200 rounded mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${getVariantClasses()}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              {icon && <span className="text-lg">{icon}</span>}
              <p className="text-sm font-medium text-gray-600">{title}</p>
            </div>
            
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {trend && (
                <Badge
                  variant={trend.isPositive ? 'default' : 'secondary'}
                  className={`text-xs ${
                    trend.isPositive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </Badge>
              )}
            </div>
            
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
            
            {trend && (
              <p className="text-xs text-gray-500 mt-1">{trend.label}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}