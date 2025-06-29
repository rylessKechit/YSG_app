'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';
import { useCreateSchedule, useValidateSchedule } from '@/hooks/api/useSchedules';
import { ScheduleCreateData } from '@/types/schedule';

// Schéma de validation
const createScheduleSchema = z.object({
  userId: z.string().min(1, 'Veuillez sélectionner un préparateur'),
  agencyId: z.string().min(1, 'Veuillez sélectionner une agence'),
  date: z.string().min(1, 'La date est requise'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis'),
  breakStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis').optional().or(z.literal('')),
  breakEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis').optional().or(z.literal('')),
  notes: z.string().optional()
}).refine((data) => {
  // Validation: l'heure de fin doit être après l'heure de début
  const start = timeToMinutes(data.startTime);
  const end = timeToMinutes(data.endTime);
  return end > start;
}, {
  message: "L'heure de fin doit être après l'heure de début",
  path: ['endTime']
}).refine((data) => {
  // Validation: si pause définie, elle doit être cohérente
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

type CreateScheduleForm = z.infer<typeof createScheduleSchema>;

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

export default function CreateSchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // États locaux
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Hooks API
  const { data: usersData, isLoading: isLoadingUsers } = useUsers({ limit: 100 });
  const { data: agenciesData, isLoading: isLoadingAgencies } = useAgencies({ limit: 100 });
  const createSchedule = useCreateSchedule();

  // Formulaire
  const form = useForm<CreateScheduleForm>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: {
      userId: '',
      agencyId: '',
      date: '',
      startTime: '08:00',
      endTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      notes: ''
    }
  });

  const watchedFields = form.watch();

  // ✅ VALIDATION OPTIMISÉE - Plus de boucle infinie !
  const validation = useValidationOptimized(watchedFields, {
    debounceMs: 800, // Attendre 800ms avant de valider
    autoValidate: true,
    validateOnMount: false
  });

  // Pré-remplir depuis les paramètres URL
  useEffect(() => {
    const date = searchParams.get('date');
    const userId = searchParams.get('userId');
    const agencyId = searchParams.get('agencyId');
    const duplicate = searchParams.get('duplicate');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const breakStart = searchParams.get('breakStart');
    const breakEnd = searchParams.get('breakEnd');

    if (date) form.setValue('date', date);
    if (userId) form.setValue('userId', userId);
    if (agencyId) form.setValue('agencyId', agencyId);
    if (startTime) form.setValue('startTime', startTime);
    if (endTime) form.setValue('endTime', endTime);
    if (breakStart) form.setValue('breakStart', breakStart);
    if (breakEnd) form.setValue('breakEnd', breakEnd);
    
    if (duplicate === 'true') {
      setIsDuplicate(true);
    }
  }, [searchParams, form]);

  // Validation en temps réel des conflits - SUPPRIMÉ car géré par le hook optimisé
  // Plus besoin de ce useEffect problématique !

  // Soumission du formulaire
  const onSubmit = async (data: CreateScheduleForm) => {
    // Validation finale avant soumission
    const isValid = await validation.validateNow(data);
    
    if (!isValid) {
      toast.error('Veuillez corriger les erreurs avant de continuer');
      return;
    }

    try {
      const scheduleData: ScheduleCreateData = {
        userId: data.userId,
        agencyId: data.agencyId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        breakStart: data.breakStart || undefined,
        breakEnd: data.breakEnd || undefined,
        notes: data.notes || undefined
      };

      await createSchedule.mutateAsync(scheduleData);
      router.push('/schedules');
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  // Handlers
  const handleBack = () => {
    router.back();
  };

  const handleCopyTomorrow = () => {
    const currentDate = form.getValues('date');
    if (currentDate) {
      const tomorrow = new Date(currentDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      form.setValue('date', tomorrow.toISOString().split('T')[0]);
    }
  };

  // Loading state
  if (isLoadingUsers || isLoadingAgencies) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const users = usersData?.data?.users || [];
  const agencies = agenciesData?.data?.agencies || [];
  const formData = form.getValues();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isDuplicate ? 'Dupliquer un planning' : 'Nouveau planning'}
          </h1>
          <p className="text-gray-600">
            {isDuplicate ? 'Créer un planning basé sur un planning existant' : 'Créer un nouveau planning pour un préparateur'}
          </p>
        </div>
      </div>

      {/* Duplicate notice */}
      {isDuplicate && (
        <Alert>
          <Copy className="h-4 w-4" />
          <AlertDescription>
            Vous dupliquez un planning existant. Modifiez les informations selon vos besoins.
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
                Définissez les détails du planning pour le préparateur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        <div className="flex gap-2">
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          {field.value && (
                            <Button type="button" variant="outline" size="sm" onClick={handleCopyTomorrow}>
                              <Copy className="h-4 w-4 mr-2" />
                              Demain
                            </Button>
                          )}
                        </div>
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
                    <Button type="submit" disabled={createSchedule.isPending}>
                      {createSchedule.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Créer le planning
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

        {/* Sidebar - Validation et aperçu */}
        <div className="space-y-6">
          {/* Validation des conflits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : conflicts.length > 0 ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isValidating ? (
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
              ) : watchedFields.every(field => field) ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Aucun conflit détecté
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="text-sm text-gray-600">
                  Remplissez tous les champs pour valider
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aperçu */}
          {watchedFields.every(field => field) && (
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}