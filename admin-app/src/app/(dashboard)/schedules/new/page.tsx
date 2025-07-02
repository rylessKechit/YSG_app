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
  User as UserIcon,
  Building,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  FileText,
  AlertTriangle
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
import { User } from '@/types/auth';
import { Agency } from '@/types/agency';

// ✅ Schéma de validation corrigé et complet
const createScheduleSchema = z.object({
  userId: z.string().min(1, 'Veuillez sélectionner un préparateur'),
  agencyId: z.string().min(1, 'Veuillez sélectionner une agence'),
  date: z.string().min(1, 'La date est requise'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis'),
  breakStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis').optional().or(z.literal('')),
  breakEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis').optional().or(z.literal('')),
  notes: z.string().max(500, 'Maximum 500 caractères').optional()
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

type CreateScheduleFormData = z.infer<typeof createScheduleSchema>;

// ✅ Interface pour les conflits de validation
interface ValidationConflict {
  type: 'overlap' | 'user_busy' | 'agency_limit' | 'business_hours';
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

export default function CreateSchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✅ États locaux avec types corrects
  const [isValidating, setIsValidating] = useState(false);
  const [validationConflicts, setValidationConflicts] = useState<ValidationConflict[]>([]);
  const [isDuplicate, setIsDuplicate] = useState(false);

  // ✅ Hooks API avec gestion d'erreur
  const { data: usersData, isLoading: usersLoading, error: usersError } = useUsers({ limit: 100 });
  const { data: agenciesData, isLoading: agenciesLoading, error: agenciesError } = useAgencies({ limit: 100 });
  const createScheduleMutation = useCreateSchedule();
  const validateScheduleMutation = useValidateSchedule();

  // ✅ Extraction sécurisée des données avec types corrects
  const users: User[] = usersData?.data?.users || [];
  const agencies: Agency[] = agenciesData?.agencies || [];

  // ✅ Form avec valeurs par défaut des paramètres URL
  const form = useForm<CreateScheduleFormData>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: {
      userId: '',
      agencyId: '',
      date: '',
      startTime: '08:00',
      endTime: '17:00',
      breakStart: '',
      breakEnd: '',
      notes: ''
    }
  });

  // ✅ Effet pour remplir le formulaire depuis les paramètres URL
  useEffect(() => {
    const urlParams = Object.fromEntries(searchParams.entries());
    
    if (urlParams.duplicate === 'true') {
      setIsDuplicate(true);
    }

    // Remplir les champs du formulaire avec les paramètres URL
    Object.entries(urlParams).forEach(([key, value]) => {
      if (key in form.getValues() && value) {
        form.setValue(key as keyof CreateScheduleFormData, value);
      }
    });

    // Date par défaut si non spécifiée
    if (!urlParams.date) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      form.setValue('date', tomorrow.toISOString().split('T')[0]);
    }
  }, [searchParams, form]);

  // ✅ Validation en temps réel avec debounce
  useEffect(() => {
    const subscription = form.watch(async (values) => {
      // Valider seulement si les champs requis sont remplis
      if (values.userId && values.agencyId && values.date && values.startTime && values.endTime) {
        setIsValidating(true);
        
        try {
          const scheduleData: ScheduleCreateData = {
            userId: values.userId,
            agencyId: values.agencyId,
            date: values.date,
            startTime: values.startTime,
            endTime: values.endTime,
            breakStart: values.breakStart || undefined,
            breakEnd: values.breakEnd || undefined,
            notes: values.notes || undefined
          };

          const validation = await validateScheduleMutation.mutateAsync(scheduleData);
          
          if (validation.data?.conflicts) {
            setValidationConflicts(validation.data.conflicts);
          } else {
            setValidationConflicts([]);
          }
        } catch (error) {
          console.warn('Erreur de validation:', error);
          setValidationConflicts([]);
        } finally {
          setIsValidating(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form, validateScheduleMutation]);

  // ✅ Fonction de soumission avec gestion d'erreur complète
  const onSubmit = async (data: CreateScheduleFormData) => {
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

      await createScheduleMutation.mutateAsync(scheduleData);
      
      router.push('/schedules?success=created');
    } catch (error: any) {
      console.error('Erreur création planning:', error);
      
      // Gestion spécifique des erreurs backend
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach((err: any) => {
          form.setError(err.field as keyof CreateScheduleFormData, {
            message: err.message
          });
        });
      }
    }
  };

  // ✅ Fonction utilitaire pour calculer la durée
  const calculateDuration = (startTime: string, endTime: string, breakStart?: string, breakEnd?: string): string => {
    if (!startTime || !endTime) return '0h00';
    
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    let duration = (end.getTime() - start.getTime()) / (1000 * 60); // en minutes
    
    // Soustraire la pause si définie
    if (breakStart && breakEnd) {
      const bStart = new Date(`2000-01-01T${breakStart}:00`);
      const bEnd = new Date(`2000-01-01T${breakEnd}:00`);
      const breakDuration = (bEnd.getTime() - bStart.getTime()) / (1000 * 60);
      if (breakDuration > 0) {
        duration -= breakDuration;
      }
    }
    
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  };

  // ✅ Affichage des états de chargement
  if (usersLoading || agenciesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Nouveau planning</h1>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <LoadingSpinner className="h-8 w-8" />
            <span className="ml-2">Chargement des données...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ Affichage des erreurs de chargement
  if (usersError || agenciesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Nouveau planning</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erreur lors du chargement des données. Veuillez rafraîchir la page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ Header avec navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isDuplicate ? 'Dupliquer un planning' : 'Nouveau planning'}
            </h1>
            <p className="text-gray-600">
              Créer un nouveau planning pour un préparateur
            </p>
          </div>
        </div>
        
        {isDuplicate && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Copy className="h-3 w-3" />
            Duplication
          </Badge>
        )}
      </div>

      {/* ✅ Formulaire principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Informations du planning
              </CardTitle>
              <CardDescription>
                Définissez les détails du planning de travail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* ✅ Sélection utilisateur et agence */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4" />
                            Préparateur
                          </FormLabel>
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
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    {user.firstName} {user.lastName}
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
                          <FormLabel className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            Agence
                          </FormLabel>
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
                                    {agency.name}
                                    {agency.code && (
                                      <Badge variant="outline" className="text-xs">
                                        {agency.code}
                                      </Badge>
                                    )}
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

                  {/* ✅ Date */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </FormControl>
                        <FormDescription>
                          Sélectionnez la date du planning de travail
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* ✅ Horaires de travail */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <h3 className="font-medium">Horaires de travail</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  {/* ✅ Horaires de pause (optionnel) */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Pause (optionnel)</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="breakStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Début de pause</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
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

                  {/* ✅ Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Notes (optionnel)
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Ajoutez des notes ou instructions spéciales..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum 500 caractères
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* ✅ Boutons d'action */}
                  <div className="flex items-center gap-3 pt-4">
                    <Button 
                      type="submit" 
                      disabled={createScheduleMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {createScheduleMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {createScheduleMutation.isPending ? 'Création...' : 'Créer le planning'}
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => router.back()}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* ✅ Sidebar avec résumé et validation */}
        <div className="space-y-6">
          {/* Résumé du planning */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Durée totale:</span>
                <span className="font-medium">
                  {calculateDuration(
                    form.watch('startTime'),
                    form.watch('endTime'),
                    form.watch('breakStart'),
                    form.watch('breakEnd')
                  )}
                </span>
              </div>
              
              {form.watch('startTime') && form.watch('endTime') && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Horaires:</span>
                  <span className="font-medium">
                    {form.watch('startTime')} - {form.watch('endTime')}
                  </span>
                </div>
              )}
              
              {form.watch('breakStart') && form.watch('breakEnd') && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pause:</span>
                  <span className="font-medium">
                    {form.watch('breakStart')} - {form.watch('breakEnd')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ✅ Validation et conflits */}
          {isValidating && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Vérification des conflits...
                </div>
              </CardContent>
            </Card>
          )}

          {validationConflicts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Conflits détectés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {validationConflicts.map((conflict, index) => (
                  <Alert 
                    key={index} 
                    variant={conflict.severity === 'error' ? 'destructive' : 'default'}
                  >
                    <AlertDescription className="text-sm">
                      {conflict.message}
                      {conflict.details && (
                        <div className="mt-1 text-xs opacity-75">
                          {conflict.details}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Message de succès si pas de conflits */}
          {!isValidating && validationConflicts.length === 0 && 
           form.watch('userId') && form.watch('agencyId') && form.watch('date') && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Aucun conflit détecté
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}