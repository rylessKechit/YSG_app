// preparator-app/src/components/preparations/StepCard.tsx
// ✅ Composant StepCard avec workflow flexible - TOUTES LES ERREURS CORRIGÉES

'use client';

import React from 'react';
import { Camera, CheckCircle2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// ✅ Types corrects et explicites
interface PreparationStepData {
  step: string;
  label: string;
  completed: boolean;
  photoUrl?: string;
  completedAt?: Date;
  notes?: string;
}

interface StepDefinition {
  step: string;
  label: string;
  description: string;
  icon: string;
}

interface StepCardProps {
  step: PreparationStepData;
  stepDefinition: StepDefinition;
  isCompleted: boolean;
  index: number;
  onStartStep: (stepType: string) => void;
  onViewPhoto?: (photoUrl: string) => void;
  isLoading?: boolean;
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  stepDefinition,
  isCompleted,
  index,
  onStartStep,
  onViewPhoto,
  isLoading = false
}) => {
  const handleStartStep = () => {
    if (!isLoading && !isCompleted) {
      onStartStep(stepDefinition.step);
    }
  };

  const handleViewPhoto = () => {
    if (step.photoUrl && onViewPhoto) {
      onViewPhoto(step.photoUrl);
    }
  };

  return (
    <Card className={`transition-all duration-300 ${
      isCompleted 
        ? 'bg-green-50 border-green-200 shadow-md hover:shadow-lg' 
        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md shadow-sm'
    }`}>
      <CardContent className="p-4">
        {/* Header de l'étape */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {/* Icône de statut améliorée */}
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm border-2
              ${isCompleted 
                ? 'bg-green-500 text-white border-green-400 shadow-green-200' 
                : 'bg-blue-500 text-white border-blue-400 shadow-blue-200'
              }
            `}>
              {isCompleted ? (
                <CheckCircle2 className="h-6 w-6" strokeWidth={2.5} />
              ) : (
                <span className="text-base font-bold">{index + 1}</span>
              )}
            </div>
            
            {/* Titre et description */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 flex items-center space-x-3">
                <span className="text-2xl">{stepDefinition.icon}</span>
                <span className="text-base">{stepDefinition.label}</span>
                {isCompleted && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                    ✅ Terminé
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {stepDefinition.description}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Bouton voir photo si disponible - Amélioré */}
            {step.photoUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewPhoto}
                className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full w-10 h-10 p-0 transition-all duration-200"
              >
                <Eye className="h-5 w-5" strokeWidth={2} />
              </Button>
            )}
            
            {/* ✅ BOUTON CAMÉRA AMÉLIORÉ - Plus beau et plus visible */}
            {!isCompleted && (
              <Button
                onClick={handleStartStep}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 w-12 h-12 rounded-full p-0 border-2 border-blue-500"
                size="sm"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Camera className="h-6 w-6" strokeWidth={2.5} />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Informations de completion - Style amélioré */}
        {isCompleted && step.completedAt && (
          <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-2 border border-green-200">
            <div className="flex items-center space-x-1">
              <CheckCircle2 className="h-3 w-3" />
              <span className="font-medium">Terminé à {new Date(step.completedAt).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
          </div>
        )}

        {/* Notes de l'étape - Style amélioré */}
        {step.notes && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-1 h-4 bg-blue-400 rounded-full mt-0.5 flex-shrink-0"></div>
              <div>
                <strong className="text-gray-800 font-medium">Notes:</strong>
                <p className="text-gray-600 mt-1 leading-relaxed">{step.notes}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};