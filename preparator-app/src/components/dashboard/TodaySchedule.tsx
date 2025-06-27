'use client';

import { Clock, MapPin, Coffee, Play, Square } from 'lucide-react';

interface TodayScheduleProps {
  schedule?: {
    agency: {
      name: string;
      code: string;
    };
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
    workingDuration: number;
  } | null;
  currentStatus?: {
    status: 'not_started' | 'working' | 'on_break' | 'finished';
    currentTime?: string;
    workedTime?: string;
  } | null;
  isLoading?: boolean;
}

function formatTime(minutes: number): string {
  if (!minutes || minutes === 0) return '0min';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : `${mins}min`;
}

export function TodaySchedule({ schedule, currentStatus, isLoading }: TodayScheduleProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Aucun planning aujourd'hui</p>
            <p className="text-sm text-amber-700">Contactez votre responsable si nécessaire</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    switch (currentStatus?.status) {
      case 'not_started': return 'text-gray-500';
      case 'working': return 'text-green-600';
      case 'on_break': return 'text-orange-600';
      case 'finished': return 'text-blue-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusLabel = () => {
    switch (currentStatus?.status) {
      case 'not_started': return 'Pas encore commencé';
      case 'working': return 'En service';
      case 'on_break': return 'En pause';
      case 'finished': return 'Service terminé';
      default: return 'Statut inconnu';
    }
  };

  const getStatusIcon = () => {
    switch (currentStatus?.status) {
      case 'not_started': return <Clock className="w-4 h-4" />;
      case 'working': return <Play className="w-4 h-4" />;
      case 'on_break': return <Coffee className="w-4 h-4" />;
      case 'finished': return <Square className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatTimeRange = (start: string, end: string) => {
    return `${start} - ${end}`;
  };

  const calculateProgress = () => {
    if (!currentStatus?.workedTime || currentStatus.status === 'not_started') return 0;
    
    const totalMinutes = schedule.workingDuration;
    const workedMinutes = parseTimeToMinutes(currentStatus.workedTime);
    
    return Math.min((workedMinutes / totalMinutes) * 100, 100);
  };

  const parseTimeToMinutes = (timeStr: string) => {
    const match = timeStr.match(/(\d+)h(\d+)/);
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    return 0;
  };

  const progress = calculateProgress();

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <span>Planning du jour</span>
        </h3>
        <span className={`text-sm font-medium ${getStatusColor()} flex items-center space-x-1`}>
          {getStatusIcon()}
          <span>{getStatusLabel()}</span>
        </span>
      </div>

      {/* Informations agence */}
      <div className="flex items-center space-x-2 mb-3">
        <MapPin className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-700">
          {schedule.agency.name} ({schedule.agency.code})
        </span>
      </div>

      {/* Horaires */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Service</p>
          <p className="font-medium text-gray-900">
            {formatTimeRange(schedule.startTime, schedule.endTime)}
          </p>
        </div>
        
        {schedule.breakStart && schedule.breakEnd && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Pause</p>
            <p className="font-medium text-gray-900">
              {formatTimeRange(schedule.breakStart, schedule.breakEnd)}
            </p>
          </div>
        )}
      </div>

      {/* Temps travaillé */}
      {currentStatus?.workedTime && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              Temps travaillé
            </span>
            <span className="text-sm font-medium text-gray-900">
              {currentStatus.workedTime} / {formatTime(schedule.workingDuration)}
            </span>
          </div>
          
          {/* Barre de progression */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Heure actuelle */}
      <div className="text-center pt-2 border-t border-gray-100">
        <p className="text-sm text-gray-500">
          Maintenant: <span className="font-medium text-gray-900">
            {new Date().toLocaleTimeString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </p>
      </div>
    </div>
  );
}