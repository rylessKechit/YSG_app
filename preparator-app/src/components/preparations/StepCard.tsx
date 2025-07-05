// preparator-app/src/components/preparations/StepCard.tsx
// ✅ Composant StepCard corrigé avec boutons d'action

'use client';

import React from 'react';
import { Camera, CheckCircle2, Eye, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StepCardProps {
  step: {
    step: string;
    label: string;
    completed: boolean;
    photoUrl?: string;
    completedAt?: Date;
    notes?: string;
  };
  stepDefinition: {
    step: string;
    label: string;
    description: string;
    icon: string;
  };
  isNext: boolean;
  isCompleted: boolean;
  index: number;
  onStartStep: (stepType: string) => void;
  onViewPhoto?: (photoUrl: string) => void;
  isLoading?: boolean;
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  stepDefinition,
  isNext,
  isCompleted,
  index,
  onStartStep,
  onViewPhoto,
  isLoading = false
}) => {
  const handleStartStep = () => {
    if (!isLoading && isNext) {
      onStartStep(stepDefinition.step);
    }
  };

  const handleViewPhoto = () => {
    if (step.photoUrl && onViewPhoto) {
      onViewPhoto(step.photoUrl);
    }
  };

  return (
    <Card className={`transition-all duration-200 ${
      isCompleted 
        ? 'bg-green-50 border-green-200 shadow-sm' 
        : isNext
          ? 'bg-blue-50 border-blue-200 shadow-md ring-2 ring-blue-100'
          : 'bg-gray-50 border-gray-200'
    }`}>
      <CardContent className="p-4">
        {/* Header de l'étape */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {/* Icône de statut */}
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
              ${isCompleted 
                ? 'bg-green-500 text-white' 
                : isNext
                  ? 'bg-blue-500 text-white animate-pulse'
                  : 'bg-gray-300 text-gray-600'
              }
            `}>
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            
            {/* Titre et description */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                <span>{stepDefinition.icon}</span>
                <span>{stepDefinition.label}</span>
                {isNext && !isCompleted && (
                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                    À faire
                  </Badge>
                )}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {stepDefinition.description}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Bouton voir photo si disponible */}
            {step.photoUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewPhoto}
                className="text-gray-500 hover:text-gray-700"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            
            {/* ✅ BOUTON PRINCIPAL POUR COMMENCER L'ÉTAPE */}
            {isNext && !isCompleted && (
              <Button
                onClick={handleStartStep}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
                size="sm"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Chargement...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Camera className="h-4 w-4" />
                    <span>Commencer</span>
                  </div>
                )}
              </Button>
            )}

            {/* Message si étape bloquée */}
            {!isNext && !isCompleted && (
              <div className="text-xs text-gray-500 text-center">
                <Clock className="h-4 w-4 mx-auto mb-1" />
                <div>En attente</div>
              </div>
            )}
          </div>
        </div>

        {/* Informations de completion */}
        {isCompleted && step.completedAt && (
          <div className="text-xs text-green-600 bg-green-100 rounded px-2 py-1 mb-2">
            ✅ Complété à {new Date(step.completedAt).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}

        {/* Notes de l'étape */}
        {step.notes && (
          <div className="mt-3 p-2 bg-gray-100 rounded text-sm">
            <strong className="text-gray-700">Notes:</strong>
            <p className="text-gray-600 mt-1">{step.notes}</p>
          </div>
        )}

        {/* Instructions si c'est l'étape active */}
        {isNext && !isCompleted && (
          <div className="mt-3 p-3 bg-blue-100 rounded border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>📸 Étape suivante :</strong> Cliquez sur "Commencer" pour prendre une photo et valider cette étape.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};