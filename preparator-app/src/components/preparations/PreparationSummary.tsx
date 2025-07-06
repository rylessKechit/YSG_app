// components/preparations/PreparationSummary.tsx
'use client';

import { Clock, CheckCircle, AlertTriangle, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Preparation } from '@/lib/types';
import { PREPARATION_STEPS } from '@/lib/types';

interface PreparationSummaryProps {
  preparation: Preparation;
}

export function PreparationSummary({ preparation }: PreparationSummaryProps) {
  const { steps, totalTime, issues } = preparation;
  
  const formatDuration = (minutes: number) => {
    if (!minutes) return '0min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  // Calculer les statistiques correctement
  const completedSteps = steps.filter(s => s.completed).length;
  const totalSteps = PREPARATION_STEPS.length;
  const totalPhotos = steps.reduce((sum, step) => sum + (step.photos?.length || 0), 0);
  const issuesCount = issues?.length || 0;
  
  // 🔧 CORRECTION: Calcul correct de la progression
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>Résumé de la préparation</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Étapes complétées */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {completedSteps}/{totalSteps}
            </p>
            <p className="text-sm text-gray-600">Étapes réalisées</p>
          </div>

          {/* Durée totale */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {formatDuration(totalTime || 0)}
            </p>
            <p className="text-sm text-gray-600">Durée totale</p>
          </div>

          {/* Photos prises */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Camera className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {totalPhotos}
            </p>
            <p className="text-sm text-gray-600">Photos prises</p>
          </div>

          {/* Incidents */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className={`h-8 w-8 ${issuesCount > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
            </div>
            <p className={`text-2xl font-bold ${issuesCount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
              {issuesCount}
            </p>
            <p className="text-sm text-gray-600">Incidents</p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progression globale</span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Badges de statut */}
        <div className="flex flex-wrap gap-2 mt-4">
          {completedSteps === totalSteps && (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              ✅ Toutes les étapes réalisées
            </Badge>
          )}
          
          {totalPhotos > 0 && (
            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
              📸 {totalPhotos} photo{totalPhotos > 1 ? 's' : ''} documentée{totalPhotos > 1 ? 's' : ''}
            </Badge>
          )}
          
          {issuesCount > 0 && (
            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
              ⚠️ {issuesCount} incident{issuesCount > 1 ? 's' : ''} signalé{issuesCount > 1 ? 's' : ''}
            </Badge>
          )}
          
          {(totalTime || 0) <= 30 && totalTime && (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              ⚡ Préparation rapide
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}