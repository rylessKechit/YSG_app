'use client';

import { Clock, MapPin, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimesheetStatus, Agency } from '@/lib/types';
import { formatTime, formatWorkTime } from '@/lib/utils';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';

interface TodayStatusProps {
  status: TimesheetStatus | null;
  agencies: Agency[];
  selectedAgencyId: string;
  onAgencyChange: (agencyId: string) => void;
  isLoading: boolean;
}

export function TodayStatus({ 
  status, 
  agencies, 
  selectedAgencyId, 
  onAgencyChange,
  isLoading 
}: TodayStatusProps) {
  const selectedAgency = agencies.find(a => a.id === selectedAgencyId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Statut du jour</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner text="Chargement du statut..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Statut du jour</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sélecteur d'agence */}
        {agencies.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Agence</label>
            <select 
              value={selectedAgencyId}
              onChange={(e) => onAgencyChange(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {agencies.map(agency => (
                <option key={agency.id} value={agency.id}>
                  {agency.name} ({agency.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Agence actuelle */}
        {selectedAgency && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{selectedAgency.name} - {selectedAgency.client}</span>
          </div>
        )}

        {/* Planning vs Réel */}
        {status && (
          <div className="grid grid-cols-2 gap-4">
            {/* Planning prévu */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Planning prévu</h4>
              {status.schedule ? (
                <div className="text-sm space-y-1">
                  <p className="flex items-center justify-between">
                    <span>Début:</span>
                    <span className="font-mono">{status.schedule.startTime}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Fin:</span>
                    <span className="font-mono">{status.schedule.endTime}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Durée:</span>
                    <span className="font-mono">{formatWorkTime(status.schedule.workingDuration)}</span>
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Aucun planning</p>
              )}
            </div>

            {/* Temps réel */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Temps réel</h4>
              <div className="text-sm space-y-1">
                <p className="flex items-center justify-between">
                  <span>Arrivée:</span>
                  <span className="font-mono">
                    {status.timesheet?.startTime ? formatTime(status.timesheet.startTime) : '--:--'}
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Départ:</span>
                  <span className="font-mono">
                    {status.timesheet?.endTime ? formatTime(status.timesheet.endTime) : '--:--'}
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Travaillé:</span>
                  <span className="font-mono">
                    {status.currentStatus.currentWorkedTime || '0h00'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Retard éventuel */}
        {status?.timesheet?.delays.startDelay && status.timesheet.delays.startDelay > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded p-2">
            <p className="text-sm text-orange-800">
              ⚠️ Retard de {status.timesheet.delays.startDelay} minutes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}