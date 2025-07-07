// admin-app/src/app/(dashboard)/timesheets/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Clock, 
  User, 
  Building, 
  Calendar,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Save,
  MessageSquare
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useTimesheet, useValidateTimesheet, useDisputeTimesheet } from '@/hooks/use-timesheets';
import { 
  TIMESHEET_STATUS_LABELS, 
  TIMESHEET_STATUS_COLORS,
  type Timesheet 
} from '@/types/timesheet';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimesheetDetailPageProps {
  params: {
    id: string;
  };
}

export default function TimesheetDetailPage({ params }: TimesheetDetailPageProps) {
  const router = useRouter();
  const { id } = params;
  
  const [adminNotes, setAdminNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  // Data hooks
  const { 
    data: timesheet, 
    isLoading, 
    error 
  } = useTimesheet(id);

  const validateTimesheet = useValidateTimesheet();
  const disputeTimesheet = useDisputeTimesheet();

  // Redirect si pas trouvé
  if (error?.message?.includes('404') || error?.message?.includes('not found')) {
    notFound();
  }

  // Handlers
  const handleBack = () => {
    router.push('/timesheets');
  };

  const handleEdit = () => {
    router.push(`/timesheets/${id}/edit`);
  };

  const handleValidate = async () => {
    if (!timesheet) return;
    
    try {
      await validateTimesheet.mutateAsync({ 
        id: timesheet.id, 
        adminNotes: adminNotes || undefined 
      });
    } catch (error) {
      console.error('Erreur validation:', error);
    }
  };

  const handleDispute = async () => {
    if (!timesheet || !disputeReason.trim()) return;
    
    try {
      await disputeTimesheet.mutateAsync({ 
        id: timesheet.id, 
        reason: disputeReason 
      });
      setShowDisputeForm(false);
      setDisputeReason('');
    } catch (error) {
      console.error('Erreur dispute:', error);
    }
  };

  // Helper functions
  const formatTime = (timeString?: string) => {
    if (!timeString) return '-';
    return format(new Date(timeString), 'HH:mm');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: Timesheet['status']) => {
    switch (status) {
      case 'complete':
      case 'validated':
        return <CheckCircle className="h-4 w-4" />;
      case 'disputed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getDelayBadge = (delay: number) => {
    if (delay <= 0) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Ponctuel
        </Badge>
      );
    }

    const variant = delay <= 5 ? 'warning' : delay <= 15 ? 'orange' : 'destructive';
    
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        <AlertTriangle className="w-3 h-3 mr-1" />
        +{delay} min
      </Badge>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 mt-4">Chargement du pointage...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !timesheet) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-red-600">
              Pointage non trouvé
            </h1>
          </div>
        </div>

        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Ce pointage n'existe pas ou a été supprimé.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusColor = TIMESHEET_STATUS_COLORS[timesheet.status];
  const statusLabel = TIMESHEET_STATUS_LABELS[timesheet.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux pointages
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Détail du pointage
            </h1>
            <p className="text-gray-600 mt-1">
              {format(new Date(timesheet.date), 'EEEE dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge 
            variant="secondary" 
            className={`${statusColor === 'green' ? 'bg-green-100 text-green-800' : 
                        statusColor === 'blue' ? 'bg-blue-100 text-blue-800' :
                        statusColor === 'orange' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'}`}
          >
            {getStatusIcon(timesheet.status)}
            <span className="ml-1">{statusLabel}</span>
          </Badge>
          
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations de base */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Utilisateur</Label>
                  <p className="text-lg font-medium">
                    {typeof timesheet.user === 'object'
                      ? `${timesheet.user.firstName} ${timesheet.user.lastName}`
                      : 'Utilisateur supprimé'
                    }
                  </p>
                  {typeof timesheet.user === 'object' && (
                    <p className="text-sm text-gray-500">{timesheet.user.email}</p>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Agence</Label>
                  <p className="text-lg font-medium">
                    {typeof timesheet.agency === 'object' 
                      ? timesheet.agency.name 
                      : 'Agence supprimée'
                    }
                  </p>
                  {typeof timesheet.agency === 'object' && timesheet.agency.code && (
                    <p className="text-sm text-gray-500">Code: {timesheet.agency.code}</p>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium text-gray-500">Date</Label>
                <p className="text-lg font-medium">
                  {format(new Date(timesheet.date), 'EEEE dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Horaires et durées */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horaires et durées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Fin</p>
                  <p className="text-lg font-medium">{formatTime(timesheet.endTime)}</p>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Pause début</p>
                  <p className="text-lg font-medium">{formatTime(timesheet.breakStart)}</p>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Pause fin</p>
                  <p className="text-lg font-medium">{formatTime(timesheet.breakEnd)}</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 mb-1">Temps travaillé</p>
                  <p className="text-xl font-bold text-blue-700">
                    {formatDuration(timesheet.totalWorkedMinutes)}
                  </p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 mb-1">Temps pause</p>
                  <p className="text-xl font-bold text-green-700">
                    {formatDuration(timesheet.totalBreakMinutes)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {timesheet.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Notes de l'employé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">{timesheet.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Notes admin existantes */}
          {timesheet.adminNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Notes administrateur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                  {timesheet.adminNotes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Analyse des retards */}
          <Card>
            <CardHeader>
              <CardTitle>Analyse ponctualité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Retard début:</span>
                {getDelayBadge(timesheet.delays.startDelay)}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Retard fin:</span>
                {getDelayBadge(timesheet.delays.endDelay)}
              </div>
              
              {timesheet.delays.breakStartDelay > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Retard pause début:</span>
                  {getDelayBadge(timesheet.delays.breakStartDelay)}
                </div>
              )}
              
              {timesheet.delays.breakEndDelay > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Retard pause fin:</span>
                  {getDelayBadge(timesheet.delays.breakEndDelay)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions admin */}
          {timesheet.status !== 'validated' && (
            <Card>
              <CardHeader>
                <CardTitle>Actions administrateur</CardTitle>
                <CardDescription>
                  Valider ou marquer ce pointage en litige
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Notes admin */}
                <div>
                  <Label htmlFor="adminNotes">Notes administrateur (optionnel)</Label>
                  <Textarea
                    id="adminNotes"
                    placeholder="Ajouter une note..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Boutons d'action */}'
                <div className="space-y-2">
                  <Button
                    onClick={handleValidate}
                    disabled={validateTimesheet.isPending}
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {validateTimesheet.isPending ? 'Validation...' : 'Valider le pointage'}
                  </Button>

                  {!showDisputeForm ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowDisputeForm(true)}
                      className="w-full text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Marquer en litige
                    </Button>
                  ) : (
                    <div className="space-y-2 p-3 border border-red-200 rounded-lg bg-red-50">
                      <Label htmlFor="disputeReason">Raison du litige</Label>
                      <Textarea
                        id="disputeReason"
                        placeholder="Expliquez pourquoi ce pointage est en litige..."
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        className="min-h-20"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleDispute}
                          disabled={!disputeReason.trim() || disputeTimesheet.isPending}
                          size="sm"
                          variant="destructive"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Confirmer
                        </Button>
                        <Button
                          onClick={() => {
                            setShowDisputeForm(false);
                            setDisputeReason('');
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informations de validation */}
          {timesheet.validatedBy && timesheet.validatedAt && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">Pointage validé</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-gray-600">Validé par:</span>{' '}
                    {typeof timesheet.validatedBy === 'object'
                      ? `${timesheet.validatedBy.firstName} ${timesheet.validatedBy.lastName}`
                      : 'Administrateur'
                    }
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600">Le:</span>{' '}
                    {format(new Date(timesheet.validatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Métadonnées */}
          <Card>
            <CardHeader>
              <CardTitle>Métadonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Créé le:</span>
                <span>{format(new Date(timesheet.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}</span>'
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Modifié le:</span>
                <span>{format(new Date(timesheet.updatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}</span>'
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ID:</span>
                <span className="font-mono text-xs">{timesheet.id}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}