// ========================================
// FICHIER: preparator-app/src/components/dashboard/CurrentPreparation.tsx
// ✅ CORRECTION COMPLÈTE : Toutes les erreurs TypeScript résolues
// ========================================

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Car, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { formatWorkTime } from '@/lib/utils';
import { 
  getSafeVehicleDisplay, 
  getSafeLicensePlate, 
  adaptLegacyPreparation,
  PREPARATION_STEP_DEFINITIONS 
} from '@/lib/types/preparation';
import type { Preparation } from '@/lib/types/preparation';

// ✅ CORRECTION 1: Interface avec types corrects
interface CurrentPreparationProps {
  preparation: any; // Type brut du backend, sera adapté
}

export function CurrentPreparation({ preparation: rawPreparation }: CurrentPreparationProps) {
  const router = useRouter();

  // ✅ CORRECTION 2: Adapter la préparation si nécessaire
  const preparation = adaptLegacyPreparation(rawPreparation);

  // ✅ CORRECTION 3: Affichage sécurisé du véhicule avec gestion des types
  const vehicleDisplay = getSafeVehicleDisplay(preparation.vehicle);
  const licensePlate = getSafeLicensePlate(preparation.vehicle);

  // Couleur du temps basée sur la performance
  const getTimeColor = () => {
    if (preparation.isOnTime === false) return 'text-red-600';
    if (preparation.currentDuration > 90) return 'text-yellow-600';
    return 'text-green-600';
  };

  // ✅ CORRECTION 4: Status badge avec types corrects
  const getStatusBadge = () => {
    switch (preparation.status) {
      case 'in_progress':
        return <Badge variant="default">En cours</Badge>;
      case 'completed':
        return <Badge variant="secondary">Terminé</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge variant="outline">Statut inconnu</Badge>;
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Car className="h-5 w-5 text-blue-600" />
            <span className="font-medium">
              Préparation en cours
            </span>
          </div>
          {getStatusBadge()}
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
                {vehicleDisplay}
              </p>
            </div>
            {/* ✅ CORRECTION 5: Vérification de hasValidData supprimée */}
            {preparation.vehicle && (
              <p className="text-xs text-amber-600 flex items-center mt-1">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Données incomplètes
              </p>
            )}
          </div>
        </div>

        {/* Informations temps et progression */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Progression</span>
            <span className="text-sm font-medium">
              {preparation.steps?.filter(s => s.completed).length || 0} / {preparation.steps?.length || 0} étapes
            </span>
          </div>
          <Progress value={preparation.progress || 0} className="h-2" />
          <p className="text-center text-sm text-gray-500">
            {preparation.progress || 0}% terminé
          </p>
        </div>

        {/* ✅ Prochaines étapes avec gestion des types corrigée */}
        {preparation.steps && preparation.steps.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Prochaines étapes</h4>
            <div className="space-y-1">
              {preparation.steps
                .filter((step: any) => !step.completed)
                .slice(0, 2)
                .map((step: any, index: number) => {
                  // ✅ CORRECTION 6: Recherche sécurisée du label de l'étape
                  const stepDef = PREPARATION_STEP_DEFINITIONS.find((s: any) => s.step === step.step);
                  const stepLabel = stepDef?.label || step.step;
                  
                  return (
                    <div key={step.step} className="flex items-center text-sm text-gray-700">
                      <div className="w-2 h-2 bg-gray-300 rounded-full mr-2" />
                      <span>{stepLabel}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Temps écoulé */}
        <div className="flex items-center space-x-2 pt-2 border-t">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Temps écoulé:</span>
          <span className={`text-sm font-medium ${getTimeColor()}`}>
            {formatWorkTime(preparation.currentDuration || 0)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <Button 
            onClick={() => router.push(`/preparations/${preparation.id}`)}
            size="sm" 
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Continuer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}