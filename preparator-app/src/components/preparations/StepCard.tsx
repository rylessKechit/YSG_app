// preparator-app/src/components/preparations/StepCard.tsx
// ✅ NOUVEAU: Composant d'étape avec bouton photo flexible

'use client';

import React from 'react';
import { Camera, CheckCircle2, Clock, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StepDefinition {
  step: string;
  label: string;
  description: string;
  icon: string;
}

interface StepCardProps {
  step: any; // Étape du backend
  stepDefinition: StepDefinition;
  index: number;
  onTakePhoto: (stepType: string) => void;
  onViewPhoto: (photoUrl: string) => void;
  isLoading?: boolean;
  canStartStep?: boolean; // Nouvelle prop pour gérer la disponibilité
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  stepDefinition,
  index,
  onTakePhoto,
  onViewPhoto,
  isLoading = false,
  canStartStep = true // Par défaut, toutes les étapes sont disponibles
}) => {
  const isCompleted = step.completed;
  const hasPhoto = step.photos && step.photos.length > 0;
  const photoUrl = hasPhoto ? step.photos[0].url : null;

  return (
    <Card className={`transition-all duration-200 ${
      isCompleted 
        ? 'bg-green-50 border-green-200 shadow-sm' 
        : canStartStep
          ? 'bg-white border-gray-200 shadow-sm hover:shadow-md'
          : 'bg-gray-50 border-gray-200'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Partie gauche: Numéro, emoji, infos */}
          <div className="flex items-center space-x-3 flex-1">
            {/* Numéro/Status */}
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
              ${isCompleted 
                ? 'bg-green-500 text-white' 
                : canStartStep
                  ? 'bg-blue-100 text-blue-600 border-2 border-blue-200'
                  : 'bg-gray-200 text-gray-500'
              }
            `}>
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>

            {/* Emoji et texte */}
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xl">{stepDefinition.icon}</span>
                <h3 className={`font-semibold ${
                  isCompleted ? 'text-green-700' : 'text-gray-900'
                }`}>
                  {stepDefinition.label}
                </h3>
                
                {/* Badge de statut */}
                {isCompleted && (
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    Terminé
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                {stepDefinition.description}
              </p>

              {/* Infos complémentaires */}
              {isCompleted && (
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {step.completedAt && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(step.completedAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                  
                  {hasPhoto && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <Camera className="h-3 w-3" />
                      <span>Photo validée</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Partie droite: Boutons d'action */}
          <div className="flex items-center space-x-2">
            {isCompleted ? (
              // ✅ ÉTAPE TERMINÉE : Bouton voir photo
              hasPhoto && (
                <Button
                  onClick={() => onViewPhoto(photoUrl)}
                  variant="outline"
                  size="sm"
                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )
            ) : (
              // 📸 ÉTAPE EN ATTENTE : Bouton prendre photo
              <Button
                onClick={() => onTakePhoto(stepDefinition.step)}
                disabled={!canStartStep || isLoading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[44px]"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Notes si présentes */}
        {step.notes && isCompleted && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
            <strong>Notes:</strong> {step.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
};