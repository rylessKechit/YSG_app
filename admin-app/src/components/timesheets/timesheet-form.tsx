// admin-app/src/components/timesheets/timesheet-form.tsx - FICHIER COMPLET CORRIGÉ
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO, differenceInMinutes } from 'date-fns';

import {
  Form,
  FormControl,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Clock, Calendar, User, Building, AlertTriangle, CheckCircle } from 'lucide-react';

// ===== TYPES LOCAUX POUR ÉVITER LES ERREURS D'IMPORT =====

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Agency {
  id: string;
  name: string;
  code?: string;
}

interface Timesheet {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
  totalWorkedMinutes?: number;
  notes?: string;
  adminNotes?: string;
  status: 'incomplete' | 'complete' | 'validated' | 'disputed';
  user: User | string;
  agency: Agency | string;
}

interface TimesheetCreateData {
  userId: string;
  agencyId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
  adminNotes?: string;
  status?: 'incomplete' | 'complete' | 'validated' | 'disputed';
}

interface TimesheetUpdateData {
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
  adminNotes?: string;
  status?: 'incomplete' | 'complete' | 'validated' | 'disputed';
}

// ===== SCHÉMA DE VALIDATION ZOD =====
const timesheetFormSchema = z.object({
  userId: z.string().min(1, 'Sélectionnez un employé'),
  agencyId: z.string().min(1, 'Sélectionnez une agence'),
  date: z.string().min(1, 'Sélectionnez une date'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
  notes: z.string().optional(),
  adminNotes: z.string().optional(),
  status: z.enum(['incomplete', 'complete', 'validated', 'disputed']).optional(),
}).refine((data) => {
  // Validation: heure fin après heure début
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
  // Validation: pause cohérente
  if (data.breakStart && data.breakEnd) {
    const breakStartTime = new Date(`2000-01-01T${data.breakStart}`);
    const breakEndTime = new Date(`2000-01-01T${data.breakEnd}`);
    return breakEndTime > breakStartTime;
  }
  return true;
}, {
  message: "L'heure de fin de pause doit être après l'heure de début",
  path: ["breakEnd"],
}).refine((data) => {
  // Validation: pause dans les heures de travail
  if (data.startTime && data.endTime && data.breakStart && data.breakEnd) {
    const start = new Date(`2000-01-01T${data.startTime}`);
    const end = new Date(`2000-01-01T${data.endTime}`);
    const breakStart = new Date(`2000-01-01T${data.breakStart}`);
    const breakEnd = new Date(`2000-01-01T${data.breakEnd}`);
    
    return breakStart >= start && breakEnd <= end;
  }
  return true;
}, {
  message: "La pause doit être comprise dans les heures de travail",
  path: ["breakStart"],
});

type TimesheetFormData = z.infer<typeof timesheetFormSchema>;

// ===== PROPS DU COMPOSANT =====
interface TimesheetFormProps {
  timesheet?: Timesheet;
  isLoading?: boolean;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

// ===== MOCK DATA POUR LES TESTS =====
const mockUsers: User[] = [
  { id: '1', firstName: 'Jean', lastName: 'Dupont', email: 'jean.dupont@example.com' },
  { id: '2', firstName: 'Marie', lastName: 'Martin', email: 'marie.martin@example.com' },
  { id: '3', firstName: 'Pierre', lastName: 'Durand', email: 'pierre.durand@example.com' },
];

const mockAgencies: Agency[] = [
  { id: '1', name: 'Agence Paris Centre', code: 'PAR01' },
  { id: '2', name: 'Agence Lyon Part-Dieu', code: 'LYO01' },
  { id: '3', name: 'Agence Marseille Vieux-Port', code: 'MAR01' },
];

// ===== COMPOSANT PRINCIPAL =====
export function TimesheetForm({
  timesheet,
  isLoading = false,
  onSubmit,
  onCancel,
}: TimesheetFormProps) {
  const isEdit = !!timesheet;
  const [calculatedDuration, setCalculatedDuration] = useState<string>('');

  // Utilisation des données mock pour l'instant
  const users = mockUsers;
  const agencies = mockAgencies;

  // ===== FORMULAIRE =====
  const form = useForm<TimesheetFormData>({
    resolver: zodResolver(timesheetFormSchema),
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

  // ===== WATCHERS POUR CALCULS =====
  const watchedFields = form.watch(['startTime', 'endTime', 'breakStart', 'breakEnd']);

  // ===== EFFECTS =====
  
  // Populate form when editing
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
      return time ? `${baseDate}T${time}:00.000Z` : undefined;
    };

    const submitData = {
      userId: data.userId,
      agencyId: data.agencyId,
      date: data.date,
      startTime: formatDateTime(data.startTime),
      endTime: formatDateTime(data.endTime),
      breakStart: formatDateTime(data.breakStart),
      breakEnd: formatDateTime(data.breakEnd),
      notes: data.notes || '',
      adminNotes: data.adminNotes || '',
      status: data.status,
    };

    onSubmit(submitData);
  };

  const handleQuickFill = (preset: string) => {
    switch (preset) {
      case 'morning':
        form.setValue('startTime', '08:00');
        form.setValue('endTime', '12:00');
        form.setValue('breakStart', '');
        form.setValue('breakEnd', '');
        break;
      case 'afternoon':
        form.setValue('startTime', '14:00');
        form.setValue('endTime', '18:00');
        form.setValue('breakStart', '');
        form.setValue('breakEnd', '');
        break;
      case 'fullday':
        form.setValue('startTime', '08:00');
        form.setValue('endTime', '17:00');
        form.setValue('breakStart', '12:00');
        form.setValue('breakEnd', '13:00');
        break;
    }
  };

  // ===== RENDU =====
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* En-tête du formulaire */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {isEdit ? 'Modifier le pointage' : 'Nouveau pointage'}
            </CardTitle>
            {isEdit && timesheet && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  ID: {timesheet.id.slice(-8)}
                </Badge>
                <Badge variant={
                  timesheet.status === 'validated' ? 'default' :
                  timesheet.status === 'complete' ? 'secondary' :
                  timesheet.status === 'disputed' ? 'destructive' :
                  'outline'
                }>
                  {timesheet.status === 'validated' ? 'Validé' :
                   timesheet.status === 'complete' ? 'Complet' :
                   timesheet.status === 'disputed' ? 'En litige' :
                   'Incomplet'}
                </Badge>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Informations de base */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations de base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employé */}
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employé *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un employé" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {user.email}
                                </div>
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

              {/* Agence */}
              <FormField
                control={form.control}
                name="agencyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agence *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une agence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {agencies.map((agency) => (
                          <SelectItem key={agency.id} value={agency.id}>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{agency.name}</div>
                                {agency.code && (
                                  <div className="text-xs text-gray-500">
                                    {agency.code}
                                  </div>
                                )}
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
                  <FormLabel>Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Horaires de travail */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horaires de travail
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button 
                type="button" 
                size="sm" 
                variant="outline"
                onClick={() => handleQuickFill('morning')}
              >
                Matin (8h-12h)
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="outline"
                onClick={() => handleQuickFill('afternoon')}
              >
                Après-midi (14h-18h)
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="outline"
                onClick={() => handleQuickFill('fullday')}
              >
                Journée complète (8h-17h)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Heures de début/fin */}
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

            {/* Pause */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Durée calculée */}
            {calculatedDuration && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Durée de travail calculée:</strong> {calculatedDuration}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Notes et statut */}
        <Card>
          <CardHeader>
            <CardTitle>Compléments d'information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Notes employé */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes de l'employé</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notes, commentaires, observations..."
                      rows={3}
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
                  <FormLabel>Notes administratives</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notes internes, validations, modifications..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
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
                          <Clock className="h-4 w-4" />
                          Incomplet
                        </div>
                      </SelectItem>
                      <SelectItem value="complete">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Complet
                        </div>
                      </SelectItem>
                      <SelectItem value="validated">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Validé
                        </div>
                      </SelectItem>
                      <SelectItem value="disputed">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          En litige
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

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {isEdit ? 'Modification...' : 'Création...'}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {isEdit ? 'Modifier le pointage' : 'Créer le pointage'}
              </>
            )}
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Annuler
          </Button>
        </div>
      </form>
    </Form>
  );
}