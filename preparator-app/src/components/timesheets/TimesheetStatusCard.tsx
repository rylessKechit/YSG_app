'use client';

import { Clock, Play, Square, Coffee } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimesheetStatus } from '@/lib/types/timesheet';
import { format } from 'date-fns';

interface TimesheetStatusCardProps {
  status: TimesheetStatus;
}

export function TimesheetStatusCard({ status }: TimesheetStatusCardProps) {
  const getStatusInfo = () => {
    switch (status.currentStatus) {
      case 'not_started':
        return { 
          label: 'Pas encore pointé', 
          color: 'text-gray-600', 
          bgColor: 'bg-gray-100',
          icon: Clock 
        };
      case 'working':
        return { 
          label: 'En service', 
          color: 'text-green-600', 
          bgColor: 'bg-green-100',
          icon: Play 
        };
      case 'on_break':
        return { 
          label: 'En pause', 
          color: 'text-orange-600', 
          bgColor: 'bg-orange-100',
          icon: Coffee 
        };
      case 'finished':
        return { 
          label: 'Service terminé', 
          color: 'text-blue-600', 
          bgColor: 'bg-blue-100',
          icon: Square 
        };
      default:
        return { 
          label: 'Statut inconnu', 
          color: 'text-gray-600', 
          bgColor: 'bg-gray-100',
          icon: Clock 
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <span>Statut du jour</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut principal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
              <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
            </div>
            <div>
              <p className="font-medium text-gray-900">{statusInfo.label}</p>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>

          {/* Temps travaillé */}
          {status.totalWorkedMinutes > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Temps travaillé</p>
              <p className="font-semibold text-gray-900">
                {Math.floor(status.totalWorkedMinutes / 60)}h
                {(status.totalWorkedMinutes % 60).toString().padStart(2, '0')}
              </p>
            </div>
          )}
        </div>

        {/* Détails des horaires */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Arrivée</p>
            <p className="font-medium">
              {status.startTime ? 
                format(new Date(status.startTime), 'HH:mm') : 
                'Non pointé'
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Départ</p>
            <p className="font-medium">
              {status.endTime ? 
                format(new Date(status.endTime), 'HH:mm') : 
                'Non pointé'
              }
            </p>
          </div>
        </div>

        {/* Pauses */}
        {(status.breakStart || status.breakEnd) && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Début pause</p>
              <p className="font-medium">
                {status.breakStart ? 
                  format(new Date(status.breakStart), 'HH:mm') : 
                  'Non commencée'
                }
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Fin pause</p>
              <p className="font-medium">
                {status.breakEnd ? 
                  format(new Date(status.breakEnd), 'HH:mm') : 
                  'En cours'
                }
              </p>
            </div>
          </div>
        )}

        {/* Temps de pause */}
        {status.breakDurationMinutes > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Durée pause</p>
            <p className="font-medium text-gray-900">
              {Math.floor(status.breakDurationMinutes / 60)}h
              {(status.breakDurationMinutes % 60).toString().padStart(2, '0')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}