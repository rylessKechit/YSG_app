// components/preparations/PreparationStepsList.tsx
'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, Clock, Camera, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PreparationStep } from '@/lib/types';
import { PREPARATION_STEPS } from '@/lib/types';

interface PreparationStepsListProps {
  steps: PreparationStep[];
}

export function PreparationStepsList({ steps }: PreparationStepsListProps) {
  // Créer un map des étapes pour un accès facile
  const stepsMap = new Map(steps.map(step => [step.step, step]));
  
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const getStepDetails = (stepDef: typeof PREPARATION_STEPS[number]) => {
    const stepData = stepsMap.get(stepDef.step);
    return {
      ...stepDef,
      ...stepData,
      completed: stepData?.completed || false
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Check className="h-5 w-5 text-green-600" />
          <span>Détails des étapes</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {PREPARATION_STEPS.map((stepDef, index) => {
            const step = getStepDetails(stepDef);
            
            return (
              <div
                key={step.step}
                className={`
                  p-4 rounded-lg border-2 transition-all duration-200
                  ${step.completed 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50 opacity-60'
                  }
                `}
              >
                {/* En-tête de l'étape */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{step.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{step.label}</h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                  
                  {step.completed ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <Check className="h-3 w-3 mr-1" />
                      Terminée
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      Non réalisée
                    </Badge>
                  )}
                </div>

                {/* Détails si l'étape est complétée */}
                {step.completed && (
                  <div className="space-y-3 pt-3 border-t border-green-200">
                    {/* Timing */}
                    <div className="flex items-center justify-between text-sm">
                      {step.completedAt && (
                        <div className="flex items-center space-x-1 text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>
                            Terminée le {format(new Date(step.completedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                          </span>
                        </div>
                      )}
                      
                      {step.duration && (
                        <div className="text-gray-900 font-medium">
                          Durée: {formatDuration(step.duration)}
                        </div>
                      )}
                    </div>

                    {/* Photos */}
                    {step.photos && step.photos.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Camera className="h-4 w-4" />
                          <span>{step.photos.length} photo{step.photos.length > 1 ? 's' : ''} prise{step.photos.length > 1 ? 's' : ''}</span>
                        </div>
                        
                        {/* Miniatures des photos */}
                        <div className="flex flex-wrap gap-2">
                          {step.photos.slice(0, 3).map((photo, photoIndex) => (
                            <div key={photoIndex} className="relative">
                              <img
                                src={photo.url}
                                alt={photo.description || `Photo étape ${step.label}`}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                              />
                              {step.photos && step.photos.length > 3 && photoIndex === 2 && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                  <span className="text-white text-xs font-medium">
                                    +{step.photos.length - 3}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {step.notes && (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <FileText className="h-4 w-4" />
                          <span>Notes:</span>
                        </div>
                        <p className="text-sm text-gray-700 italic bg-white p-2 rounded border">
                          "{step.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Statistiques des étapes */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {steps.filter(s => s.completed).length}
              </p>
              <p className="text-sm text-gray-600">Étapes réalisées</p>
            </div>
            
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {PREPARATION_STEPS.length}
              </p>
              <p className="text-sm text-gray-600">Étapes totales</p>
            </div>
            
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {steps.reduce((sum, step) => sum + (step.photos?.length || 0), 0)}
              </p>
              <p className="text-sm text-gray-600">Photos prises</p>
            </div>
            
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round((steps.filter(s => s.completed).length / PREPARATION_STEPS.length) * 100)}%
              </p>
              <p className="text-sm text-gray-600">Complétude</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}