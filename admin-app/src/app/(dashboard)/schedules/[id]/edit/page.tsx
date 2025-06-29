// admin-app/src/app/(dashboard)/schedules/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
  History,
  Copy
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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

import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';
import { 
  useSchedule, 
  useUpdateSchedule, 
  useDeleteSchedule, 
  useDuplicateSchedule,
  useValidateSchedule 
} from '@/hooks/api/useSchedules';
import { ScheduleUpdateData } from '@/types/schedule';

// Schéma de validation (même que création)
const editScheduleSchema = z.object({
  userId: z.string().min(1, 'Veuillez sélectionner un préparateur'),
  agencyId: z.string().min(1, 'Veuillez sélectionner une agence'),
  date: z.string().min(1, 'La date est requise'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis'),
  breakStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis').optional().or(z.literal('')),
  breakEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis').optional().or(z.literal('')),
  notes: z.string().optional(),
  status: z.enum(['active', 'cancelled', 'completed']).optional()
}).refine((data) => {
  const start = timeToMinutes(data.startTime);
  const end = timeToMinutes(data.endTime);
  return end > start;
}, {
  message: "L'heure de fin doit être après l'heure de début",
  path: ['endTime']
}).refine((data) => {
  if (data.breakStart && data.breakEnd) {
    const breakStart = timeToMinutes(data.breakStart);
    const breakEnd = timeToMinutes(data.breakEnd);
    const start = timeToMinutes(data.startTime);
    const end = timeToMinutes(data.endTime);
    
    return breakStart >= start && breakEnd <= end && breakEnd > breakStart;
  }
  return true;
}, {
  message: "Les heures de pause doivent être dans les heures de travail",
  path: ['breakEnd']
});

type EditScheduleForm = z.infer<typeof editScheduleSchema>;

// Fonction utilitaire pour convertir HH:MM en minutes
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Fonction utilitaire pour calculer la durée
function calculateDuration(startTime: string, endTime: string, breakStart?: string, breakEnd?: string): string {
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

export default function EditSchedulePage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.id as string;
  
  // États locaux
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Hooks API
  const { data: schedule, isLoading: isLoadingSchedule, error: scheduleError } = useSchedule(scheduleId);
  const { data: usersData, isLoading: isLoadingUsers } = useUsers({ limit: 100 });
  const { data: agenciesData, isLoading: isLoadingAgencies } = useAgencies({ limit: 100 });
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const duplicateSchedule = useDuplicateSchedule();
  const validateSchedule = useValidateSchedule();

  // Formulaire
  const form = useForm<EditScheduleForm>({
    resolver: zodResolver(editScheduleSchema),
    defaultValues: {
      userId: '',
      agencyId: '',
      date: '',
      startTime: '',
      endTime: '',
      breakStart: '',
      breakEnd: '',
      notes: '',
      status: 'active'
    }
  });

  const watchedFields = form.watch();

  // Pré-remplir le formulaire avec les données existantes
  useEffect(() => {
    if (schedule) {
      form.reset({
        userId: schedule.user.id,
        agencyId: schedule.agency.id,
        date: schedule.date.split('T')[0], // Convertir ISO en YYYY-MM-DD
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breakStart: schedule.breakStart || '',
        breakEnd: schedule.breakEnd || '',
        notes: schedule.notes || '',
        status: schedule.status
      });
    }
  }, [schedule, form]);

  // Détecter les changements
  useEffect(() => {
    if (schedule) {
      const currentValues = form.getValues();
      const originalValues = {
        userId: schedule.user.id,
        agencyId: schedule.agency.id,
        date: schedule.date.split('T')[0],
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breakStart: schedule.breakStart || '',
        breakEnd: schedule.breakEnd || '',
        notes: schedule.notes || '',
        status: schedule.status
      };

      const changed = Object.keys(currentValues).some(key => 
        currentValues[key as keyof EditScheduleForm] !== originalValues[key as keyof typeof originalValues]
      );
      setHasChanges(changed);
    }
  }, [watchedFields, schedule, form]);

  // Validation en temps réel des conflits
  useEffect(() => {
    if (schedule && hasChanges) {
      const { userId, agencyId, date, startTime, endTime, breakStart, breakEnd, notes } = watchedFields;
      
      if (userId && agencyId && date && startTime && endTime) {
        setIsValidating(true);
        
        const scheduleData = {
          userId,
          agencyId,
          date,
          startTime,
          endTime,
          breakStart: breakStart || undefined,
          breakEnd: breakEnd || undefined,
          notes: notes || undefined
        };

        validateSchedule.mutateAsync(scheduleData)
          .then(result => {
            // Filtrer les conflits avec le planning actuel
            const filteredConflicts = result.data?.conflicts?.filter(
              (conflict: any) => !conflict.scheduleIds?.includes(scheduleId)
            ) || [];
            setConflicts(filteredConflicts);
          })
          .catch(() => {
            setConflicts([]);
          })
          .finally(() => {
            setIsValidating(false);
          });
      }
    }
  }, [watchedFields, schedule, hasChanges, scheduleId, validateSchedule]);

  // Soumission du formulaire
  const onSubmit = async (data: EditScheduleForm) => {
    try {
      const updateData: ScheduleUpdateData = {
        userId: data.userId,
        agencyId: data.agencyId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        breakStart: data.breakStart || undefined,
        breakEnd: data.breakEnd || undefined,
        notes: data.notes || undefined,
        status: data.status
      };

      await updateSchedule.mutateAsync({ id: scheduleId, scheduleData: updateData });
      router.push('/schedules');
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  // Handlers
  const handleBack = () => {
    if (hasChanges) {
      if (confirm('Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?')) {
        router.back();
      }
    } else {
      router.back();
    }
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
        return <Badge variant="default">Actif</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      case 'completed':
        return <Badge variant="secondary">Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Loading state
  if (isLoadingSchedule || isLoadingUsers || isLoadingAgencies) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (scheduleError || !schedule) {
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

  const users = usersData?.data?.users || [];
  const agencies = agenciesData?.data?.agencies || [];
  const formData = form.getValues();

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
            <h1 className="text-2xl font-bold">Modifier le planning</h1>
            <p className="text-gray-600">
              Planning de {schedule.user.firstName} {schedule.user.lastName} - {new Date(schedule.date).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Statut actuel */}
          {getStatusBadge(schedule.status)}
          
          {/* Actions */}
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

      {/* Indicateur de modifications */}
      {hasChanges && (
        <Alert>
          <History className="h-4 w-4" />
          <AlertDescription>
            Vous avez des modifications non sauvegardées. N'oubliez pas de sauvegarder.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire principal */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Informations du planning
              </CardTitle>
              <CardDescription>
                Modifiez les détails du planning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Statut */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statut</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                Actif
                              </div>
                            </SelectItem>
                            <SelectItem value="cancelled">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                Annulé
                              </div>
                            </SelectItem>
                            <SelectItem value="completed">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                Terminé
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Préparateur et Agence */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Préparateur</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un préparateur" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>{user.firstName} {user.lastName}</span>
                                    <Badge variant="outline" className="ml-2">
                                      {user.agencies?.length || 0} agence(s)
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="agencyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agence</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une agence" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {agencies.map((agency) => (
                                <SelectItem key={agency.id} value={agency.id}>
                                  <div className="flex items-center gap-2">
                                    <Building className="h-4 w-4" />
                                    <div>
                                      <div className="font-medium">{agency.name}</div>
                                      <div className="text-sm text-gray-500">{agency.code} - {agency.client}</div>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Date */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Heures de travail */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Heures de travail
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Heure de début</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Heure de fin</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Affichage de la durée */}
                    {formData.startTime && formData.endTime && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">Durée totale</div>
                        <div className="font-medium">
                          {calculateDuration(formData.startTime, formData.endTime, formData.breakStart, formData.breakEnd)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pause déjeuner */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Pause déjeuner (optionnel)</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="breakStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Début de pause</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormDescription>
                              Laisser vide si pas de pause
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="breakEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fin de pause</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optionnel)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Instructions particulières, matériel spécifique, etc."
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Informations supplémentaires pour le préparateur
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Actions */}
                  <div className="flex gap-3 pt-6">
                    <Button type="submit" disabled={updateSchedule.isPending || !hasChanges}>
                      {updateSchedule.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Sauvegarder les modifications
                    </Button>
                    <Button type="button" variant="outline" onClick={handleBack}>
                      Annuler
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Validation et informations */}
        <div className="space-y-6">
          {/* Validation des conflits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : conflicts.length > 0 ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : hasChanges ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-gray-400" />
                )}
                Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasChanges ? (
                <div className="text-sm text-gray-600">
                  Aucune modification détectée
                </div>
              ) : isValidating ? (
                <div className="text-sm text-gray-600">
                  Vérification des conflits...
                </div>
              ) : conflicts.length > 0 ? (
                <div className="space-y-2">
                  {conflicts.map((conflict, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {conflict.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Aucun conflit détecté
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Informations originales */}
          <Card>
            <CardHeader>
              <CardTitle>Planning original</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>

          {/* Aperçu des modifications */}
          {hasChanges && (
            <Card>
              <CardHeader>
                <CardTitle>Aperçu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Préparateur</div>
                  <div className="font-medium">
                    {users.find(u => u.id === formData.userId)?.firstName} {users.find(u => u.id === formData.userId)?.lastName}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Agence</div>
                  <div className="font-medium">
                    {agencies.find(a => a.id === formData.agencyId)?.name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Date</div>
                  <div className="font-medium">
                    {new Date(formData.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Horaires</div>
                  <div className="font-medium">
                    {formData.startTime} - {formData.endTime}
                  </div>
                  {formData.breakStart && formData.breakEnd && (
                    <div className="text-sm text-gray-500">
                      Pause: {formData.breakStart} - {formData.breakEnd}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-600">Durée</div>
                  <div className="font-medium">
                    {calculateDuration(formData.startTime, formData.endTime, formData.breakStart, formData.breakEnd)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Statut</div>
                  <div>
                    {getStatusBadge(formData.status || 'active')}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}