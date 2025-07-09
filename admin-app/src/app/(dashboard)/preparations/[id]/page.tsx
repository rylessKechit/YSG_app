// admin-app/src/app/(dashboard)/preparations/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Building2,
  User,
  Car,
  Clock,
  CheckCircle2,
  AlertCircle,
  Camera,
  History,
  FileText,
  Edit3
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/common/loading-spinner';

import { usePreparation, useUpdatePreparationAgency, useUpdatePreparationSteps } from '@/hooks/api/usePreparations';
import { useAgencies } from '@/hooks/api/useAgencies';

import type { Preparation } from '@/types/preparation';
import type { Agency as AgencyType } from '@/types/agency';
import { 
  PREPARATION_STATUS_LABELS,
  PREPARATION_STEP_LABELS,
  PREPARATION_STEP_ICONS,
  getStatusColor,
  formatDuration
} from '@/types/preparation';

import { ChangeAgencyDialog } from '@/components/preparations/change-agency-dialog';
import { EditStepsDialog } from '@/components/preparations/edit-steps-dialog';
import { PhotosViewer } from '@/components/preparations/photos-viewer';

interface PreparationDetailPageProps {
  params: {
    id: string;
  };
}

export default function PreparationDetailPage({ params }: PreparationDetailPageProps) {
  const router = useRouter();
  const [showChangeAgencyDialog, setShowChangeAgencyDialog] = useState(false);
  const [showEditStepsDialog, setShowEditStepsDialog] = useState(false);
  const [showPhotosViewer, setShowPhotosViewer] = useState(false);

  const { data: preparationData, isLoading, error } = usePreparation(params.id);
  const { data: agenciesData } = useAgencies({ status: 'active', limit: 100 });
  const { mutate: updateAgency, isPending: isUpdatingAgency } = useUpdatePreparationAgency();
  const { mutate: updateSteps, isPending: isUpdatingSteps } = useUpdatePreparationSteps();

  const preparation = preparationData?.data.preparation;
  
  // Conversion des types pour compatibilité
  const agencies = (agenciesData?.agencies || []).map((agency: AgencyType) => ({
    id: agency.id,
    name: agency.name,
    code: agency.code,
    client: agency.client || '',
    address: agency.address
  }));

  const handleBack = () => {
    router.push('/preparations');
  };

  const handleAgencyChange = (agencyId: string, reason?: string) => {
    if (!preparation) return;

    updateAgency({
      preparationId: preparation.id,
      agencyId,
      reason
    }, {
      onSuccess: () => {
        setShowChangeAgencyDialog(false);
      }
    });
  };

  const handleStepsChange = (steps: Array<{
    step: string;
    completed: boolean;
    notes?: string;
  }>, adminNotes?: string) => {
    if (!preparation) return;

    updateSteps({
      preparationId: preparation.id,
      steps,
      adminNotes
    }, {
      onSuccess: () => {
        setShowEditStepsDialog(false);
      }
    });
  };

  const handleOpenPhotos = () => {
    setShowPhotosViewer(true);
  };

  const handleOpenEditSteps = () => {
    setShowEditStepsDialog(true);
  };

  const handleOpenChangeAgency = () => {
    setShowChangeAgencyDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !preparation) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">
          Erreur lors du chargement de la préparation
        </div>
        <Button variant="outline" onClick={handleBack}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  const getStepStatusIcon = (step: any) => {
    if (step.completed) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Préparation - {preparation.vehicle.licensePlate}
            </h1>
            <p className="text-muted-foreground">
              {preparation.vehicle.brand} {preparation.vehicle.model}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(preparation.status)}>
            {PREPARATION_STATUS_LABELS[preparation.status]}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenChangeAgency}
            disabled={isUpdatingAgency}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Changer d'agence
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenEditSteps}
            disabled={isUpdatingSteps}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Modifier étapes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenPhotos}
          >
            <Camera className="h-4 w-4 mr-2" />
            Voir photos
          </Button>
        </div>
      </div>

      {/* Informations principales */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Véhicule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Véhicule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="font-medium">{preparation.vehicle.licensePlate}</div>
              <div className="text-sm text-muted-foreground">
                {preparation.vehicle.brand} {preparation.vehicle.model}
              </div>
            </div>
            {preparation.vehicle.year && (
              <div className="text-sm">
                <span className="text-muted-foreground">Année:</span> {preparation.vehicle.year}
              </div>
            )}
            {preparation.vehicle.color && (
              <div className="text-sm">
                <span className="text-muted-foreground">Couleur:</span> {preparation.vehicle.color}
              </div>
            )}
            {preparation.vehicle.condition && (
              <div className="text-sm">
                <span className="text-muted-foreground">État:</span> {preparation.vehicle.condition}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Préparateur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Préparateur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="font-medium">{preparation.user.name}</div>
              <div className="text-sm text-muted-foreground">
                {preparation.user.email}
              </div>
            </div>
            {preparation.user.phone && (
              <div className="text-sm">
                <span className="text-muted-foreground">Téléphone:</span> {preparation.user.phone}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Agence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="font-medium">{preparation.agency.name}</div>
              <Badge variant="outline" className="text-xs">
                {preparation.agency.code}
              </Badge>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Client:</span> {preparation.agency.client}
            </div>
            {preparation.agency.address && (
              <div className="text-sm">
                <span className="text-muted-foreground">Adresse:</span> {preparation.agency.address}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progression et timing */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Progression */}
        <Card>
          <CardHeader>
            <CardTitle>Progression</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression globale</span>
                <span>{preparation.progress}%</span>
              </div>
              <Progress value={preparation.progress} className="h-3" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Étapes complétées</div>
                <div className="font-medium">
                  {preparation.steps.filter(s => s.completed).length} / {preparation.steps.length}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Photos prises</div>
                <div className="font-medium">
                  {preparation.steps.reduce((acc, step) => acc + (step.photosCount || 0), 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Durée actuelle</div>
                <div className={`font-medium ${!preparation.isOnTime ? 'text-red-600' : ''}`}>
                  {preparation.totalTime ? formatDuration(preparation.totalTime) : formatDuration(preparation.duration)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Statut délai</div>
                <div className={`font-medium ${preparation.isOnTime ? 'text-green-600' : 'text-red-600'}`}>
                  {preparation.isOnTime ? 'Dans les temps' : 'En retard'}
                </div>
              </div>
            </div>

            {preparation.startTime && (
              <div className="text-sm">
                <div className="text-muted-foreground">Démarrée le</div>
                <div>
                  {new Date(preparation.startTime).toLocaleString('fr-FR')}
                </div>
              </div>
            )}

            {preparation.endTime && (
              <div className="text-sm">
                <div className="text-muted-foreground">Terminée le</div>
                <div>
                  {new Date(preparation.endTime).toLocaleString('fr-FR')}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Étapes de préparation */}
      <Card>
        <CardHeader>
          <CardTitle>Étapes de préparation</CardTitle>
          <CardDescription>
            Détail des {preparation.steps.length} étapes de préparation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {preparation.steps.map((step, index) => (
              <div key={step.step} className="flex gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {getStepStatusIcon(step)}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{PREPARATION_STEP_ICONS[step.step]}</span>
                    <span className="font-medium">{PREPARATION_STEP_LABELS[step.step]}</span>
                    {step.completed && (
                      <Badge variant="outline" className="text-xs">
                        Terminée
                      </Badge>
                    )}
                  </div>

                  {step.completed && step.completedAt && (
                    <div className="text-sm text-muted-foreground">
                      Complétée le {new Date(step.completedAt).toLocaleString('fr-FR')}
                    </div>
                  )}

                  {step.notes && (
                    <div className="text-sm">
                      <div className="text-muted-foreground mb-1">Notes:</div>
                      <div className="bg-muted/50 p-2 rounded text-sm">
                        {step.notes}
                      </div>
                    </div>
                  )}

                  {step.photos && step.photos.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Camera className="h-4 w-4" />
                      {step.photos.length} photo(s) prise(s)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Historique des changements d'agence */}
      {preparation.agencyHistory && preparation.agencyHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des changements d'agence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {preparation.agencyHistory.map((change, index) => (
                <div key={index} className="flex gap-4 p-3 border rounded-lg">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">
                        {change.fromAgency.name} ({change.fromAgency.code})
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="default">
                        {change.toAgency.name} ({change.toAgency.code})
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Par {change.changedBy.name} le {new Date(change.changedAt).toLocaleString('fr-FR')}
                    </div>
                    {change.reason && (
                      <div className="text-sm mt-1">
                        <span className="text-muted-foreground">Raison:</span> {change.reason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes et incidents */}
      {(preparation.notes || (preparation.issues && preparation.issues.length > 0)) && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Notes générales */}
          {preparation.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-3 rounded text-sm">
                  {preparation.notes}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Incidents */}
          {preparation.issues && preparation.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Incidents ({preparation.issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {preparation.issues.map((issue, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive">
                          {issue.type}
                        </Badge>
                        <Badge variant="outline">
                          {issue.severity}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        {issue.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Signalé le {new Date(issue.reportedAt).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialogs */}
      <ChangeAgencyDialog
        open={showChangeAgencyDialog}
        onOpenChange={setShowChangeAgencyDialog}
        preparation={preparation}
        agencies={agencies}
        onSubmit={handleAgencyChange}
        isLoading={isUpdatingAgency}
      />

      <EditStepsDialog
        open={showEditStepsDialog}
        onOpenChange={setShowEditStepsDialog}
        preparation={preparation}
        onSubmit={handleStepsChange}
        isLoading={isUpdatingSteps}
      />

      <PhotosViewer
        open={showPhotosViewer}
        onOpenChange={setShowPhotosViewer}
        preparation={preparation}
      />
    </div>
  );
}