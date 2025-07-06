import React from 'react';
import { Car, Clock, CheckCircle, AlertTriangle, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Preparation } from '@/lib/api/preparations';

interface PreparationCardProps {
  preparation: Preparation;
  onClick?: () => void;
  showAgency?: boolean;
  compact?: boolean;
}

export const PreparationCard: React.FC<PreparationCardProps> = ({
  preparation,
  onClick,
  showAgency = true,
  compact = false
}) => {
  const getStatusBadge = () => {
    switch (preparation.status) {
      case 'completed':
        return (
          <Badge variant={preparation.isOnTime ? 'default' : 'secondary'} className="gap-1">
            <CheckCircle className="w-3 h-3" />
            {preparation.isOnTime ? 'Terminé' : 'Terminé (retard)'}
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            En cours
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Annulé
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        preparation.status === 'in_progress' ? 'border-blue-200 bg-blue-50' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className={compact ? 'p-4' : 'p-6'}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              preparation.status === 'in_progress' ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <Car className={`w-6 h-6 ${
                preparation.status === 'in_progress' ? 'text-blue-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {preparation.vehicle.licensePlate}
              </p>
              <p className="text-sm text-gray-600">
                {preparation.vehicle.brand} {preparation.vehicle.model}
              </p>
              {showAgency && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {preparation.agency.name}
                </p>
              )}
              {!compact && (
                <p className="text-xs text-gray-500">
                  {new Date(preparation.startTime).toLocaleDateString('fr-FR')} • {
                    new Date(preparation.startTime).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  }
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right space-y-2">
            {getStatusBadge()}
            <div className="text-sm">
              {preparation.status === 'in_progress' ? (
                <div>
                  <p className="font-medium text-blue-600">
                    {Math.round(preparation.progress)}%
                  </p>
                  <p className="text-xs text-blue-500">
                    {formatDuration(preparation.currentDuration)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-gray-600">
                    {formatDuration(preparation.totalMinutes)}
                  </p>
                  {preparation.issuesCount > 0 && (
                    <p className="text-xs text-red-600">
                      {preparation.issuesCount} incident{preparation.issuesCount > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {preparation.status === 'in_progress' && !compact && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progression</span>
              <span>{preparation.steps.filter(s => s.completed).length}/{preparation.steps.length} étapes</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${preparation.progress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};