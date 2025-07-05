// preparator-app/src/app/(dashboard)/preparations/[id]/page.tsx
// ✅ Page workflow avec VRAIE caméra restaurée

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Camera, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Eye,
  X
} from 'lucide-react';

import { usePreparationStore, usePreparationStats } from '@/lib/stores/preparation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { CameraCapture } from '@/components/preparations/CameraCapture';

// Types locaux
interface StepDefinition {
  step: string;
  label: string;
  description: string;
  icon: string;
}

interface IssueReportData {
  type: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  photo?: File;
}

// Constantes des étapes
const PREPARATION_STEPS: StepDefinition[] = [
  {
    step: 'exterior',
    label: 'Extérieur',
    description: 'Nettoyage carrosserie, vitres, jantes',
    icon: '🚗'
  },
  {
    step: 'interior',
    label: 'Intérieur', 
    description: 'Aspirateur, nettoyage surfaces, désinfection',
    icon: '🧽'
  },
  {
    step: 'fuel',
    label: 'Carburant',
    description: 'Vérification niveau, ajout si nécessaire',
    icon: '⛽'
  },
  {
    step: 'tires_fluids',
    label: 'Pneus & Fluides',
    description: 'Pression pneus, niveaux huile/liquides',
    icon: '🔧'
  },
  {
    step: 'special_wash',
    label: 'Lavage Spécial',
    description: 'Traitement anti-bactérien, parfums',
    icon: '✨'
  },
  {
    step: 'parking',
    label: 'Stationnement',
    description: 'Positionnement final, vérification clés',
    icon: '🅿️'
  }
];

// Composant StepCard intégré
const StepCard: React.FC<{
  step: any;
  stepDefinition: StepDefinition;
  isNext: boolean;
  isCompleted: boolean;
  index: number;
  onStartStep: (stepType: string) => void;
  isLoading?: boolean;
}> = ({
  step,
  stepDefinition,
  isNext,
  isCompleted,
  index,
  onStartStep,
  isLoading = false
}) => {
  return (
    <Card className={`transition-all duration-200 ${
      isCompleted 
        ? 'bg-green-50 border-green-200 shadow-sm' 
        : isNext
          ? 'bg-blue-50 border-blue-200 shadow-md ring-2 ring-blue-100'
          : 'bg-gray-50 border-gray-200'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
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
            
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                <span>{stepDefinition.icon}</span>
                <span>{stepDefinition.label}</span>
                {isNext && !isCompleted && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    À faire
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {stepDefinition.description}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {step?.photoUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            
            {/* ✅ BOUTON COMMENCER AVEC VRAIE CAMÉRA */}
            {isNext && !isCompleted && (
              <Button
                onClick={() => onStartStep(stepDefinition.step)}
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

            {!isNext && !isCompleted && (
              <div className="text-xs text-gray-500 text-center">
                <Clock className="h-4 w-4 mx-auto mb-1" />
                <div>En attente</div>
              </div>
            )}
          </div>
        </div>

        {isCompleted && step?.completedAt && (
          <div className="text-xs text-green-600 bg-green-100 rounded px-2 py-1 mb-2">
            ✅ Complété à {new Date(step.completedAt).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}

        {step?.notes && (
          <div className="mt-3 p-2 bg-gray-100 rounded text-sm">
            <strong className="text-gray-700">Notes:</strong>
            <p className="text-gray-600 mt-1">{step.notes}</p>
          </div>
        )}

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

const PreparationWorkflowPage = () => {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const {
    currentPreparation,
    completeStep,
    completePreparation,
    reportIssue,
    getCurrentPreparation,
    isLoading,
    error,
    clearError
  } = usePreparationStore();

  const stats = usePreparationStats();

  // États locaux
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [isCompletingStep, setIsCompletingStep] = useState(false);
  const [isCompletingPreparation, setIsCompletingPreparation] = useState(false);
  const [finalNotes, setFinalNotes] = useState('');

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

  // ✅ Fonction pour démarrer une étape avec VRAIE caméra
  const handleStartStep = (stepType: string) => {
    console.log('🎬 Démarrage étape avec caméra:', stepType);
    setSelectedStep(stepType);
    setShowCamera(true);
  };

  // ✅ Fonction pour gérer la photo prise avec VRAIE caméra
  const handlePhotoTaken = async (photo: File, notes?: string) => {
    if (!selectedStep || !currentPreparation) return;

    try {
      setIsCompletingStep(true);
      setShowCamera(false);

      console.log('📸 Completion étape avec photo réelle:', selectedStep, 'Photo:', photo.name, 'Taille:', photo.size);
      
      // ✅ CORRECTION: Utiliser 'step' au lieu de 'stepType'
      await completeStep(currentPreparation.id, {
        step: selectedStep, // ✅ CORRECTION: 'step' au lieu de 'stepType'
        photo: photo,
        notes: notes || ''
      });
      
      toast({
        title: "Étape complétée",
        description: `L'étape "${selectedStep}" a été validée avec succès`,
      });

      setSelectedStep(null);
      
    } catch (error) {
      console.error('❌ Erreur completion étape:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider l'étape",
        variant: "destructive"
      });
    } finally {
      setIsCompletingStep(false);
    }
  };

  // ✅ Fermer la caméra
  const handleCameraClose = () => {
    setShowCamera(false);
    setSelectedStep(null);
  };

  // Vérifier si une étape est la suivante à faire
  const isNextStep = (stepType: string): boolean => {
    if (!currentPreparation) return false;
    
    const stepIndex = PREPARATION_STEPS.findIndex(s => s.step === stepType);
    if (stepIndex === -1) return false;

    // Vérifier que toutes les étapes précédentes sont complétées
    for (let i = 0; i < stepIndex; i++) {
      const prevStep = PREPARATION_STEPS[i];
      const completedStep = currentPreparation.steps.find(s => s.step === prevStep.step);
      if (!completedStep?.completed) {
        return false;
      }
    }

    // Vérifier que cette étape n'est pas encore complétée
    const thisStep = currentPreparation.steps.find(s => s.step === stepType);
    return !thisStep?.completed;
  };

  // Terminer la préparation
  const handleCompletePreparation = async () => {
    if (!currentPreparation || !stats?.canComplete) return;

    try {
      setIsCompletingPreparation(true);
      
      await completePreparation(currentPreparation.id, finalNotes);
      
      toast({
        title: "Préparation terminée",
        description: "La préparation a été finalisée avec succès",
      });

      setTimeout(() => {
        router.push('/preparations');
      }, 2000);
      
    } catch (error) {
      console.error('Erreur finalisation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de terminer la préparation",
        variant: "destructive"
      });
    } finally {
      setIsCompletingPreparation(false);
    }
  };

  // Affichage de chargement
  if (isLoading || !currentPreparation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la préparation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fixe */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <div>
                <h1 className="font-semibold text-gray-900">
                  {currentPreparation.vehicle?.brand} {currentPreparation.vehicle?.model}
                </h1>
                <p className="text-sm text-gray-600">
                  {currentPreparation.vehicle?.licensePlate} • {currentPreparation.agency?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIssueModal(true)}
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
              
              <div className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                En retard
              </div>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progression
              </span>
              <span className="text-sm text-gray-600">
                {stats?.completedSteps || 0}/{stats?.totalSteps || 6} étapes
              </span>
            </div>
            <Progress value={stats?.progress || 0} className="h-2" />
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-4 space-y-4 pb-20">
        {/* Message d'instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions</h3>
            <p className="text-sm text-blue-700">
              Complétez les étapes dans l'ordre. Cliquez sur "Commencer" pour prendre une photo et valider chaque étape.
            </p>
          </CardContent>
        </Card>

        {/* Liste des étapes */}
        <div className="space-y-3">
          {PREPARATION_STEPS.map((stepDef, index) => {
            const step = currentPreparation.steps?.find(s => s.step === stepDef.step) || {
              step: stepDef.step,
              label: stepDef.label,
              completed: false
            };
            
            const isCompleted = step.completed;
            const isNext = isNextStep(stepDef.step);

            return (
              <StepCard
                key={stepDef.step}
                step={step}
                stepDefinition={stepDef}
                isNext={isNext}
                isCompleted={isCompleted}
                index={index}
                onStartStep={handleStartStep}
                isLoading={isCompletingStep && selectedStep === stepDef.step}
              />
            );
          })}
        </div>

        {/* Finalisation */}
        {stats?.canComplete && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-900 mb-3">
                🎉 Toutes les étapes sont complétées !
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ✅ VRAIE CAMÉRA RESTAURÉE */}
      {showCamera && selectedStep && (
        <CameraCapture
          onCapture={handlePhotoTaken}
          onCancel={handleCameraClose}
          stepLabel={PREPARATION_STEPS.find(s => s.step === selectedStep)?.label || selectedStep}
          isLoading={isCompletingStep}
        />
      )}

      {/* Mock Modal Incidents */}
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