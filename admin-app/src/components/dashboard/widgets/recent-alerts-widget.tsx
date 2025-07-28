// admin-app/src/components/dashboard/widgets/recent-alerts-widget.tsx
'use client';

import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  AlertTriangle, 
  Clock, 
  UserX, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
  Bell,
  BellOff
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { DashboardAlert } from '@/types/dashboard';

interface RecentAlertsWidgetProps {
  alerts: DashboardAlert[];
  isLoading?: boolean;
  className?: string;
  maxAlerts?: number;
  onAlertAction?: (alertId: string, action: 'read' | 'dismiss' | 'view') => void;
  showActions?: boolean;
}

export function RecentAlertsWidget({ 
  alerts = [], 
  isLoading = false, 
  className = "",
  maxAlerts = 5,
  onAlertAction,
  showActions = true
}: RecentAlertsWidgetProps) {
  
  // Trier et limiter les alertes
  const displayAlerts = useMemo(() => {
    if (!alerts || alerts.length === 0) return [];
    
    return alerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxAlerts);
  }, [alerts, maxAlerts]);

  // Statistiques des alertes
  const alertStats = useMemo(() => {
    if (alerts.length === 0) return null;
    
    const byPriority = alerts.reduce((acc, alert) => {
      acc[alert.priority] = (acc[alert.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const unreadCount = alerts.filter(alert => !alert.isRead).length;
    const criticalCount = alerts.filter(alert => alert.priority === 'critical').length;
    const actionRequiredCount = alerts.filter(alert => alert.actionRequired).length;

    return {
      total: alerts.length,
      unread: unreadCount,
      critical: criticalCount,
      actionRequired: actionRequiredCount,
      byPriority
    };
  }, [alerts]);

  // Configuration des icônes et couleurs par type d'alerte
  const getAlertConfig = (alert: DashboardAlert) => {
    const configs = {
      late_start: {
        icon: Clock,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: 'Retard de début'
      },
      missing_clock_out: {
        icon: UserX,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Pointage manquant'
      },
      long_preparation: {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        label: 'Préparation longue'
      },
      system_error: {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Erreur système'
      },
      retard: {
        icon: Clock,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: 'Retard'
      },
      absence: {
        icon: UserX,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Absence'
      },
      incident: {
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Incident'
      }
    };

    return configs[alert.type] || {
      icon: Info,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      label: 'Information'
    };
  };

  // Configuration des priorités
  const getPriorityConfig = (priority: string) => {
    const configs = {
      critical: {
        variant: 'destructive' as const,
        label: 'Critique',
        color: 'text-red-600'
      },
      high: {
        variant: 'destructive' as const,
        label: 'Élevée',
        color: 'text-orange-600'
      },
      medium: {
        variant: 'secondary' as const,
        label: 'Moyenne',
        color: 'text-yellow-600'
      },
      low: {
        variant: 'outline' as const,
        label: 'Faible',
        color: 'text-gray-600'
      }
    };

    return configs[priority as keyof typeof configs] || configs.low;
  };

  // Actions sur les alertes
  const handleAlertAction = (alertId: string, action: 'read' | 'dismiss' | 'view') => {
    if (onAlertAction) {
      onAlertAction(alertId, action);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Alertes récentes</CardTitle>
          <CardDescription>
            Dernières notifications importantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center">
            <LoadingSpinner size="lg" />
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
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Alertes récentes</span>
            </CardTitle>
            <CardDescription>
              Dernières notifications importantes
            </CardDescription>
          </div>
          
          {/* Statistiques d'alertes */}
          {alertStats && (
            <div className="flex items-center space-x-2">
              {alertStats.critical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {alertStats.critical} critique{alertStats.critical > 1 ? 's' : ''}
                </Badge>
              )}
              {alertStats.unread > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {alertStats.unread} non lu{alertStats.unread > 1 ? 'es' : 'e'}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {displayAlerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="flex items-center justify-center mb-3">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              Aucune alerte récente
            </p>
            <p className="text-xs text-gray-500">
              Tout fonctionne normalement
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayAlerts.map((alert) => {
              const alertConfig = getAlertConfig(alert);
              const priorityConfig = getPriorityConfig(alert.priority);
              const IconComponent = alertConfig.icon;

              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                    alert.isRead ? 'opacity-75' : ''
                  } ${alertConfig.bgColor} ${alertConfig.borderColor}`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Icône d'alerte */}
                    <div className={`flex-shrink-0 ${alertConfig.color}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    
                    {/* Contenu de l'alerte */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {alert.title}
                        </h4>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                          <Badge 
                            variant={priorityConfig.variant}
                            className="text-xs"
                          >
                            {priorityConfig.label}
                          </Badge>
                          {!alert.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        {alert.message}
                      </p>
                      
                      {/* Informations contextuelles */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-3">
                          <span>
                            {formatDistanceToNow(new Date(alert.timestamp), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </span>
                          
                          {alert.userName && (
                            <span className="flex items-center space-x-1">
                              <span>•</span>
                              <span>{alert.userName}</span>
                            </span>
                          )}
                          
                          {alert.agencyName && (
                            <span className="flex items-center space-x-1">
                              <span>•</span>
                              <span>{alert.agencyName}</span>
                            </span>
                          )}
                        </div>
                        
                        {/* Actions */}
                        {showActions && (
                          <div className="flex items-center space-x-1">
                            {!alert.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => handleAlertAction(alert.id, 'read')}
                              >
                                Marquer lu
                              </Button>
                            )}
                            
                            {alert.actionUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => handleAlertAction(alert.id, 'view')}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Lien pour voir toutes les alertes */}
            {alerts.length > maxAlerts && (
              <div className="pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-sm"
                  onClick={() => {/* Navigation vers page alertes */}}
                >
                  Voir toutes les alertes ({alerts.length})
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Résumé statistique en bas */}
        {alertStats && alertStats.total > 0 && (
          <div className="mt-6 pt-4 border-t bg-gray-50 -mx-6 -mb-6 px-6 pb-4 rounded-b-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{alertStats.total}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-orange-600">{alertStats.actionRequired}</p>
                <p className="text-xs text-gray-600">Action requise</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-600">{alertStats.unread}</p>
                <p className="text-xs text-gray-600">Non lues</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}