// preparator-app/src/app/(dashboard)/preparations/[id]/page.tsx
// ✅ Page de workflow de préparation corrigée

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

import { usePreparationStore, usePreparationStats } from '@/lib/stores/preparation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { CameraCapture } from '@/components/preparations/CameraCapture';
import { IssueReportModal } from '@/components/preparations/IssueReportModal';
import { PreparationTimer } from '@/components/preparations/PreparationTimer';

import { PREPARATION_STEPS, type StepDefinition, type IssueReportData } from '@/lib/types';

const PreparationWorkflowPage: React.FC = () => {
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

  // ===== ÉTATS LOCAUX =====
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [isCompletingStep, setIsCompletingStep] = useState(false);
  const [isCompletingPreparation, setIsCompletingPreparation] = useState(false);
  const [finalNotes, setFinalNotes] = useState('');

  // ===== EFFETS =====
  
  // Charger la préparation au montage
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

  // Effacer les erreurs
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

  // ===== FONCTIONS UTILITAIRES =====

  // ✅ Obtenir l'étape suivante
  const getNextStep = useCallback((): StepDefinition | null => {
    if (!currentPreparation?.steps) return null;
    
    return PREPARATION_STEPS.find(stepDef => {
      const step = currentPreparation.steps.find(s => s.step === stepDef.step);
      return step && !step.completed;
    }) || null;
  }, [currentPreparation]);

  // ✅ Vérifier si une étape est la suivante
  const isNextStep = useCallback((stepType: string): boolean => {
    const nextStep = getNextStep();
    return nextStep?.step === stepType;
  }, [getNextStep]);

  // ===== HANDLERS =====

  // ✅ Démarrer une étape
  const handleStartStep = (stepType: string) => {
    if (!isNextStep(stepType)) {
      toast({
        title: "Étape non disponible",
        description: "Vous devez compléter les étapes précédentes d'abord",
        variant: "destructive"
      });
      return;
    }

    setSelectedStep(stepType);
    setShowCamera(true);
  };

  // ✅ Compléter une étape
  const handleStepComplete = async (photo: File, notes?: string) => {
    if (!selectedStep || !currentPreparation) return;

    try {
      setIsCompletingStep(true);
      
      await completeStep(currentPreparation.id, {
        stepType: selectedStep, // Sera mappé vers 'step' dans le store
        photo,
        notes
      });

      toast({
        title: "Étape complétée",
        description: `L'étape ${PREPARATION_STEPS.find(s => s.step === selectedStep)?.label} a été validée`,
        variant: "default"
      });

      setSelectedStep(null);
      setShowCamera(false);
    } catch (error) {
      console.error('Erreur complétion étape:', error);
      toast({
        title: "Erreur",
        description: "Impossible de compléter l'étape",
        variant: "destructive"
      });
    } finally {
      setIsCompletingStep(false);
    }
  };

  // ✅ Signaler un incident
  const handleReportIssue = async (data: IssueReportData) => {
    if (!currentPreparation) return;

    try {
      await reportIssue(currentPreparation.id, data);
      
      toast({
        title: "Incident signalé",
        description: "L'incident a été enregistré avec succès",
        variant: "default"
      });

      setShowIssueModal(false);
    } catch (error) {
      console.error('Erreur signalement incident:', error);
      toast({
        title: "Erreur",
        description: "Impossible de signaler l'incident",
        variant: "destructive"
      });
    }
  };

  // ✅ Terminer la préparation
  const handleCompletePreparation = async () => {
    if (!currentPreparation || !stats?.canComplete) return;

    try {
      setIsCompletingPreparation(true);
      
      await completePreparation(currentPreparation.id, finalNotes);
      
      toast({
        title: "Préparation terminée",
        description: "La préparation a été finalisée avec succès",
        variant: "default"
      });

      // Rediriger vers la liste des préparations
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

  // ===== AFFICHAGE DE CHARGEMENT =====
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

  // ===== RENDU PRINCIPAL =====
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
                  {currentPreparation.vehicle.brand} {currentPreparation.vehicle.model}
                </h1>
                <p className="text-sm text-gray-600">
                  {currentPreparation.vehicle.licensePlate} • {currentPreparation.agency.name}
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
              
              <PreparationTimer 
                startTime={currentPreparation.startTime}
                isOnTime={currentPreparation.isOnTime ?? false}
              />
            </div>
          </div>

          {/* Barre de progression */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progression
              </span>
              <span className="text-sm text-gray-600">
                {stats?.completedSteps}/{stats?.totalSteps} étapes
              </span>
            </div>
            <Progress value={stats?.progress || 0} className="h-2" />
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-4 space-y-4">
        {/* Liste des étapes */}
        <div className="space-y-4">
          {PREPARATION_STEPS.map((stepDef, index) => {
            // ✅ Correspondance corrigée backend ↔ frontend
            const step = currentPreparation.steps.find(s => s.step === stepDef.step);
            const isCompleted = step?.completed || false;
            const isNext = !isCompleted && isNextStep(stepDef.step);

            return (
              <Card key={stepDef.step} className={`transition-colors ${
                isCompleted ? 'bg-green-50 border-green-200' : 
                isNext ? 'bg-blue-50 border-blue-200' : ''
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
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
                          onClick={() => handleStartStep(stepDef.step)}
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
        {stats?.canComplete && (
          <Card className="mt-6 bg-green-50 border-green-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-900 mb-3">
                🎉 Toutes les étapes sont complétées !
              </h3>
              
              <div className="space-y-4">
                <Textarea
                  placeholder="Notes finales (optionnel)..."
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
                
                <Button
                  onClick={handleCompletePreparation}
                  disabled={isCompletingPreparation}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isCompletingPreparation ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Finalisation...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Terminer la préparation
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Incidents existants */}
        {currentPreparation.issues && currentPreparation.issues.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-orange-900 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Incidents signalés ({currentPreparation.issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentPreparation.issues.map((issue, index) => (
                <div key={index} className="p-3 bg-orange-50 rounded border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-orange-900">{issue.type}</h4>
                    <Badge variant={
                      issue.severity === 'high' ? 'destructive' :
                      issue.severity === 'medium' ? 'default' : 'secondary'
                    }>
                      {issue.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-orange-800">{issue.description}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    Signalé à {new Date(issue.reportedAt).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      {showCamera && selectedStep && (
        <CameraCapture
          onCapture={handleStepComplete}
          onCancel={() => {
            setSelectedStep(null);
            setShowCamera(false);
          }}
          stepLabel={PREPARATION_STEPS.find(s => s.step === selectedStep)?.label || selectedStep}
          isLoading={isCompletingStep}
        />
      )}

      {showIssueModal && (
        <IssueReportModal
          onSubmit={handleReportIssue}
          onCancel={() => setShowIssueModal(false)}
          isLoading={false}
        />
      )}
    </div>
  );
};

export default PreparationWorkflowPage;