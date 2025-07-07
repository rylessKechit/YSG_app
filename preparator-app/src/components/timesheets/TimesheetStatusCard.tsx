'use client';

import React from 'react';
import { Clock, User, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ✅ Interface simplifiée pour éviter les conflits de types
interface TimesheetStatusCardProps {
  status: any; // Utilise any pour éviter les erreurs de types complexes
}

export function TimesheetStatusCard({ status }: TimesheetStatusCardProps) {
  // ✅ Fonction pour calculer le statut actuel
  const getCurrentStatus = () => {
    if (!status) return { label: 'Non connecté', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    
    // Si c'est le nouveau format avec currentStatus
    if (status.currentStatus) {
      switch (status.currentStatus) {
        case 'not_started':
          return { label: 'Pas encore pointé', color: 'text-gray-600', bgColor: 'bg-gray-100' };
        case 'working':
          return { label: 'En service', color: 'text-green-600', bgColor: 'bg-green-100' };
        case 'on_break':
          return { label: 'En pause', color: 'text-orange-600', bgColor: 'bg-orange-100' };
        case 'finished':
          return { label: 'Service terminé', color: 'text-blue-600', bgColor: 'bg-blue-100' };
        default:
          return { label: 'Statut inconnu', color: 'text-gray-600', bgColor: 'bg-gray-100' };
      }
    }
    
    // Ancien format - calcul basé sur les propriétés boolean
    if (status.isOnBreak) {
      return { label: 'En pause', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    }
    if (status.isClockedOut) {
      return { label: 'Service terminé', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    }
    if (status.isClockedIn) {
      return { label: 'En service', color: 'text-green-600', bgColor: 'bg-green-100' };
    }
    if (status.isNotStarted) {
      return { label: 'Pas encore pointé', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
    
    return { label: 'Statut inconnu', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  };

  // ✅ Fonction pour formater le temps
  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return 'Non pointé';
    try {
      return new Date(timeString).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Non pointé';
    }
  };

  // ✅ Fonction pour formater la durée
  const formatDuration = (minutes: number | undefined | null) => {
    if (!minutes || minutes === 0) return '0h00';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const statusInfo = getCurrentStatus();
  const timesheet = status?.timesheet;
  
  // ✅ Extraction sécurisée des données
  const workedMinutes = status?.currentWorkedMinutes || timesheet?.totalWorkedMinutes || 0;
  const startTime = timesheet?.startTime;
  const endTime = timesheet?.endTime;
  const breakStart = timesheet?.breakStart;
  const breakEnd = timesheet?.breakEnd;
  const agencyName = timesheet?.agency?.name || 'Aucune agence';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Statut du jour</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut actuel */}
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
            <Clock className={`w-5 h-5 ${statusInfo.color}`} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">{statusInfo.label}</p>
            <p className="text-sm text-gray-600">
              {new Date().toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>

          {/* Temps travaillé */}
          {workedMinutes > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Temps travaillé</p>
              <p className="font-semibold text-gray-900">
                {formatDuration(workedMinutes)}
              </p>
            </div>
          )}
        </div>

        {/* Détails des horaires */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Arrivée</p>
            <p className="font-medium">
              {formatTime(startTime)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Départ</p>
            <p className="font-medium">
              {formatTime(endTime)}
            </p>
          </div>
        </div>

        {/* Pauses si présentes */}
        {(breakStart || breakEnd) && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Début pause</p>
              <p className="font-medium">
                {formatTime(breakStart)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Fin pause</p>
              <p className="font-medium">
                {breakEnd ? formatTime(breakEnd) : 'En cours'}
              </p>
            </div>
          </div>
        )}

        {/* Durée de pause calculée */}
        {breakStart && breakEnd && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Durée pause</p>
            <p className="font-medium text-gray-900">
              {(() => {
                try {
                  const start = new Date(breakStart).getTime();
                  const end = new Date(breakEnd).getTime();
                  const diffMinutes = Math.floor((end - start) / (1000 * 60));
                  return formatDuration(diffMinutes);
                } catch {
                  return 'Calcul impossible';
                }
              })()}
            </p>
          </div>
        )}

        {/* Agence */}
        {agencyName && agencyName !== 'Aucune agence' && (
          <div className="pt-2 border-t">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Agence</p>
                <p className="font-medium text-gray-900">{agencyName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Debug info (à supprimer en production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
            <details>
              <summary className="cursor-pointer">Debug Status</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(status, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}