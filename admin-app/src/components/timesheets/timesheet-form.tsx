// admin-app/src/components/timesheets/timesheet-form.tsx - CORRECTION OVERFLOW
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Clock, Save, X, Calculator } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';
import { cn } from '@/lib/utils';

// Types et schemas
interface TimesheetFormData {
  userId: string;
  agencyId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  notes: string;
  adminNotes: string;
  status: 'incomplete' | 'complete' | 'pending';
}

interface TimesheetFormProps {
  timesheet?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const timesheetSchema = z.object({
  userId: z.string().min(1, 'Utilisateur requis'),
  agencyId: z.string().min(1, 'Agence requise'),
  date: z.string().min(1, 'Date requise'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
  notes: z.string().optional(),
  adminNotes: z.string().optional(),
  status: z.enum(['incomplete', 'complete', 'pending']),
}).refine((data) => {
  if (data.startTime && data.endTime) {
    const start = new Date(`2000-01-01T${data.startTime}`);
    const end = new Date(`2000-01-01T${data.endTime}`);
    return end > start;
  }
  return true;
}, {
  message: "L'heure de fin doit être après l'heure de début",
  path: ["endTime"],
}).refine((data) => {
  if (data.breakStart && data.breakEnd) {
    const start = new Date(`2000-01-01T${data.breakStart}`);
    const end = new Date(`2000-01-01T${data.breakEnd}`);
    return end > start;
  }
  return true;
}, {
  message: "La fin de pause doit être après le début de pause",
  path: ["breakEnd"],
});

export function TimesheetForm({ timesheet, onSubmit, onCancel, isLoading = false }: TimesheetFormProps) {
  const [calculatedDuration, setCalculatedDuration] = useState<string>('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Hooks pour les données
  const { data: usersResponse, isLoading: usersLoading } = useUsers();
  const { data: agenciesResponse, isLoading: agenciesLoading } = useAgencies();

  const users = usersResponse?.data?.users || [];
  const agencies = agenciesResponse?.agencies || [];

  // Form setup
  const form = useForm<TimesheetFormData>({
    resolver: zodResolver(timesheetSchema),
    defaultValues: {
      userId: '',
      agencyId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '',
      endTime: '',
      breakStart: '',
      breakEnd: '',
      notes: '',
      adminNotes: '',
      status: 'incomplete',
    },
  });

  const watchedFields = form.watch(['startTime', 'endTime', 'breakStart', 'breakEnd']);

  // Pré-remplir le formulaire si on édite
  useEffect(() => {
    if (timesheet) {
      const user = typeof timesheet.user === 'object' ? timesheet.user : null;
      const agency = typeof timesheet.agency === 'object' ? timesheet.agency : null;
      
      form.reset({
        userId: user?.id || '',
        agencyId: agency?.id || '',
        date: timesheet.date,
        startTime: timesheet.startTime ? 
          format(parseISO(timesheet.startTime), 'HH:mm') : '',
        endTime: timesheet.endTime ? 
          format(parseISO(timesheet.endTime), 'HH:mm') : '',
        breakStart: timesheet.breakStart ? 
          format(parseISO(timesheet.breakStart), 'HH:mm') : '',
        breakEnd: timesheet.breakEnd ? 
          format(parseISO(timesheet.breakEnd), 'HH:mm') : '',
        notes: timesheet.notes || '',
        adminNotes: timesheet.adminNotes || '',
        status: timesheet.status,
      });
    }
  }, [timesheet, form]);

  // Calcul automatique de la durée
  useEffect(() => {
    const [startTime, endTime, breakStart, breakEnd] = watchedFields;
    
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      let totalMinutes = differenceInMinutes(end, start);
      
      // Déduire la pause si elle est définie
      if (breakStart && breakEnd) {
        const breakStartTime = new Date(`2000-01-01T${breakStart}`);
        const breakEndTime = new Date(`2000-01-01T${breakEnd}`);
        const breakMinutes = differenceInMinutes(breakEndTime, breakStartTime);
        totalMinutes -= breakMinutes;
      }
      
      if (totalMinutes > 0) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        setCalculatedDuration(`${hours}h${minutes.toString().padStart(2, '0')}`);
      } else {
        setCalculatedDuration('');
      }
    } else {
      setCalculatedDuration('');
    }
  }, [watchedFields]);

  // ===== HANDLERS =====
  const handleSubmit = (data: TimesheetFormData) => {
    // Conversion des heures en format DateTime complet
    const baseDate = data.date;
    
    const formatDateTime = (time?: string) => {
      return time ? new Date(`${baseDate}T${time}:00.000Z`).toISOString() : null;
    };

    const formattedData = {
      userId: data.userId,
      agencyId: data.agencyId,
      date: data.date,
      startTime: formatDateTime(data.startTime),
      endTime: formatDateTime(data.endTime),
      breakStart: formatDateTime(data.breakStart),
      breakEnd: formatDateTime(data.breakEnd),
      notes: data.notes,
      adminNotes: data.adminNotes,
      status: data.status,
    };

    onSubmit(formattedData);
  };

  const selectedUser = useMemo(() => {
    const userId = form.watch('userId');
    return users.find((user: any) => user.id === userId);
  }, [users, form.watch('userId')]);

  const selectedAgency = useMemo(() => {
    const agencyId = form.watch('agencyId');
    return agencies.find((agency: any) => agency.id === agencyId);
  }, [agencies, form.watch('agencyId')]);

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* ✅ CORRECTION 1: Grid responsive avec overflow contrôlé */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informations de base */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Informations de base
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Utilisateur */}
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employé *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={usersLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un employé" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                              <span className="ml-2 text-sm text-gray-500">
                                ({user.email})
                              </span>
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
                  control={form.control}
                  name="agencyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agence *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={agenciesLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une agence" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {agencies.map((agency: any) => (
                            <SelectItem key={agency.id} value={agency.id}>
                              {agency.name}
                              {agency.code && (
                                <span className="ml-2 text-sm text-gray-500">
                                  ({agency.code})
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), 'PPP', { locale: fr })
                              ) : (
                                <span>Sélectionner une date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(format(date, 'yyyy-MM-dd'));
                                setCalendarOpen(false);
                              }
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          <SelectItem value="incomplete">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              Incomplet
                            </div>
                          </SelectItem>
                          <SelectItem value="complete">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              Complet
                            </div>
                          </SelectItem>
                          <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              En attente
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Horaires */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Horaires
                  {calculatedDuration && (
                    <Badge variant="secondary" className="ml-auto">
                      {calculatedDuration}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Arrivée */}
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure d'arrivée</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Départ */}
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure de départ</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Début pause */}
                <FormField
                  control={form.control}
                  name="breakStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Début de pause</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fin pause */}
                <FormField
                  control={form.control}
                  name="breakEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fin de pause</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Calcul automatique */}
                {calculatedDuration && (
                  <Alert>
                    <Calculator className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Durée calculée:</strong> {calculatedDuration}
                      {watchedFields[2] && watchedFields[3] && (
                        <span className="text-sm text-gray-600 block mt-1">
                          (pauses déduites automatiquement)
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ✅ CORRECTION 2: Section notes avec hauteur contrôlée */}
          <Card>
            <CardHeader>
              <CardTitle>Notes et commentaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Notes employé */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes de l'employé</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Notes ou commentaires de l'employé..."
                          className="resize-none h-24"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes admin */}
                <FormField
                  control={form.control}
                  name="adminNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes administratives</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Notes internes (visibles uniquement par les admins)..."
                          className="resize-none h-24"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ✅ CORRECTION 3: Footer avec actions collé en bas */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto sm:ml-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading 
                ? (timesheet ? 'Modification...' : 'Création...') 
                : (timesheet ? 'Modifier le pointage' : 'Créer le pointage')
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}