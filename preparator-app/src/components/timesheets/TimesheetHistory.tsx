'use client';

import { Calendar, Clock, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimesheetEntry } from '@/lib/types/timesheet';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimesheetHistoryProps {
  history: TimesheetEntry[] | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function TimesheetHistory({ history, isLoading, onRefresh }: TimesheetHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Historique</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                    <div className="h-3 bg-gray-300 rounded w-32"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-300 rounded w-20"></div>
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Historique</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filtrer</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {history && history.length > 0 ? (
          <div className="space-y-3">
            {history.slice(0, 10).map((entry, index) => (
              <div
                key={entry.id || index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {format(new Date(entry.date), 'EEEE d MMMM', { locale: fr })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {entry.startTime ? format(new Date(entry.startTime), 'HH:mm') : '--:--'} - 
                      {entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : '--:--'}
                    </p>
                    {entry.agency && (
                      <p className="text-xs text-gray-500">
                        {entry.agency.name} ({entry.agency.code})
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-gray-600">Temps travaillé</p>
                  <p className="font-semibold text-gray-900">
                    {entry.totalWorkedMinutes > 0 ? 
                      `${Math.floor(entry.totalWorkedMinutes / 60)}h${(entry.totalWorkedMinutes % 60).toString().padStart(2, '0')}` : 
                      '--:--'
                    }
                  </p>
                  {entry.breakDurationMinutes > 0 && (
                    <p className="text-xs text-gray-500">
                      Pause: {Math.floor(entry.breakDurationMinutes / 60)}h{(entry.breakDurationMinutes % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                  
                  {/* Statut */}
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      entry.status === 'complete' 
                        ? 'bg-green-100 text-green-800' 
                        : entry.status === 'incomplete'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {entry.status === 'complete' ? 'Complet' : 
                       entry.status === 'incomplete' ? 'Incomplet' : 'En attente'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Aucun historique disponible</p>
            <p className="text-sm">Vos pointages apparaîtront ici</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}