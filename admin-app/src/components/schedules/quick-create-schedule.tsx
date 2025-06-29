// src/components/schedules/quick-create-schedule.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Calendar,
  Clock,
  User,
  Building,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';
import { useCreateSchedule, useScheduleConflicts, useBulkCreateSchedules } from '@/hooks/api/useSchedules';
import { ScheduleCreateData } from '@/types/schedule';

// Schéma de validation
const quickScheduleSchema = z.object({
  userId: z.string().min(1, 'Sélectionnez un préparateur'),
  agencyId: z.string().min(1, 'Sélectionnez une agence'),
  date: z.string().min(1, 'Date requise'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:mm requis'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:mm requis'),
  breakStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:mm requis').optional().or(z.literal('')),
  breakEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:mm requis').optional().or(z.literal('')),
  notes: z.string().optional(),
}).refine((data) => {
  const start = new Date(`2000-01-01T${data.startTime}`);
  const end = new Date(`2000-01-01T${data.endTime}`);
  return start < end;
}, {
  message: "L'heure de fin doit être après l'heure de début",
  path: ["endTime"]
}).refine((data) => {
  if (data.breakStart && data.breakEnd) {
    const breakStart = new Date(`2000-01-01T${data.breakStart}`);
    const breakEnd = new Date(`2000-01-01T${data.breakEnd}`);
    return breakStart < breakEnd;
  }
  return true;
}, {
  message: "L'heure de fin de pause doit être après l'heure de début",
  path: ["breakEnd"]
});

// Schéma pour la création en masse
const bulkScheduleSchema = z.object({
  userIds: z.array(z.string()).min(1, 'Sélectionnez au moins un préparateur'),
  agencyId: z.string().min(1, 'Sélectionnez une agence'),
  startDate: z.string().min(1, 'Date de début requise'),
  endDate: z.string().min(1, 'Date de fin requise'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:mm requis'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:mm requis'),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
  skipWeekends: z.boolean().default(true),
  skipConflicts: z.boolean().default(true),
});

type QuickScheduleForm = z.infer<typeof quickScheduleSchema>;
type BulkScheduleForm = z.infer<typeof bulkScheduleSchema>;

interface QuickCreateScheduleProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultDate?: string;
  defaultUserId?: string;
  defaultAgencyId?: string;
}

export function QuickCreateSchedule({ 
  isOpen, 
  onClose, 
  onSuccess,
  defaultDate,
  defaultUserId,
  defaultAgencyId 
}: QuickCreateScheduleProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  // Hooks API
  const { data: usersData } = useUsers({ limit: 100, status: 'active' });
  const { data: agenciesData } = useAgencies({ limit: 100 });
  const createSchedule = useCreateSchedule();
  const bulkCreateSchedules = useBulkCreateSchedules();
  const checkConflicts = useScheduleConflicts();

  // Forms
  const singleForm = useForm<QuickScheduleForm>({
    resolver: zodResolver(quickScheduleSchema),
    defaultValues: {
      userId: defaultUserId || '',
      agencyId: defaultAgencyId || '',
      date: defaultDate || new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      notes: ''
    }
  });

  const bulkForm = useForm<BulkScheduleForm>({
    resolver: zodResolver(bulkScheduleSchema),
    defaultValues: {
      userIds: [],
      agencyId: defaultAgencyId || '',
      startDate: defaultDate || new Date().toISOString().split('T')[0],
      endDate: defaultDate || new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      skipWeekends: true,
      skipConflicts: true
    }
  });

  // Reset forms when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      singleForm.reset({
        userId: defaultUserId || '',
        agencyId: defaultAgencyId || '',
        date: defaultDate || new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '17:00',
        breakStart: '12:00',
        breakEnd: '13:00',
        notes: ''
      });
      setConflicts([]);
    }
  }, [isOpen, defaultDate, defaultUserId, defaultAgencyId, singleForm]);

  // Vérification des conflits en temps réel
  const watchedValues = singleForm.watch(['userId', 'agencyId', 'date', 'startTime', 'endTime']);
  useEffect(() => {
    const [userId, agencyId, date, startTime, endTime] = watchedValues;
    
    if (userId && agencyId && date && startTime && endTime && mode === 'single') {
      const checkData: ScheduleCreateData = {
        userId,
        agencyId,
        date,
        startTime,
        endTime
      };

      setIsCheckingConflicts(true);
      checkConflicts.refetch()
        .then(result => {
          setConflicts(result.data?.conflicts || []);
        })
        .catch(() => {
          setConflicts([]);
        })
        .finally(() => {
          setIsCheckingConflicts(false);
        });
    }
  }, [watchedValues, mode, checkConflicts]);

  // Handlers
  const handleSingleSubmit = async (data: QuickScheduleForm) => {
    try {
      const scheduleData: ScheduleCreateData = {
        userId: data.userId,
        agencyId: data.agencyId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        ...(data.breakStart && { breakStart: data.breakStart }),
        ...(data.breakEnd && { breakEnd: data.breakEnd }),
        ...(data.notes && { notes: data.notes })
      };

      await createSchedule.mutateAsync(scheduleData);
      onSuccess?.();
      onClose();
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  const handleBulkSubmit = async (data: BulkScheduleForm) => {
    try {
      // Générer les dates entre startDate et endDate
      const dates: string[] = [];
      const current = new Date(data.startDate);
      const end = new Date(data.endDate);

      while (current <= end) {
        const isWeekend = current.getDay() === 0 || current.getDay() === 6;
        if (!data.skipWeekends || !isWeekend) {
          dates.push(current.toISOString().split('T')[0]);
        }
        current.setDate(current.getDate() + 1);
      }

      const bulkData = {
        template: {
          startTime: data.startTime,
          endTime: data.endTime,
          ...(data.breakStart && { breakStart: data.breakStart }),
          ...(data.breakEnd && { breakEnd: data.breakEnd })
        },
        assignments: data.userIds.map(userId => ({
          userId,
          agencyId: data.agencyId,
          dates
        })),
        options: {
          skipConflicts: data.skipConflicts,
          notifyUsers: false,
          overwrite: false
        }
      };

      await bulkCreateSchedules.mutateAsync(bulkData);
      onSuccess?.();
      onClose();
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  const copyTemplate = () => {
    const values = singleForm.getValues();
    bulkForm.setValue('agencyId', values.agencyId);
    bulkForm.setValue('startTime', values.startTime);
    bulkForm.setValue('endTime', values.endTime);
    bulkForm.setValue('breakStart', values.breakStart || '');
    bulkForm.setValue('breakEnd', values.breakEnd || '');
    setMode('bulk');
  };

  if (!isOpen) return null;

  const users = usersData?.data?.users || [];
  const agencies = agenciesData?.data?.agencies || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Création rapide de planning
          </DialogTitle>
          <DialogDescription>
            Créez un ou plusieurs plannings rapidement avec vérification automatique des conflits
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value: string) => setMode(value as 'single' | 'bulk')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Planning unique</TabsTrigger>
            <TabsTrigger value="bulk">Création en masse</TabsTrigger>
          </TabsList>

          {/* Planning unique */}
          <TabsContent value="single" className="space-y-4">
            <Form {...singleForm}>
              <form onSubmit={singleForm.handleSubmit(handleSingleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Préparateur */}
                  <FormField
                    control={singleForm.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Préparateur</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user: any) => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  {user.firstName} {user.lastName}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Agence */}
                  <FormField
                    control={singleForm.control}
                    name="agencyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agence</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {agencies.map((agency: any) => (
                              <SelectItem key={agency.id} value={agency.id}>
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4" />
                                  {agency.name}
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
                  control={singleForm.control}
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

                <div className="grid grid-cols-2 gap-4">
                  {/* Heure de début */}
                  <FormField
                    control={singleForm.control}
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

                  {/* Heure de fin */}
                  <FormField
                    control={singleForm.control}
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

                <div className="grid grid-cols-2 gap-4">
                  {/* Pause début */}
                  <FormField
                    control={singleForm.control}
                    name="breakStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Début pause (optionnel)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Pause fin */}
                  <FormField
                    control={singleForm.control}
                    name="breakEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fin pause (optionnel)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Notes */}
                <FormField
                  control={singleForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Notes ou instructions spéciales..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Vérification des conflits */}
                {isCheckingConflicts && (
                  <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Vérification des conflits en cours...
                    </AlertDescription>
                  </Alert>
                )}

                {conflicts.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Conflits détectés :</strong>
                      <ul className="mt-1 ml-4 list-disc">
                        {conflicts.map((conflict, index) => (
                          <li key={index}>{conflict.message}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createSchedule.isPending || conflicts.length > 0}
                    className="flex items-center gap-2"
                  >
                    {createSchedule.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Créer le planning
                  </Button>
                  <Button type="button" variant="outline" onClick={copyTemplate}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copier en masse
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Création en masse */}
          <TabsContent value="bulk" className="space-y-4">
            <Form {...bulkForm}>
              <form onSubmit={bulkForm.handleSubmit(handleBulkSubmit)} className="space-y-4">
                {/* Sélection multiple des préparateurs */}
                <FormField
                  control={bulkForm.control}
                  name="userIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Préparateurs</FormLabel>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                        {users.map((user: any) => (
                          <label key={user.id} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.value.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  field.onChange([...field.value, user.id]);
                                } else {
                                  field.onChange(field.value.filter(id => id !== user.id));
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{user.firstName} {user.lastName}</span>
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Agence */}
                <FormField
                  control={bulkForm.control}
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
                          {agencies.map((agency: any) => (
                            <SelectItem key={agency.id} value={agency.id}>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                {agency.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  {/* Date de début */}
                  <FormField
                    control={bulkForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de début</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date de fin */}
                  <FormField
                    control={bulkForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de fin</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Heure de début */}
                  <FormField
                    control={bulkForm.control}
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

                  {/* Heure de fin */}
                  <FormField
                    control={bulkForm.control}
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

                <div className="grid grid-cols-2 gap-4">
                  {/* Pause début */}
                  <FormField
                    control={bulkForm.control}
                    name="breakStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Début pause (optionnel)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Pause fin */}
                  <FormField
                    control={bulkForm.control}
                    name="breakEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fin pause (optionnel)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Options */}
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <h4 className="font-medium">Options de création</h4>
                    
                    <FormField
                      control={bulkForm.control}
                      name="skipWeekends"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Ignorer les week-ends</FormLabel>
                            <div className="text-sm text-gray-500">
                              Ne pas créer de plannings les samedis et dimanches
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={bulkForm.control}
                      name="skipConflicts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Ignorer les conflits</FormLabel>
                            <div className="text-sm text-gray-500">
                              Passer les créneaux qui entrent en conflit avec des plannings existants
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Aperçu */}
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-2">Aperçu de la création</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Préparateurs sélectionnés: <Badge variant="outline">{bulkForm.watch('userIds').length}</Badge></div>
                      <div>Période: {bulkForm.watch('startDate')} → {bulkForm.watch('endDate')}</div>
                      <div>Horaires: {bulkForm.watch('startTime')} - {bulkForm.watch('endTime')}</div>
                      {bulkForm.watch('breakStart') && bulkForm.watch('breakEnd') && (
                        <div>Pause: {bulkForm.watch('breakStart')} - {bulkForm.watch('breakEnd')}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={bulkCreateSchedules.isPending}
                    className="flex items-center gap-2"
                  >
                    {bulkCreateSchedules.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Créer les plannings
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}