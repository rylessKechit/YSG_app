import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  currentDuration: number;
  maxDuration?: number;
  showTime?: boolean;
  variant?: 'default' | 'warning' | 'danger';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  currentDuration,
  maxDuration = 30,
  showTime = true,
  variant = 'default'
}) => {
  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'warning':
        return 'bg-yellow-600';
      case 'danger':
        return 'bg-red-600';
      default:
        return 'bg-blue-600';
    }
  };

  const getTimeColor = () => {
    if (currentDuration > maxDuration) return 'text-red-600';
    if (currentDuration > maxDuration * 0.8) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-2">
      {showTime && (
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className={getTimeColor()}>
              {formatTime(currentDuration)} / {maxDuration}min
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{Math.round(progress)}%</span>
          </div>
        </div>
      )}
      
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div 
          className={`h-3 rounded-full transition-all duration-300 ${getVariantClasses()}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      
      {currentDuration > maxDuration && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Dépassement de {formatTime(currentDuration - maxDuration)}
        </p>
      )}
    </div>
  );
};