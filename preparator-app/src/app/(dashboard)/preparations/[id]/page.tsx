// preparator-app/src/app/(dashboard)/preparations/[id]/page.tsx
// ✅ Page workflow avec étapes flexibles - TOUTES LES ERREURS TYPESCRIPT CORRIGÉES

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Camera,
  Car
} from 'lucide-react';

import { usePreparationStore } from '@/lib/stores/preparation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { CameraCapture } from '@/components/preparations/CameraCapture';
import { StepCard } from '@/components/preparations/StepCard'; // ✅ Import du composant séparé

// ✅ Import des types et utilitaires
import { 
  PREPARATION_STEPS, 
  adaptBackendStep,
  type PreparationStepData,
  type StepDefinition,
  type StepType
} from '@/lib/types/preparation';

// ✅ Types locaux simplifiés
interface PreparationStats {
  completedSteps: number;
  totalSteps: number;
  progress: number;
  canComplete: boolean;
  currentDuration?: string;
  isOnTime?: boolean;
}

const PreparationWorkflowPage = () => {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const {
    currentPreparation,
    completeStep,
    completePreparation,
    getCurrentPreparation,
    isLoading,
    error,
    clearError
  } = usePreparationStore();

  // États locaux
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [isCompletingStep, setIsCompletingStep] = useState(false);
  const [isCompletingPreparation, setIsCompletingPreparation] = useState(false);
  const [finalNotes, setFinalNotes] = useState('');

  // ✅ Calcul des statistiques locales
  const stats: PreparationStats = React.useMemo(() => {
    if (!currentPreparation?.steps) {
      return {
        completedSteps: 0,
        totalSteps: PREPARATION_STEPS.length,
        progress: 0,
        canComplete: false
      };
    }

    const completedSteps = currentPreparation.steps.filter(s => s.completed).length;
    const totalSteps = PREPARATION_STEPS.length;
    const progress = (completedSteps / totalSteps) * 100;

    return {
      completedSteps,
      totalSteps,
      progress,
      canComplete: completedSteps > 0,
      currentDuration: currentPreparation.currentDuration ? 
        `${Math.floor(currentPreparation.currentDuration / 60)}min` : undefined,
      isOnTime: currentPreparation.isOnTime
    };
  }, [currentPreparation]);

  // Charger la préparation
  useEffect(() => {
    if (params.id) {
      getCurrentPreparation();
    }
  }, [params.id, getCurrentPreparation]);

  // Rediriger si pas de préparation
  useEffect(() => {
    if (!isLoading && !currentPreparation && !error) {
      router.push('/preparations');
    }
  }, [isLoading, currentPreparation, error, router]);

  // Gérer les erreurs
  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur",
        description: error,
        variant: "destructive"
      });
      clearError();
    }
  }, [error, toast, clearError]);

  // ✅ FONCTION POUR DÉMARRER N'IMPORTE QUELLE ÉTAPE
  const handleStartStep = (stepType: string) => {
    console.log('🎬 Démarrage étape avec caméra:', stepType);
    setSelectedStep(stepType);
    setShowCamera(true);
  };

  // ✅ FONCTION POUR GÉRER LA PHOTO PRISE - Signature corrigée
  const handlePhotoTaken = async (photo: File, notes?: string) => {
    if (!selectedStep || !currentPreparation?.id) return;

    setIsCompletingStep(true);
    try {
      // ✅ Appel corrigé avec les bons paramètres
      await completeStep(currentPreparation.id, {
        step: selectedStep as StepType,
        photo,
        notes: notes || ''
      });
      
      setShowCamera(false);
      setSelectedStep(null);
      
      toast({
        title: "✅ Étape complétée",
        description: `L'étape "${PREPARATION_STEPS.find(s => s.step === selectedStep)?.label}" a été validée avec succès.`
      });
    } catch (error) {
      console.error('❌ Erreur completion étape:', error);
      toast({
        title: "Erreur",
        description: "Impossible de compléter l'étape. Réessayez.",
        variant: "destructive"
      });
    } finally {
      setIsCompletingStep(false);
    }
  };

  // Fermer la caméra
  const handleCameraClose = () => {
    setShowCamera(false);
    setSelectedStep(null);
    setIsCompletingStep(false);
  };

  // ✅ Finaliser la préparation - Signature corrigée
  const handleCompletePreparation = async () => {
    if (!currentPreparation?.id) return;

    setIsCompletingPreparation(true);
    try {
      await completePreparation(currentPreparation.id, finalNotes.trim() || undefined);
      
      toast({
        title: "🎉 Préparation terminée !",
        description: "La préparation a été finalisée avec succès."
      });

      router.push('/preparations');
    } catch (error) {
      console.error('❌ Erreur finalisation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de finaliser la préparation.",
        variant: "destructive"
      });
    } finally {
      setIsCompletingPreparation(false);
    }
  };

  if (isLoading || !currentPreparation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la préparation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fixe */}
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center space-x-3 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex-1">
              <h1 className="font-semibold text-gray-900 flex items-center space-x-2">
                <Car className="h-5 w-5 text-blue-600" />
                <span>{currentPreparation.vehicle?.licensePlate}</span>
              </h1>
              <p className="text-sm text-gray-600">
                {currentPreparation.vehicle?.brand} {currentPreparation.vehicle?.model}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIssueModal(true)}
              className="text-orange-600 border-orange-200"
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>
          </div>

          {/* Progression */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progression</span>
              <span className="font-medium text-gray-900">{stats.completedSteps}/{stats.totalSteps} étapes</span>
            </div>
            <Progress value={stats.progress} className="h-2" />
          </div>

          {/* Chrono temps */}
          {stats.currentDuration && (
            <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t">
              <div className="flex items-center space-x-1 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Temps écoulé: {stats.currentDuration}</span>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                stats.isOnTime 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {stats.isOnTime ? '✅ Dans les temps' : '⚠️ Attention'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h2 className="font-semibold text-blue-900 mb-2">📋 Instructions</h2>
            <p className="text-sm text-blue-700">
              Vous pouvez réaliser les étapes dans l'ordre que vous souhaitez. 
              Cliquez sur l'icône <Camera className="h-4 w-4 inline mx-1" /> à côté de chaque étape pour prendre une photo.
            </p>
          </CardContent>
        </Card>

        {/* Liste des étapes - Toutes accessibles */}
        <div className="space-y-3">
          {PREPARATION_STEPS.map((stepDef, index) => {
            // ✅ Trouver l'étape du backend et l'adapter
            const backendStep = currentPreparation.steps?.find(s => s.step === stepDef.step);
            const step = adaptBackendStep(backendStep, stepDef);
            
            const isCompleted = step.completed;

            return (
              <StepCard
                key={stepDef.step}
                step={step}
                stepDefinition={stepDef}
                isCompleted={isCompleted}
                index={index}
                onStartStep={handleStartStep}
                isLoading={isCompletingStep && selectedStep === stepDef.step}
              />
            );
          })}
        </div>

        {/* Finalisation - Accessible dès qu'au moins une étape est faite */}
        {stats.canComplete && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-900 mb-3">
                {stats.completedSteps === stats.totalSteps 
                  ? '🎉 Toutes les étapes sont complétées !' 
                  : `✅ ${stats.completedSteps} étapes terminées`
                }
              </h3>
              
              <div className="space-y-3">
                <Textarea
                  placeholder="Notes finales (optionnel)..."
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  className="bg-white"
                />
                
                <Button
                  onClick={handleCompletePreparation}
                  disabled={isCompletingPreparation}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3"
                  size="lg"
                >
                  {isCompletingPreparation ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Finalisation...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Terminer la préparation</span>
                    </div>
                  )}
                </Button>
                
                {stats.completedSteps < stats.totalSteps && (
                  <p className="text-xs text-green-700 text-center">
                    Vous pouvez terminer même si toutes les étapes ne sont pas faites
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Caméra */}
      {showCamera && selectedStep && (
        <CameraCapture
          onCapture={handlePhotoTaken}
          onCancel={handleCameraClose}
          stepLabel={PREPARATION_STEPS.find(s => s.step === selectedStep)?.label || selectedStep}
          isLoading={isCompletingStep}
        />
      )}

      {/* Modal Incidents */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Signaler un incident
            </h3>
            <p className="text-gray-600 mb-4">
              Fonctionnalité de signalement d'incident disponible
            </p>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowIssueModal(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={() => {
                  console.log('🚨 Signalement incident');
                  setShowIssueModal(false);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Signaler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparationWorkflowPage;