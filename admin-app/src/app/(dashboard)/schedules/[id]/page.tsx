// admin-app/src/app/(dashboard)/schedules/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building,
  Edit,
  Copy,
  Trash2,
  MapPin,
  Phone,
  Mail,
  FileText,
  History,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { useSchedule, useDeleteSchedule, useDuplicateSchedule } from '@/hooks/api/useSchedules';

// Fonction utilitaire pour calculer la durée
function calculateDuration(startTime: string, endTime: string, breakStart?: string, breakEnd?: string): string {
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  let duration = end - start;
  
  if (breakStart && breakEnd) {
    const breakDuration = timeToMinutes(breakEnd) - timeToMinutes(breakStart);
    duration -= breakDuration;
  }
  
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
}

export default function ScheduleViewPage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.id as string;

  // Hooks API
  const { data: schedule, isLoading, error } = useSchedule(scheduleId);
  const deleteSchedule = useDeleteSchedule();
  const duplicateSchedule = useDuplicateSchedule();

  // Handlers
  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    router.push(`/schedules/${scheduleId}/edit`);
  };

  const handleDelete = async () => {
    try {
      await deleteSchedule.mutateAsync(scheduleId);
      router.push('/schedules');
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  const handleDuplicate = async () => {
    try {
      const result = await duplicateSchedule.mutateAsync({
        id: scheduleId,
        data: {}
      });
      
      if (result.data?.schedule) {
        router.push(`/schedules/${result.data.schedule.id}/edit`);
      }
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Actif</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      case 'completed':
        return <Badge variant="secondary">Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error || !schedule) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Planning non trouvé</h2>
          <p className="text-gray-600 mb-4">Le planning demandé n'existe pas ou a été supprimé.</p>
          <Button onClick={() => router.push('/schedules')}>
            Retour aux plannings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Détails du planning</h1>
            <p className="text-gray-600">
              {schedule.user.firstName} {schedule.user.lastName} - {new Date(schedule.date).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Statut */}
          {getStatusBadge(schedule.status)}
          
          {/* Actions */}
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>

          <Button variant="outline" onClick={handleDuplicate} disabled={duplicateSchedule.isPending}>
            {duplicateSchedule.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Dupliquer
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer le planning</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer ce planning ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteSchedule.isPending}
                >
                  {deleteSchedule.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations du planning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Informations du planning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date et horaires */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Date et horaires</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">
                          {new Date(schedule.date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(schedule.date) < new Date() ? 'Passé' : 
                           new Date(schedule.date).toDateString() === new Date().toDateString() ? 'Aujourd\'hui' : 
                           'À venir'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">
                          {schedule.startTime} - {schedule.endTime}
                        </div>
                        <div className="text-sm text-gray-500">
                          Durée: {calculateDuration(schedule.startTime, schedule.endTime, schedule.breakStart, schedule.breakEnd)}
                        </div>
                      </div>
                    </div>

                    {schedule.breakStart && schedule.breakEnd && (
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-700">
                            Pause: {schedule.breakStart} - {schedule.breakEnd}
                          </div>
                          <div className="text-sm text-gray-500">
                            Durée pause: {calculateDuration(schedule.breakStart, schedule.breakEnd)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Statut</h3>
                  <div className="space-y-3">
                    <div>
                      {getStatusBadge(schedule.status)}
                    </div>
                    
                    {schedule.status === 'active' && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Planning actif
                      </div>
                    )}
                    
                    {schedule.status === 'cancelled' && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        Planning annulé
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notes */}
              {schedule.notes && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{schedule.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations du préparateur */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Préparateur assigné
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {getUserInitials(schedule.user.firstName, schedule.user.lastName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {schedule.user.firstName} {schedule.user.lastName}
                  </h3>
                  
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      {schedule.user.email}
                    </div>
                    
                    {schedule.user.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        {schedule.user.phone}
                      </div>
                    )}
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={() => router.push(`/users/${schedule.user.id}`)}>
                  Voir le profil
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Informations de l'agence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Agence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{schedule.agency.name}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="outline">{schedule.agency.code}</Badge>
                    <span className="text-sm text-gray-600">{schedule.agency.client}</span>
                  </div>
                </div>

                {schedule.agency.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span>{schedule.agency.address}</span>
                  </div>
                )}

                <Button variant="outline" size="sm" onClick={() => router.push(`/agencies/${schedule.agency.id}`)}>
                  Voir l'agence
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions rapides */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier le planning
              </Button>
              
              <Button variant="outline" className="w-full" onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Dupliquer pour un autre jour
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  const params = new URLSearchParams({
                    date: schedule.date.split('T')[0],
                    userId: schedule.user.id,
                    agencyId: schedule.agency.id,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    ...(schedule.breakStart && { breakStart: schedule.breakStart }),
                    ...(schedule.breakEnd && { breakEnd: schedule.breakEnd }),
                    duplicate: 'true'
                  });
                  router.push(`/schedules/new?${params}`);
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Créer un planning similaire
              </Button>
            </CardContent>
          </Card>

          {/* Méta-informations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">Créé le</div>
                <div className="font-medium">
                  {new Date(schedule.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              {schedule.createdBy && (
                <div>
                  <div className="text-sm text-gray-600">Créé par</div>
                  <div className="font-medium">
                    {schedule.createdBy.firstName} {schedule.createdBy.lastName}
                  </div>
                </div>
              )}

              {schedule.updatedAt && schedule.updatedAt !== schedule.createdAt && (
                <div>
                  <div className="text-sm text-gray-600">Dernière modification</div>
                  <div className="font-medium">
                    {new Date(schedule.updatedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <div className="text-sm text-gray-600">ID du planning</div>
                <div className="font-mono text-xs text-gray-500">{schedule.id}</div>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques rapides */}
          <Card>
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Durée de travail</span>
                <span className="font-medium">
                  {calculateDuration(schedule.startTime, schedule.endTime, schedule.breakStart, schedule.breakEnd)}
                </span>
              </div>
              
              {schedule.breakStart && schedule.breakEnd && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Temps de pause</span>
                  <span className="font-medium">
                    {calculateDuration(schedule.breakStart, schedule.breakEnd)}
                  </span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Temps total</span>
                <span className="font-medium">
                  {calculateDuration(schedule.startTime, schedule.endTime)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}