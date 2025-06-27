'use client';

import { useRouter } from 'next/navigation';
import { Car, Clock, CheckCircle, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Preparation } from '@/lib/types';
import { formatWorkTime } from '@/lib/utils';

interface CurrentPreparationProps {
  preparation: Preparation;
}

export function CurrentPreparation({ preparation }: CurrentPreparationProps) {
  const router = useRouter();

  const completedSteps = preparation.steps.filter(step => step.completed).length;
  const totalSteps = preparation.steps.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  // Déterminer la couleur du chrono selon le temps écoulé
  const getTimeColor = () => {
    if (preparation.currentDuration > 30) return 'text-red-600';
    if (preparation.currentDuration > 25) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Car className="w-5 h-5" />
            <span>Préparation en cours</span>
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
        {/* Informations véhicule */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {preparation.vehicle.licensePlate}
              </p>
              <p className="text-sm text-gray-600">
                {preparation.vehicle.brand} {preparation.vehicle.model}
              </p>
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
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Prochaines étapes</h4>
          <div className="space-y-1">
            {preparation.steps
              .filter(step => !step.completed)
              .slice(0, 2)
              .map((step, index) => (
                <div key={step.type} className="flex items-center space-x-2 text-sm">
                  <div className="w-4 h-4 border border-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs text-gray-500">{completedSteps + index + 1}</span>
                  </div>
                  <span className="text-gray-700">{step.label}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Button 
            className="flex-1"
            onClick={() => router.push(`/preparations/${preparation.id}`)}
          >
            <Camera className="w-4 h-4 mr-2" />
            Continuer
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push('/preparations')}
          >
            Voir détails
          </Button>
        </div>

        {/* Alertes temps */}
        {preparation.currentDuration > 25 && (
          <div className={`text-center text-xs px-2 py-1 rounded ${
            preparation.currentDuration > 30 
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-orange-50 text-orange-700 border border-orange-200'
          }`}>
            {preparation.currentDuration > 30 
              ? '⚠️ Temps limite dépassé'
              : '🕐 Temps limite proche (30 min)'
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}