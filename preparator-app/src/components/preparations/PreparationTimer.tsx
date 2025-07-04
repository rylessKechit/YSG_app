// components/preparation/PreparationTimer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PreparationTimerProps {
  startTime: Date;
  isOnTime: boolean;
  targetDuration?: number; // en minutes, par défaut 30
}

export const PreparationTimer: React.FC<PreparationTimerProps> = ({
  startTime,
  isOnTime,
  targetDuration = 30
}) => {
  const [elapsed, setElapsed] = useState<number>(0);
  const [formattedTime, setFormattedTime] = useState<string>('00:00');

  // Calculer le temps écoulé
  useEffect(() => {
    const updateElapsed = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - new Date(startTime).getTime()) / 1000);
      setElapsed(diff);
    };

    // Mise à jour initiale
    updateElapsed();

    // Mise à jour toutes les secondes
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Formater le temps
  useEffect(() => {
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    setFormattedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  }, [elapsed]);

  const elapsedMinutes = Math.floor(elapsed / 60);
  const isOvertime = elapsedMinutes > targetDuration;
  const progressPercentage = Math.min((elapsedMinutes / targetDuration) * 100, 100);

  return (
    <div className="space-y-2">
      {/* Temps principal */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Temps écoulé</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`font-mono text-lg font-semibold ${
            isOvertime ? 'text-red-600' : 'text-gray-900'
          }`}>
            {formattedTime}
          </span>
          
          <Badge variant={isOnTime ? "default" : "destructive"} className="text-xs">
            {isOnTime ? 'À l\'heure' : 'En retard'}
          </Badge>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>0 min</span>
          <span className={isOvertime ? 'text-red-600 font-semibold' : ''}>
            {elapsedMinutes} / {targetDuration} min
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              isOvertime 
                ? 'bg-red-500' 
                : progressPercentage > 80 
                  ? 'bg-orange-500' 
                  : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Alerte dépassement */}
      {isOvertime && (
        <div className="flex items-center text-red-600 text-sm bg-red-50 p-2 rounded">
          <AlertTriangle className="h-4 w-4 mr-1" />
          <span>Temps de préparation dépassé de {elapsedMinutes - targetDuration} minute(s)</span>
        </div>
      )}
    </div>
  );
};