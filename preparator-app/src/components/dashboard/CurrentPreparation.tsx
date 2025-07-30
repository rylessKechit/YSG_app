'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Car, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { formatWorkTime } from '@/lib/utils';
import { getSafeVehicleDisplay, getSafeLicensePlate, adaptLegacyPreparation, PREPARATION_STEPS } from '@/lib/types/preparation';
import type { Preparation } from '@/lib/types/preparation';

interface CurrentPreparationProps {
  preparation: any; // ✅ Accept any pour compatibilité
}

export function CurrentPreparation({ preparation: rawPreparation }: CurrentPreparationProps) {
  const router = useRouter();
  
  // ✅ Adapter la préparation si nécessaire
  const preparation = adaptLegacyPreparation(rawPreparation);
  
  // ✅ Affichage sécurisé du véhicule (fonctionne avec tous les formats)
  const vehicleDisplay = getSafeVehicleDisplay(preparation.vehicle);
  const licensePlate = getSafeLicensePlate(preparation.vehicle?.licensePlate);
  
  // Calculs de progression
  const totalSteps = preparation.steps?.length || 0;
  const completedSteps = preparation.steps?.filter(step => step.completed).length || 0;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  
  // Prochaines étapes
  const nextSteps = preparation.steps?.filter(step => !step.completed).slice(0, 2) || [];
  
  // Couleur du temps basée sur la performance
  const getTimeColor = () => {
    if (preparation.isOnTime === false) return 'text-red-600';
    if (preparation.currentDuration > 90) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusBadge = () => {
    switch (preparation.status) {
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500">En cours</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Terminée</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge variant="outline">Statut inconnu</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <Car className="w-5 h-5 text-blue-600" />
            <span>Préparation en cours</span>
            {getStatusBadge()}
          </div>
          <div className={`flex items-center space-x-1 ${getTimeColor()}`}>
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">
              {formatWorkTime(preparation.currentDuration)}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* ✅ Informations véhicule avec affichage sécurisé unifié */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {licensePlate}
              </p>
              <p className="text-sm text-gray-600">
                {vehicleDisplay.fullName}
              </p>
              {!vehicleDisplay.hasValidData && (
                <p className="text-xs text-amber-600 flex items-center mt-1">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Données incomplètes
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {preparation.agency.name}
              </p>
              <p className="text-xs text-gray-400">
                {preparation.agency.client}
              </p>
            </div>
          </div>
        </div>

        {/* Progression */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progression</span>
            <span className="font-medium">
              {completedSteps} / {totalSteps} étapes
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-center text-sm text-gray-500">
            {progressPercent}% terminé
          </p>
        </div>

        {/* Prochaines étapes */}
        {nextSteps.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Prochaines étapes</h4>
            <div className="space-y-1">
              {nextSteps.map((step, index) => (
                <div key={step.step} className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-gray-300 rounded-full mr-2" />
                  <span>
                    {PREPARATION_STEPS.find(s => s.step === step.step)?.label || step.step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <Button 
            onClick={() => router.push(`/preparations/${preparation.id}`)}
            className="flex-1"
          >
            Continuer
          </Button>
          
          {preparation.status === 'in_progress' && (
            <Button 
              variant="outline"
              onClick={() => router.push(`/preparations/${preparation.id}/complete`)}
              className="flex-1"
            >
              Terminer
            </Button>
          )}
        </div>

        {/* Issues si présentes */}
        {preparation.issues && preparation.issues.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <span className="font-medium">
                {preparation.issues.length} incident{preparation.issues.length > 1 ? 's' : ''} signalé{preparation.issues.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}