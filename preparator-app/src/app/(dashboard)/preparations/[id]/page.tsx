// app/(dashboard)/preparations/[id]/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Camera, 
  CheckCircle2, 
  Clock, 
  Car,
  AlertTriangle,
  Eye,
  Plus
} from 'lucide-react';

import { usePreparationStore } from '@/lib/stores/preparation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { CameraCapture } from '@/components/preparations/CameraCapture';
import { IssueReportModal } from '@/components/preparations/IssueReportModal';
import { PreparationTimer } from '@/components/preparations/PreparationTimer';

import type { Preparation, PreparationStep } from '@/lib/types';

// Définition des étapes avec leurs labels français
const PREPARATION_STEPS = [
  {
    type: 'exterior',
    label: 'Extérieur',
    description: 'Nettoyage carrosserie, vitres, jantes',
    icon: '🚗'
  },
  {
    type: 'interior',
    label: 'Intérieur', 
    description: 'Aspirateur, nettoyage surfaces, désinfection',
    icon: '🧽'
  },
  {
    type: 'fuel',
    label: 'Carburant',
    description: 'Vérification niveau, ajout si nécessaire',
    icon: '⛽'
  },
  {
    type: 'tires_fluids',
    label: 'Pneus & Fluides',
    description: 'Pression pneus, niveaux huile/liquides',
    icon: '🔧'
  },
  {
    type: 'special_wash',
    label: 'Lavage Spécial',
    description: 'Traitement anti-bactérien, parfums',
    icon: '✨'
  },
  {
    type: 'parking',
    label: 'Stationnement',
    description: 'Positionnement final, vérification clés',
    icon: '🅿️'
  }
] as const;

const PreparationWorkflowPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const {
    currentPreparation,
    getCurrentPreparation,
    completeStep,
    completePreparation,
    reportIssue,
    isLoading,
    error,
    clearError
  } = usePreparationStore();

  // États locaux
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [stepNotes, setStepNotes] = useState<string>('');
  const [isCompletingStep, setIsCompletingStep] = useState<boolean>(false);
  const [finalNotes, setFinalNotes] = useState<string>('');

  const preparationId = params.id as string;

  // Charger la préparation au montage
  useEffect(() => {
    if (preparationId) {
      getCurrentPreparation();
    }
  }, [preparationId, getCurrentPreparation]);

  // Nettoyer les erreurs
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Gérer la capture photo
  const handlePhotoCapture = useCallback(async (photoFile: File) => {
    if (!selectedStep || !currentPreparation) return;

    try {
      setIsCompletingStep(true);
      
      await completeStep(currentPreparation.id, {
        stepType: selectedStep,
        photo: photoFile,
        notes: stepNotes.trim()
      });

      toast({
        title: "✅ Étape complétée !",
        description: `L'étape "${PREPARATION_STEPS.find(s => s.type === selectedStep)?.label}" a été validée.`,
      });

      // Reset des états
      setSelectedStep(null);
      setShowCamera(false);
      setStepNotes('');
      
    } catch (error: any) {
      console.error('❌ Erreur completion étape:', error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de compléter l'étape",
        variant: "destructive"
      });
    } finally {
      setIsCompletingStep(false);
    }
  }, [selectedStep, currentPreparation, stepNotes, completeStep, toast]);

  // Démarrer une étape
  const handleStartStep = (stepType: string) => {
    setSelectedStep(stepType);
    setStepNotes('');
    setShowCamera(true);
  };

  // Finaliser la préparation
  const handleCompletePreparation = async () => {
    if (!currentPreparation) return;

    // Vérifier que toutes les étapes sont complétées
    const incompleteTasks = currentPreparation.steps.filter(step => !step.completed);
    if (incompleteTasks.length > 0) {
      toast({
        title: "Préparation incomplète",
        description: `Il reste ${incompleteTasks.length} étape(s) à compléter.`,
        variant: "destructive"
      });
      return;
    }

    try {
      await completePreparation(currentPreparation.id, finalNotes.trim());
      
      toast({
        title: "🎉 Préparation terminée !",
        description: `Véhicule ${currentPreparation.vehicle.licensePlate} prêt pour location.`,
      });

      // Redirection vers le dashboard
      router.push('/dashboard');
      
    } catch (error: any) {
      console.error('❌ Erreur finalisation:', error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de finaliser la préparation",
        variant: "destructive"
      });
    }
  };

  // Signaler un incident
  const handleReportIssue = async (issueData: {
    type: string;
    description: string;
    photo?: File;
    severity?: 'low' | 'medium' | 'high';
  }) => {
    if (!currentPreparation) return;

    try {
      await reportIssue(currentPreparation.id, issueData);
      
      toast({
        title: "Incident signalé",
        description: "L'incident a été enregistré et sera traité.",
      });
      
      setShowIssueModal(false);
      
    } catch (error: any) {
      console.error('❌ Erreur signalement:', error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de signaler l'incident",
        variant: "destructive"
      });
    }
  };

  // Calculer les statistiques
  const getPreparationStats = () => {
    if (!currentPreparation) return null;

    const totalSteps = currentPreparation.steps.length;
    const completedSteps = currentPreparation.steps.filter(s => s.completed).length;
    const progressPercent = Math.round((completedSteps / totalSteps) * 100);
    
    return {
      totalSteps,
      completedSteps,
      progressPercent,
      isOnTime: currentPreparation.isOnTime,
      duration: currentPreparation.currentDuration,
      issuesCount: currentPreparation.issues?.length || 0
    };
  };

  const stats = getPreparationStats();

  // Loading state
  if (isLoading && !currentPreparation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la préparation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !currentPreparation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.back()}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  // No preparation state
  if (!currentPreparation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Aucune préparation</h2>
          <p className="text-gray-600 mb-4">Aucune préparation en cours trouvée.</p>
          <Button onClick={() => router.push('/preparations')}>
            Retour aux préparations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="text-center flex-1">
              <h1 className="font-semibold text-gray-900">Préparation</h1>
              <p className="text-sm text-gray-600">
                {currentPreparation.vehicle.licensePlate}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowIssueModal(true)}
              className="p-2 text-orange-600"
            >
              <AlertTriangle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-md mx-auto px-4 pb-6">
        {/* Carte informations véhicule */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">
                  {currentPreparation.vehicle.brand} {currentPreparation.vehicle.model}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {currentPreparation.agency.name} • {currentPreparation.vehicle.licensePlate}
                </p>
              </div>
              
              <div className="text-right">
                <Badge variant={stats?.isOnTime ? "default" : "destructive"}>
                  <Clock className="h-3 w-3 mr-1" />
                  {Math.floor(stats?.duration || 0)}min
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {/* Timer et progression */}
            <div className="space-y-3">
              <PreparationTimer 
                startTime={currentPreparation.startTime}
                isOnTime={stats?.isOnTime || false}
              />
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progression</span>
                  <span>{stats?.completedSteps}/{stats?.totalSteps} étapes</span>
                </div>
                <Progress value={stats?.progressPercent || 0} className="h-2" />
              </div>
              
              {(stats?.issuesCount ?? 0) > 0 && (
                <div className="flex items-center text-orange-600 text-sm">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {stats?.issuesCount ?? 0} incident(s) signalé(s)
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Liste des étapes */}
        <div className="mt-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Étapes de préparation</h2>
          
          {PREPARATION_STEPS.map((stepDef, index) => {
            const step = currentPreparation.steps.find(s => s.type === stepDef.type);
            const isCompleted = step?.completed || false;
            const isNext = !isCompleted && 
              currentPreparation.steps.slice(0, index).every(s => s.completed);
            
            return (
              <Card 
                key={stepDef.type}
                className={`transition-all duration-200 ${
                  isCompleted 
                    ? 'bg-green-50 border-green-200' 
                    : isNext 
                      ? 'bg-blue-50 border-blue-200 shadow-md'
                      : 'bg-gray-50 border-gray-200'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-lg
                        ${isCompleted 
                          ? 'bg-green-500 text-white' 
                          : isNext
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }
                      `}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {stepDef.icon} {stepDef.label}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {stepDef.description}
                        </p>
                        {step?.completedAt && (
                          <p className="text-xs text-green-600 mt-1">
                            Complété à {new Date(step.completedAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {step?.photoUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // TODO: Ouvrir modal de preview photo
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {isNext && !isCompleted && (
                        <Button
                          onClick={() => handleStartStep(stepDef.type)}
                          disabled={isCompletingStep}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          Photo
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {step?.notes && (
                    <div className="mt-3 p-2 bg-gray-100 rounded text-sm">
                      <strong>Notes:</strong> {step.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Finalisation */}
        {stats?.completedSteps === stats?.totalSteps && (
          <Card className="mt-6 bg-green-50 border-green-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-900 mb-3">
                🎉 Toutes les étapes sont complétées !
              </h3>
              
              <div className="space-y-3">
                <Textarea
                  placeholder="Notes finales (optionnel)..."
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  rows={3}
                />
                
                <Button
                  onClick={handleCompletePreparation}
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isLoading ? (
                    "Finalisation..."
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Terminer la préparation
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Modals */}
      {showCamera && selectedStep && (
        <CameraCapture
          onCapture={handlePhotoCapture}
          onCancel={() => {
            setShowCamera(false);
            setSelectedStep(null);
            setStepNotes('');
          }}
          stepLabel={PREPARATION_STEPS.find(s => s.type === selectedStep)?.label || ''}
          notes={stepNotes}
          onNotesChange={setStepNotes}
          isLoading={isCompletingStep}
        />
      )}

      {showIssueModal && (
        <IssueReportModal
          onSubmit={handleReportIssue}
          onCancel={() => setShowIssueModal(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default PreparationWorkflowPage;