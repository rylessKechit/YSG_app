// preparator-app/src/components/preparations/PreparationCard.tsx
// ✅ MISE À JOUR: Compatible avec le workflow flexible

import React from 'react';
import { Car, Clock, CheckCircle, AlertTriangle, MapPin, Camera, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ✅ Interface mise à jour pour correspondre au nouveau modèle
interface PreparationStep {
  step: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  photos?: Array<{
    url: string;
    description: string;
    uploadedAt: string;
  }>;
}

interface Preparation {
  id: string;
  vehicle: {
    id: string;
    licensePlate: string;
    brand: string;
    model: string;
  };
  agency: {
    id: string;
    name: string;
    code: string;
  };
  status: 'in_progress' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  steps: PreparationStep[];
  progress: number;
  currentDuration: number; // Pour les préparations en cours
  totalTime?: number; // Pour les préparations terminées
  isOnTime?: boolean;
  notes?: string;
  issues?: any[]; // Incidents signalés
}

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
  // ✅ Calculs mis à jour pour le workflow flexible
  const completedStepsCount = preparation.steps.filter(s => s.completed).length;
  const totalStepsCount = preparation.steps.length;
  const hasPhotos = preparation.steps.some(s => s.photos && s.photos.length > 0);
  const issuesCount = preparation.issues?.length || 0;

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
          <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
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

  // ✅ Badge pour indiquer si c'est une préparation partielle
  const getCompletionBadge = () => {
    if (preparation.status !== 'completed') return null;
    
    const isPartial = completedStepsCount < totalStepsCount;
    
    if (isPartial) {
      return (
        <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200 text-xs">
          <AlertTriangle className="w-3 h-3" />
          Partielle ({completedStepsCount}/{totalStepsCount})
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200 text-xs">
        <CheckCircle className="w-3 h-3" />
        Complète ({completedStepsCount}/{totalStepsCount})
      </Badge>
    );
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

              {/* ✅ Indicateurs visuels supplémentaires */}
              {!compact && (
                <div className="flex items-center gap-2 mt-1">
                  {hasPhotos && (
                    <Badge variant="outline" className="gap-1 bg-green-50 text-green-600 border-green-200 text-xs">
                      <Camera className="w-3 h-3" />
                      Photos
                    </Badge>
                  )}
                  
                  {issuesCount > 0 && (
                    <Badge variant="outline" className="gap-1 bg-red-50 text-red-600 border-red-200 text-xs">
                      <AlertTriangle className="w-3 h-3" />
                      {issuesCount} incident{issuesCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-right space-y-2">
            {getStatusBadge()}
            
            {/* ✅ Badge de completion pour les préparations terminées */}
            {!compact && getCompletionBadge()}
            
            <div className="text-sm">
              {preparation.status === 'in_progress' ? (
                <div>
                  <p className="font-medium text-blue-600">
                    {Math.round(preparation.progress)}%
                  </p>
                  <p className="text-xs text-blue-500">
                    {formatDuration(preparation.currentDuration)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {completedStepsCount}/{totalStepsCount} étapes
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-gray-600">
                    {/* ✅ Utiliser totalTime au lieu de totalMinutes */}
                    {formatDuration(preparation.totalTime)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {completedStepsCount}/{totalStepsCount} étapes
                  </p>
                  {issuesCount > 0 && (
                    <p className="text-xs text-red-600">
                      {issuesCount} incident{issuesCount > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ✅ Barre de progression mise à jour */}
        {preparation.status === 'in_progress' && !compact && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progression</span>
              <span>{completedStepsCount}/{totalStepsCount} étapes complétées</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${preparation.progress}%` }}
              />
            </div>
            
            {/* ✅ Message informatif sur la flexibilité */}
            {completedStepsCount > 0 && completedStepsCount < totalStepsCount && (
              <p className="text-xs text-blue-600 mt-2 text-center">
                💡 Vous pouvez terminer cette préparation maintenant
              </p>
            )}
          </div>
        )}

        {/* ✅ Résumé des étapes pour les préparations terminées */}
        {preparation.status === 'completed' && !compact && completedStepsCount < totalStepsCount && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-700">
              <strong>Préparation partielle :</strong> {completedStepsCount} étapes sur {totalStepsCount} ont été réalisées.
            </p>
            {preparation.notes && (
              <p className="text-xs text-amber-600 mt-1">
                Notes : {preparation.notes}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};