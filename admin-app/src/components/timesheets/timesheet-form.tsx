'use client&apos;;

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from &apos;@/components/ui/form&apos;;
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from &apos;@/components/ui/select&apos;;
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Coffee, AlertTriangle } from 'lucide-react';

import { Timesheet, TimesheetCreateData, TimesheetUpdateData } from '@/types/timesheet';
import { User } from '@/types/auth';
import { Agency } from '@/types/agency';
import { formatTime, formatVariance } from '@/lib/utils/timesheet-utils';

// Schéma de validation Zod
const timesheetFormSchema = z.object({
  userId: z.string().min(1, 'Sélectionnez un employé&apos;),
  agencyId: z.string().min(1, 'Sélectionnez une agence&apos;),
  date: z.string().min(1, 'Sélectionnez une date&apos;),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
  notes: z.string().optional(),
  adminNotes: z.string().optional(),
  status: z.enum(['incomplete', 'complete', &apos;validated&apos;, 'disputed']).optional(),
}).refine((data) => {
  // Validation: heure fin après heure début
  if (data.startTime && data.endTime) {
    return data.endTime > data.startTime;
  }
  return true;
}, {
  message: "L&apos;heure de fin doit être après l&apos;heure de début",
  path: ["endTime"],
}).refine((data) => {
  // Validation: pause cohérente
  if (data.breakStart && data.breakEnd) {
    return data.breakEnd > data.breakStart;
  }
  return true;
}, {
  message: "L&apos;heure de fin de pause doit être après l&apos;heure de début",
  path: ["breakEnd"],
});

type TimesheetFormData = z.infer<typeof timesheetFormSchema>;

interface TimesheetFormProps {
  timesheet?: Timesheet;
  users: User[];
  agencies: Agency[];
  isLoading?: boolean;
  onSubmit: (data: TimesheetCreateData | TimesheetUpdateData) => void;
  onCancel: () => void;
}

export function TimesheetForm({
  timesheet,
  users,
  agencies,
  isLoading = false,
  onSubmit,
  onCancel,
}: TimesheetFormProps) {
  const isEdit = !!timesheet;
  
  const form = useForm<TimesheetFormData>({
    resolver: zodResolver(timesheetFormSchema),
    defaultValues: {
      userId: &apos;&apos;,
      agencyId: &apos;&apos;,
      date: &apos;&apos;,
      startTime: &apos;&apos;,
      endTime: &apos;&apos;,
      breakStart: &apos;&apos;,
      breakEnd: &apos;&apos;,
      notes: &apos;&apos;,
      adminNotes: &apos;&apos;,
      status: &apos;incomplete&apos;,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (timesheet) {
      const user = typeof timesheet.user === 'object' ? timesheet.user : null;
      const agency = typeof timesheet.agency === 'object' ? timesheet.agency : null;
      
      form.reset({
        userId: user?.id || &apos;&apos;,
        agencyId: agency?.id || &apos;&apos;,
        date: timesheet.date.split('T')[0], // Format YYYY-MM-DD
        startTime: timesheet.startTime ? format(parseISO(timesheet.startTime), 'HH:mm') : &apos;&apos;,
        endTime: timesheet.endTime ? format(parseISO(timesheet.endTime), 'HH:mm') : &apos;&apos;,
        breakStart: timesheet.breakStart ? format(parseISO(timesheet.breakStart), 'HH:mm') : &apos;&apos;,
        breakEnd: timesheet.breakEnd ? format(parseISO(timesheet.breakEnd), 'HH:mm') : &apos;&apos;,
        notes: timesheet.notes || &apos;&apos;,
        adminNotes: timesheet.adminNotes || &apos;&apos;,
        status: timesheet.status,
      });
    }
  }, [timesheet, form]);

  const handleSubmit = (data: TimesheetFormData) => {
    // Créer les données de base
    const baseData = {
      startTime: data.startTime ? `${data.date}T${data.startTime}:00.000Z` : undefined,
      endTime: data.endTime ? `${data.date}T${data.endTime}:00.000Z` : undefined,
      breakStart: data.breakStart ? `${data.date}T${data.breakStart}:00.000Z` : undefined,
      breakEnd: data.breakEnd ? `${data.date}T${data.breakEnd}:00.000Z` : undefined,
      notes: data.notes,
      adminNotes: data.adminNotes,
      status: data.status,
    };

    if (isEdit) {
      // Pour les mises à jour, on n'envoie que les données modifiables
      const updateData: TimesheetUpdateData = baseData;
      onSubmit(updateData);
    } else {
      // Pour les créations, on ajoute userId, agencyId et date
      const createData: TimesheetCreateData = {
        ...baseData,
        userId: data.userId,
        agencyId: data.agencyId,
        date: data.date,
      };
      onSubmit(createData);
    }
  };

  // Calculer les écarts si on a un planning de référence
  const calculateVariance = () => {
    if (!timesheet?.schedule || typeof timesheet.schedule === &apos;string&apos;) return null;
    
    const formStartTime = form.watch('startTime');
    if (!formStartTime) return null;
    
    const schedule = timesheet.schedule;
    const [formHours, formMinutes] = formStartTime.split(':').map(Number);
    const [scheduleHours, scheduleMinutes] = schedule.startTime.split(':').map(Number);
    
    const formTotalMinutes = formHours * 60 + formMinutes;
    const scheduleTotalMinutes = scheduleHours * 60 + scheduleMinutes;
    
    return formTotalMinutes - scheduleTotalMinutes;
  };

  const variance = calculateVariance();

  return (
    <div className="space-y-6">
      {/* Header avec comparaison si modification */}
      {isEdit && timesheet?.schedule && typeof timesheet.schedule === &apos;object&apos; && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Comparaison avec le planning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-gray-600 mb-2">Planning prévu</h4>
                <div className="space-y-1">
                  <p className="text-sm">
                    🕐 {timesheet.schedule.startTime} - {timesheet.schedule.endTime}
                  </p>
                  {timesheet.schedule.breakStart && timesheet.schedule.breakEnd && (
                    <p className="text-sm text-gray-600">
                      ☕ Pause {timesheet.schedule.breakStart} - {timesheet.schedule.breakEnd}
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-gray-600 mb-2">Écart calculé</h4>
                {variance !== null && (
                  <div className="flex items-center gap-2">
                    <Badge variant={variance > 15 ? &apos;destructive&apos; : variance > 5 ? &apos;secondary&apos; : &apos;default'}>
                      {formatVariance(variance).text}
                    </Badge>
                    {variance > 15 && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulaire principal */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Sélection employé et agence (seulement en création) */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employé</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un employé" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une agence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {agencies.map((agency) => (
                          <SelectItem key={agency.id} value={agency.id}>
                            {agency.name} ({agency.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Date */}
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
                  <Input type="date" {...field} disabled={isEdit} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Heures de travail */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Heures de travail
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure d&apos;arrivée</FormLabel>
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
                    <FormLabel>Heure de départ</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Pauses */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Coffee className="h-4 w-4" />
              Pauses
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="breakStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Début pause</FormLabel>
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
                    <FormLabel>Fin pause</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Statut (seulement en modification) */}
          {isEdit && (
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="incomplete">Incomplet</SelectItem>
                      <SelectItem value="complete">Complet</SelectItem>
                      <SelectItem value="validated">Validé</SelectItem>
                      <SelectItem value="disputed">En litige</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes employé</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Notes ou commentaires de l&apos;employé..." 
                    {...field} 
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
                <FormLabel>Notes administrateur</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Raison de la modification, commentaires admin..." 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? &apos;Sauvegarde...&apos; : isEdit ? &apos;Modifier&apos; : 'Créer'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}