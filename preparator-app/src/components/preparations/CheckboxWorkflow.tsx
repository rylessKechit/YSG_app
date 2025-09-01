// ========================================
// FICHIER: preparator-app/src/components/preparations/CheckboxWorkflow.tsx
// ✅ NOUVEAU COMPOSANT : Workflow simplifié avec checkboxes
// ========================================

'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, Clock, Car, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import type { Preparation, PreparationStep } from '@/lib/types';

// ✅ Définition des étapes (même que l'ancien système)
const PREPARATION_STEPS = [
  {
    step: 'exterior',
    label: 'Préparation extérieure',
    description: 'Nettoyage et contrôle de l\'extérieur du véhicule',
    icon: '🚗'
  },
  {
    step: 'interior',
    label: 'Préparation intérieure', 
    description: 'Nettoyage et vérification de l\'intérieur',
    icon: '🪑'
  },
  {
    step: 'fuel',
    label: 'Contrôle carburant',
    description: 'Mise à niveau de carburant',
    icon: '⛽'
  },
  {
    step: 'special_wash',
    label: 'Nettoyage spécialisé',
    description: 'Traitements spéciaux si nécessaire',
    icon: '✨'
  }
];

interface CheckboxWorkflowProps {
  preparation: Preparation;
  onStepComplete?: (stepType: string) => void;
  onComplete?: () => void;
}

export function CheckboxWorkflow({ preparation, onStepComplete, onComplete }: CheckboxWorkflowProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [completingStep, setCompletingStep] = useState<string | null>(null);
  const [stepNotes, setStepNotes] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);

  // Calculer la progression
  const completedStepsCount = preparation.steps.filter(step => step.completed).length;
  const totalSteps = preparation.steps.length;
  const progressPercentage = Math.round((completedStepsCount / totalSteps) * 100);

  // Calculer la durée
  const durationMinutes = Math.floor((new Date().getTime() - new Date(preparation.startTime).getTime()) / (1000 * 60));
  const isOnTime = durationMinutes <= 30;

  // ✅ Fonction pour compléter une étape (SANS photo)
  const handleStepToggle = async (stepType: string, isCompleted: boolean) => {
    if (isCompleted) {
      // Si on décoche, ne rien faire pour l'instant (optionnel: permettre de décocher)
      return;
    }

    setCompletingStep(stepType);
    setError(null);

    try {
      // ✅ NOUVEAU : Appel API sans photo, juste avec les notes
      const response = await apiClient.put(`/preparations/${preparation.id}/step`, {
        step: stepType,
        notes: stepNotes[stepType] || ''
      });

      if (response.data.success) {
        console.log(`✅ Étape ${stepType} complétée`);
        onStepComplete?.(stepType);
        
        // Vider les notes de cette étape
        setStepNotes(prev => ({ ...prev, [stepType]: '' }));
      }

    } catch (error: any) {
      console.error(`❌ Erreur complétion étape ${stepType}:`, error);
      setError(error.response?.data?.message || `Erreur lors de la complétion de l'étape ${stepType}`);
    } finally {
      setCompletingStep(null);
    }
  };

  // ✅ Fonction pour terminer la préparation
  const handleCompletePreparation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post(`/preparations/${preparation.id}/complete`);
      
      if (response.data.success) {
        console.log('✅ Préparation terminée');
        onComplete?.();
      }
    } catch (error: any) {
      console.error('❌ Erreur fin préparation:', error);
      setError(error.response?.data?.message || 'Erreur lors de la finalisation');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour mettre à jour les notes d'une étape
  const handleNotesChange = (stepType: string, notes: string) => {
    setStepNotes(prev => ({ ...prev, [stepType]: notes }));
  };

  // Vérifier si toutes les étapes sont complétées
  const allStepsCompleted = completedStepsCount > 0;

  return (
    <div className="space-y-6">
      {/* Header avec progression */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {preparation.vehicle.brand} {preparation.vehicle.model}
              </h2>
              <p className="text-gray-600">{preparation.vehicle.licensePlate}</p>
            </div>
            <div className="text-right">
              <div className={cn("text-2xl font-bold", isOnTime ? "text-green-600" : "text-orange-600")}>
                {Math.floor(durationMinutes / 60)}h{String(durationMinutes % 60).padStart(2, '0')}
              </div>
              <p className="text-sm text-gray-500">
                {isOnTime ? 'Dans les temps' : 'Attention au délai'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Progression: {completedStepsCount}/{totalSteps} étapes
              </span>
              <span className="text-sm font-medium text-gray-900">
                {progressPercentage}%
              </span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Message d'erreur */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* ✅ Liste des étapes avec checkboxes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Car className="h-5 w-5 text-blue-600" />
            <span>Étapes de préparation</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {PREPARATION_STEPS.map((stepDef) => {
            const step = preparation.steps.find(s => s.step === stepDef.step);
            const isCompleted = step?.completed || false;
            const isCurrentlyCompleting = completingStep === stepDef.step;

            return (
              <div
                key={stepDef.step}
                className={cn(
                  "border rounded-lg p-4 transition-all duration-200",
                  isCompleted 
                    ? "border-green-200 bg-green-50" 
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <div className="flex items-start space-x-3">
                  {/* ✅ Checkbox personnalisée */}
                  <div className="flex items-center pt-1">
                    {isCurrentlyCompleting ? (
                      <div className="w-5 h-5 border-2 border-blue-500 rounded flex items-center justify-center">
                        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                      </div>
                    ) : (
                      <Checkbox
                        id={stepDef.step}
                        checked={isCompleted}
                        onCheckedChange={(checked) => handleStepToggle(stepDef.step, isCompleted)}
                        className="w-5 h-5"
                      />
                    )}
                  </div>

                  <div className="flex-1">
                    {/* Titre et description */}
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{stepDef.icon}</span>
                      <h3 className={cn(
                        "font-medium",
                        isCompleted ? "text-green-800" : "text-gray-900"
                      )}>
                        {stepDef.label}
                      </h3>
                      {isCompleted && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Terminé
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {stepDef.description}
                    </p>

                    {/* Informations de complétion */}
                    {isCompleted && step?.completedAt && (
                      <div className="flex items-center space-x-2 text-xs text-green-700 mb-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          Terminé le {new Date(step.completedAt).toLocaleDateString('fr-FR')} à{' '}
                          {new Date(step.completedAt).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    )}

                    {/* Notes existantes */}
                    {isCompleted && step?.notes && (
                      <div className="bg-green-100 border border-green-200 rounded p-2 text-sm text-green-800">
                        <strong>Notes :</strong> {step.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ✅ Bouton de finalisation */}
      {allStepsCompleted && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              
              <p className="text-green-700">
                Vous pouvez maintenant finaliser cette préparation.
              </p>

              <Button
                onClick={handleCompletePreparation}
                disabled={isLoading}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalisation...
                  </>
                ) : (
                  'Terminer la préparation'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message d'encouragement si pas toutes les étapes */}
      {!allStepsCompleted && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <p className="text-blue-800">
                <strong>{totalSteps - completedStepsCount}</strong> étape{totalSteps - completedStepsCount > 1 ? 's' : ''} restante{totalSteps - completedStepsCount > 1 ? 's' : ''}. 
                Cochez les cases au fur et à mesure de l'avancement.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}