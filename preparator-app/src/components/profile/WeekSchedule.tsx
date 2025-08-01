import React from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WeekScheduleProps {
  weekSchedule: any[];
  isLoading: boolean;
}

export function WeekSchedule({ weekSchedule, isLoading }: WeekScheduleProps) {
  
  // Fonction pour formater l'heure
  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    if (typeof timeString === 'string') return timeString;
    return new Date(timeString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtenir l'icône de statut pour les pointages
  const getStatusIcon = (variance: any) => {
    if (!variance) return null;
    
    switch (variance.status) {
      case 'on_time':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'slight_delay':
        return <AlertTriangle className="w-3 h-3 text-orange-600" />;
      case 'late':
        return <XCircle className="w-3 h-3 text-red-600" />;
      default:
        return null;
    }
  };

  // Obtenir les couleurs pour les écarts
  const getVarianceColor = (variance: any) => {
    if (!variance) return 'text-gray-500';
    
    switch (variance.status) {
      case 'on_time':
        return 'text-green-600';
      case 'slight_delay':
        return 'text-orange-600';
      case 'late':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Planning de la semaine</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Planning de la semaine</span>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-700">
            Voir tout
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {weekSchedule.map((day, index) => (
            <div 
              key={index} 
              className={`p-4 rounded-lg border ${
                day.isToday ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
              }`}
            >
              {/* En-tête du jour */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {day.dayName.charAt(0).toUpperCase() + day.dayName.slice(1)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(day.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </p>
                </div>
                
                {/* Statut du jour */}
                <div className="flex items-center space-x-1">
                  {day.timesheet ? (
                    <>
                      {getStatusIcon(day.timesheet.variance)}
                      <span className="text-xs text-gray-600">
                        {day.timesheet.status === 'complete' ? 'Terminé' : 'Pointé'}
                      </span>
                    </>
                  ) : day.schedule ? (
                    <span className="text-xs text-gray-500">Planifié</span>
                  ) : (
                    <span className="text-xs text-gray-400">Libre</span>
                  )}
                </div>
              </div>

              {/* Contenu selon le type de jour */}
              {day.schedule || day.timesheet ? (
                <div className="space-y-2">
                  {/* Horaires prévus vs réels */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {/* Planning prévu */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Planifié</p>
                      <div className="space-y-1">
                        {day.schedule ? (
                          <>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-700">
                                {day.schedule.startTime} - {day.schedule.endTime}
                              </span>
                            </div>
                            {day.schedule.agency && (
                              <p className="text-xs text-blue-600">
                                📍 {day.schedule.agency.name}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">Aucun planning</span>
                        )}
                      </div>
                    </div>

                    {/* Pointages réels */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Réalisé</p>
                      <div className="space-y-1">
                        {day.timesheet ? (
                          <>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-700">
                                {formatTime(day.timesheet.startTime)} - {formatTime(day.timesheet.endTime)}
                              </span>
                            </div>
                            
                            {/* Afficher l'écart s'il y en a un */}
                            {day.timesheet.variance && (
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(day.timesheet.variance)}
                                <span className={`text-xs ${getVarianceColor(day.timesheet.variance)}`}>
                                  {day.timesheet.variance.label}
                                </span>
                              </div>
                            )}

                            {/* Temps travaillé */}
                            {day.timesheet.totalWorkedMinutes > 0 && (
                              <p className="text-xs text-gray-600">
                                ⏱️ {Math.floor(day.timesheet.totalWorkedMinutes / 60)}h{String(day.timesheet.totalWorkedMinutes % 60).padStart(2, '0')} travaillées
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">Pas encore pointé</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pauses si présentes */}
                  {(day.schedule?.breakStart || day.timesheet?.breakStart) && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Pauses</p>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          {day.schedule?.breakStart && (
                            <span className="text-gray-600">
                              📋 {day.schedule.breakStart} - {day.schedule.breakEnd || 'Variable'}
                            </span>
                          )}
                        </div>
                        <div>
                          {day.timesheet?.breakStart && (
                            <span className="text-gray-700">
                              ☕ {formatTime(day.timesheet.breakStart)} - {formatTime(day.timesheet.breakEnd) || 'En cours'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Jour libre */
                <div className="text-center py-2">
                  <span className="text-gray-400 text-sm">Repos</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}