// preparator-app/src/app/(dashboard)/preparations/[id]/page.tsx
// ✅ MODIFICATION: Workflow flexible avec boutons photo individuels

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
  X,
  Play
} from 'lucide-react';

import { usePreparationStore, usePreparationStats } from '@/lib/stores/preparation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { CameraCapture } from '@/components/preparations/CameraCapture';
import { StepCard } from '@/components/preparations/StepCard';

// Types et constantes
interface StepDefinition {
  step: string;
  label: string;
  description: string;
  icon: string;
}

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

  const stats = usePreparationStats();

  // États locaux
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [isCompletingStep, setIsCompletingStep] = useState(false);
  const [isCompletingPreparation, setIsCompletingPreparation] = useState(false);
  const [finalNotes, setFinalNotes] = useState('');

  // Charger la préparation
  useEffect(() => {
    if (params.id) {
      getCurrentPreparation();
    }
  }, [params.id, getCurrentPreparation]);

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

  // ✅ Fonction pour démarrer une étape avec photo
  const handleTakePhoto = (stepType: string) => {
    console.log('📸 Démarrage prise de photo pour étape:', stepType);
    setSelectedStep(stepType);
    setShowCamera(true);
  };

  // ✅ Fonction pour voir une photo déjà prise
  const handleViewPhoto = (photoUrl: string) => {
    setSelectedPhotoUrl(photoUrl);
    setShowPhotoModal(true);
  };

  // ✅ Fonction pour gérer la photo prise
  const handlePhotoTaken = async (photo: File, notes?: string) => {
    if (!selectedStep || !currentPreparation) return;

    setIsCompletingStep(true);
    
    try {
      console.log('📸 Finalisation étape avec photo:', selectedStep);
      
      await completeStep(currentPreparation.id, selectedStep, photo, notes);
      
      toast({
        title: "Étape terminée !",
        description: `L'étape "${selectedStep}" a été complétée avec succès.`,
        variant: "default"
      });

      // Fermer la caméra
      setShowCamera(false);
      setSelectedStep(null);

    } catch (error) {
      console.error('❌ Erreur finalisation étape:', error);
      toast({
        title: "Erreur",
        description: "Impossible de finaliser l'étape. Réessayez.",
        variant: "destructive"
      });
    } finally {
      setIsCompletingStep(false);
    }
  };

  // ✅ Fonction pour terminer la préparation (même partiellement)
  const handleCompletePreparation = async () => {
    if (!currentPreparation) return;

    const completedStepsCount = currentPreparation.steps.filter(s => s.completed).length;
    
    if (completedStepsCount === 0) {
      toast({
        title: "Impossible de terminer",
        description: "Vous devez compléter au moins une étape pour terminer la préparation.",
        variant: "destructive"
      });
      return;
    }

    setIsCompletingPreparation(true);

    try {
      await completePreparation(currentPreparation.id, finalNotes, true);
      
      toast({
        title: "Préparation terminée !",
        description: `Préparation complétée avec ${completedStepsCount}/${currentPreparation.steps.length} étapes.`,
        variant: "default"
      });

      // Rediriger vers le dashboard
      router.push('/preparations');

    } catch (error) {
      console.error('❌ Erreur finalisation préparation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de terminer la préparation. Réessayez.",
        variant: "destructive"
      });
    } finally {
      setIsCompletingPreparation(false);
    }
  };

  // Loading state
  if (isLoading && !currentPreparation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement de la préparation...</p>
        </div>
      </div>
    );
  }

  // Pas de préparation
  if (!currentPreparation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Préparation introuvable</h2>
          <p className="text-gray-600 mb-4">Cette préparation n'existe pas ou a été terminée.</p>
          <Button onClick={() => router.push('/preparations')}>
            Retour aux préparations
          </Button>
        </div>
      </div>
    );
  }

  const completedStepsCount = currentPreparation.steps.filter(s => s.completed).length;
  const canCompletePreparation = completedStepsCount > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => router.push('/preparations')}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {currentPreparation.vehicle.brand} {currentPreparation.vehicle.model}
                </h1>
                <p className="text-sm text-gray-600">
                  {currentPreparation.vehicle.licensePlate}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {completedStepsCount}/{currentPreparation.steps.length} étapes
              </div>
              <Progress 
                value={currentPreparation.progress} 
                className="w-24 h-2 mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="px-4 py-6 space-y-6">
        {/* Informations de la préparation */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Agence:</span>
                <p className="font-medium">{currentPreparation.agency.name}</p>
              </div>
              <div>
                <span className="text-gray-500">Début:</span>
                <p className="font-medium">
                  {new Date(currentPreparation.startTime).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Durée:</span>
                <p className="font-medium">{currentPreparation.currentDuration}min</p>
              </div>
              <div>
                <span className="text-gray-500">Statut:</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  En cours
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des étapes - TOUTES DISPONIBLES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Étapes de préparation</h2>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Flexibles
            </Badge>
          </div>
          
          <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            💡 <strong>Nouveau :</strong> Vous pouvez choisir quelles étapes réaliser. 
            Prenez une photo pour valider chaque étape terminée.
          </p>

          {PREPARATION_STEPS.map((stepDef, index) => {
            const stepData = currentPreparation.steps.find(s => s.step === stepDef.step);
            
            return (
              <StepCard
                key={stepDef.step}
                step={stepData}
                stepDefinition={stepDef}
                index={index}
                onTakePhoto={handleTakePhoto}
                onViewPhoto={handleViewPhoto}
                isLoading={isCompletingStep && selectedStep === stepDef.step}
                canStartStep={true} // ✅ TOUTES les étapes sont disponibles
              />
            );
          })}
        </div>

        {/* Bouton finaliser */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes finales (optionnel)
                </label>
                <Textarea
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  placeholder="Observations, problèmes rencontrés..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleCompletePreparation}
                disabled={!canCompletePreparation || isCompletingPreparation}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {isCompletingPreparation ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Finalisation...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>
                      Terminer la préparation 
                      ({completedStepsCount}/{currentPreparation.steps.length} étapes)
                    </span>
                  </div>
                )}
              </Button>

              {!canCompletePreparation && (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded text-center">
                  ⚠️ Vous devez compléter au moins une étape pour terminer la préparation
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Caméra */}
      {showCamera && selectedStep && (
        <div className="fixed inset-0 z-50">
          <CameraCapture
            onCapture={handlePhotoTaken}
            onCancel={() => {
              setShowCamera(false);
              setSelectedStep(null);
            }}
            stepLabel={PREPARATION_STEPS.find(s => s.step === selectedStep)?.label || selectedStep}
            isLoading={isCompletingStep}
          />
        </div>
      )}

      {/* Modal Visualisation Photo */}
      {showPhotoModal && selectedPhotoUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <Button
              onClick={() => {
                setShowPhotoModal(false);
                setSelectedPhotoUrl(null);
              }}
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
            >
              <X className="h-6 w-6" />
            </Button>
            
            <img
              src={selectedPhotoUrl}
              alt="Photo de l'étape"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparationWorkflowPage;