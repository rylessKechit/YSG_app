// admin-app/src/app/(dashboard)/schedules/[id]/edit/page.tsx - CORRECTION ERREUR 'DATA'
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, 
  Save, 
  Copy, 
  Trash2, 
  AlertCircle,
  Clock,
  Building,
  Calendar
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { 
  useSchedule, 
  useUpdateSchedule, 
  useDeleteSchedule 
} from '@/hooks/api/useSchedules';
import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';

// Types définis localement
interface Schedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
  status: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  agency: {
    id: string;
    name: string;
    code: string;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Agency {
  id: string;
  name: string;
  code: string;
}

interface UpdateScheduleData {
  userId: string;
  agencyId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
  status: 'active' | 'cancelled' | 'completed';
}

// ✅ CORRECTION: Types pour les retours d'API'
interface ApiScheduleResponse {
  data?: {
    schedule?: Schedule;
  };
}

interface ApiUsersResponse {
  data?: {
    users?: User[];
  };
}

interface ApiAgenciesResponse {
  data?: {
    agencies?: Agency[];
  };
}

// Schéma de validation
const editScheduleSchema = z.object({
  userId: z.string().min(1, 'Utilisateur requis'),
  agencyId: z.string().min(1, 'Agence requise'),
  date: z.string().min(1, 'Date requise'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis'),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'cancelled', 'completed']).default('active')
}).refine((data) => {
  // Validation: heure de fin après heure de début
  const start = new Date(`2000-01-01T${data.startTime}:00`);
  const end = new Date(`2000-01-01T${data.endTime}:00`);
  return end > start;
}, {
  message: 'L\'heure de fin doit être après l\'heure de début',
  path: ['endTime']
}).refine((data) => {
  // Validation: pause cohérente si définie
  if (!data.breakStart || !data.breakEnd) return true;
  
  const breakStart = new Date(`2000-01-01T${data.breakStart}:00`);
  const breakEnd = new Date(`2000-01-01T${data.breakEnd}:00`);
  const workStart = new Date(`2000-01-01T${data.startTime}:00`);
  const workEnd = new Date(`2000-01-01T${data.endTime}:00`);
  
  return breakStart >= workStart && 
         breakEnd <= workEnd && 
         breakEnd > breakStart;
}, {
  message: 'Les horaires de pause doivent être cohérents avec les horaires de travail',
  path: ['breakEnd']
});

type EditScheduleForm = z.infer<typeof editScheduleSchema>;

// Fonction utilitaire pour le calcul de durée
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

export default function EditSchedulePage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.id as string;
  
  // États locaux
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // ✅ CORRECTION: Hooks API avec typage approprié
  const { 
    data: scheduleData, 
    isLoading: isLoadingSchedule, 
    error: scheduleError,
    refetch: refetchSchedule
  } = useSchedule(scheduleId) as {
    data: ApiScheduleResponse | undefined;
    isLoading: boolean;
    error: any;
    refetch: () => void;
  };

  const { data: usersData, isLoading: isLoadingUsers } = useUsers({ 
    limit: 100
  }) as {
    data: ApiUsersResponse | undefined;
    isLoading: boolean;
  };
  
  const { data: agenciesData, isLoading: isLoadingAgencies } = useAgencies({ 
    limit: 100
  }) as {
    data: ApiAgenciesResponse | undefined;
    isLoading: boolean;
  };

  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  // ✅ CORRECTION: Extraction sécurisée des données
  const schedule: Schedule | undefined = scheduleData?.data?.schedule;
  const users: User[] = usersData?.data?.users || [];
  const agencies: Agency[] = agenciesData?.data?.agencies || [];

  // Formulaire avec valeurs par défaut
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

  // Pré-remplir le formulaire de manière sécurisée
  useEffect(() => {
    if (schedule && !form.formState.isDirty) {
      console.log('🔄 Pré-remplissage du formulaire:', schedule);
      
      const formData: EditScheduleForm = {
        userId: schedule.user?.id || '',
        agencyId: schedule.agency?.id || '',
        date: schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : '',
        startTime: schedule.startTime || '',
        endTime: schedule.endTime || '',
        breakStart: schedule.breakStart || '',
        breakEnd: schedule.breakEnd || '',
        notes: schedule.notes || '',
        status: (schedule.status as 'active' | 'cancelled' | 'completed') || 'active'
      };

      form.reset(formData);
      setHasChanges(false);
    }
  }, [schedule, form]);

  // Détecter les changements
  useEffect(() => {
    if (schedule) {
      const currentValues = form.getValues();
      const originalValues: EditScheduleForm = {
        userId: schedule.user?.id || '',
        agencyId: schedule.agency?.id || '',
        date: schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : '',
        startTime: schedule.startTime || '',
        endTime: schedule.endTime || '',
        breakStart: schedule.breakStart || '',
        breakEnd: schedule.breakEnd || '',
        notes: schedule.notes || '',
        status: (schedule.status as 'active' | 'cancelled' | 'completed') || 'active'
      };

      const hasFormChanges = JSON.stringify(currentValues) !== JSON.stringify(originalValues);
      setHasChanges(hasFormChanges);
    }
  }, [watchedFields, schedule, form]);

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

  const handleSubmit = async (data: EditScheduleForm) => {
    console.log('🚀 Soumission du formulaire:', data);
    setIsSubmitting(true);
    
    try {
      const updateData: UpdateScheduleData = {
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

      await updateSchedule.mutateAsync({
        id: scheduleId,
        scheduleData: updateData
      });

      console.log('✅ Planning mis à jour avec succès');
      router.push('/schedules');
    } catch (error) {
      console.error('❌ Erreur lors de la soumission:', error);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce planning ? Cette action est irréversible.')) {
      try {
        await deleteSchedule.mutateAsync(scheduleId);
        console.log('✅ Planning supprimé avec succès');
        router.push('/schedules');
      } catch (error) {
        console.error('❌ Erreur suppression:', error);
      }
    }
  };

  const handleDuplicate = () => {
    if (schedule) {
      const params = new URLSearchParams({
        userId: schedule.user.id,
        agencyId: schedule.agency.id,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        ...(schedule.breakStart && { breakStart: schedule.breakStart }),
        ...(schedule.breakEnd && { breakEnd: schedule.breakEnd }),
        ...(schedule.notes && { notes: schedule.notes }),
        duplicate: 'true'
      });
      router.push(`/schedules/new?${params}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      case 'completed':
        return <Badge variant="secondary">Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Gestion des états de chargement et d'erreur'
  if (isLoadingSchedule || isLoadingUsers || isLoadingAgencies) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
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
              <p className="text-gray-600 mt-4">Chargement du planning...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (scheduleError || !schedule) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Planning non trouvé</h2>
            <p className="text-gray-600 mb-4 text-center">
              Le planning demandé n'existe pas ou vous n'avez pas les permissions pour y accéder.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => refetchSchedule()}>
                Réessayer
              </Button>
              <Button variant="outline" onClick={() => router.push('/schedules')}>
                Retour aux plannings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
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
          {getStatusBadge(schedule.status)}
          
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Dupliquer
          </Button>
          
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleteSchedule.isPending}
          >
            {deleteSchedule.isPending ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Supprimer
          </Button>
        </div>
      </div>

      {/* Aperçu du planning actuel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Informations actuelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {schedule.user.firstName?.[0]}{schedule.user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{schedule.user.firstName} {schedule.user.lastName}</div>
                <div className="text-sm text-gray-500">{schedule.user.email}</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Building className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium">{schedule.agency.name}</div>
                <div className="text-sm text-gray-500">Code: {schedule.agency.code}</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium">{schedule.startTime} - {schedule.endTime}</div>
                <div className="text-sm text-gray-500">
                  Durée: {calculateDuration(schedule.startTime, schedule.endTime, schedule.breakStart, schedule.breakEnd)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire d'édition */}'
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Modifier le planning</CardTitle>
              <CardDescription>
                Modifiez les informations du planning. Les champs marqués d'un * sont obligatoires.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Assignation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Préparateur *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un préparateur" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center space-x-2">
                                <span>{user.firstName} {user.lastName}</span>
                                <span className="text-sm text-gray-500">({user.email})</span>
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
                      <FormLabel>Agence *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une agence" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {agencies.map((agency) => (
                            <SelectItem key={agency.id} value={agency.id}>
                              <div className="flex items-center space-x-2">
                                <span>{agency.name}</span>
                                <span className="text-sm text-gray-500">({agency.code})</span>
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

              {/* Date et statut */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          <SelectItem value="active">Actif</SelectItem>
                          <SelectItem value="cancelled">Annulé</SelectItem>
                          <SelectItem value="completed">Terminé</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Horaires de travail */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Horaires de travail</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heure de début *</FormLabel>
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
                        <FormLabel>Heure de fin *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Affichage de la durée calculée */}
                {watchedFields.startTime && watchedFields.endTime && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Durée de travail: {calculateDuration(watchedFields.startTime, watchedFields.endTime, watchedFields.breakStart, watchedFields.breakEnd)}
                    </AlertDescription>
                  </Alert>
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
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !hasChanges}
                  className="min-w-[140px]"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </>
                  )}
                </Button>

                <Button type="button" variant="outline" onClick={handleBack}>
                  Annuler
                </Button>

                {hasChanges && (
                  <Badge variant="outline" className="ml-2 px-3 py-1">
                    Modifications non sauvegardées
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}