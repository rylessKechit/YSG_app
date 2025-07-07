// admin-app/src/components/schedules/schedule-calendar.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Users,
  Building,
  Clock,
  AlertCircle,
  Calendar as CalendarIcon,
  Filter,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useScheduleCalendar } from '@/hooks/api/useSchedules';
import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';

// Types
interface CalendarDay {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  schedules: CalendarSchedule[];
  stats: {
    totalSchedules: number;
    totalHours: number;
    agencies: number;
  };
}

interface CalendarSchedule {
  id: string;
  user: {
    id: string;
    name: string;
    email?: string;
  };
  agency: {
    id: string;
    name: string;
    code: string;
  };
  startTime: string;
  endTime: string;
  notes?: string;
}

export function ScheduleCalendar() {
  // État local pour la navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAgency, setSelectedAgency] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  // Calcul des paramètres pour l'API
  const calendarParams = useMemo(() => ({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    view: 'month' as const,
    // Convertir "all" en undefined pour l'API
    ...(selectedAgency !== 'all' && { agency: selectedAgency }),
    ...(selectedUser !== 'all' && { user: selectedUser })
  }), [currentDate, selectedAgency, selectedUser]);

  // Hooks API
  const { data: calendarData, isLoading, error, refetch } = useScheduleCalendar(calendarParams);
  const { data: usersData } = useUsers({ limit: 100 });
  const { data: agenciesData } = useAgencies({ limit: 100 });

  // Navigation mois
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // ✅ DONNÉES RÉELLES AVEC FIX TIMEZONE
  const calendarDays = useMemo(() => {
    if (!calendarData?.calendar) return [];

    const days: CalendarDay[] = [];
    
    calendarData.calendar.forEach((week: any) => {
      if (week.days && Array.isArray(week.days)) {
        week.days.forEach((day: any) => {
          // ✅ FIX: Créer la date en local timezone, pas UTC
          const dayDate = new Date(day.date);
          const localDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
          
          days.push({
            date: localDate,
            dateKey: day.dateKey,
            isCurrentMonth: day.isCurrentMonth,
            isToday: day.isToday,
            schedules: day.schedules || [],
            stats: day.stats || { totalSchedules: 0, totalHours: 0, agencies: 0 }
          });
        });
      }
    });

    return days;
  }, [calendarData]);

  // Organiser les jours en semaines
  const weeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    return weeks;
  }, [calendarDays]);

  // Utilitaires
  const getUserInitials = useCallback((name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }, []);

  const formatMonth = useCallback((date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric'
    });
  }, []);

  // ✅ Helper pour comparer les dates en local
  const isSameDay = useCallback((date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }, []);

  const handleDayClick = useCallback((day: CalendarDay) => {
    if (day.schedules.length > 0) {
      setSelectedDay(day);
      setShowDayModal(true);
    }
  }, []);

  const handleCreateSchedule = useCallback((date?: Date) => {
    const dateParam = date ? date.toISOString().split('T')[0] : '';
    window.location.href = `/schedules/new?date=${dateParam}`;
  }, []);

  // Reset filtres
  const resetFilters = useCallback(() => {
    setSelectedAgency('all');
    setSelectedUser('all');
  }, []);

  // Rendering d'un jour du calendrier
  const renderCalendarDay = useCallback((day: CalendarDay) => {
    const dayNumber = day.date.getDate();
    const isToday = isSameDay(day.date, new Date());
    
    return (
      <div
        key={day.dateKey}
        className={cn(
          "min-h-[120px] border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors",
          !day.isCurrentMonth && "bg-gray-50 text-gray-400",
          isToday && "bg-blue-50 border-blue-200",
          day.schedules.length > 0 && "bg-green-50"
        )}
        onClick={() => handleDayClick(day)}
      >
        {/* En-tête du jour */}
        <div className="flex items-center justify-between mb-2">
          <span className={cn(
            "text-sm font-medium",
            isToday && "text-blue-600 font-bold",
            !day.isCurrentMonth && "text-gray-400"
          )}>
            {dayNumber}
          </span>
          
          {day.schedules.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {day.schedules.length}
            </Badge>
          )}
        </div>

        {/* Plannings du jour */}
        <div className="space-y-1">
          {day.schedules.slice(0, 2).map((schedule) => (
            <div
              key={schedule.id}
              className="text-xs p-1 rounded bg-white border border-gray-200 truncate"
            >
              <div className="font-medium text-gray-900 truncate">
                {schedule.user.name}
              </div>
              <div className="text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {schedule.startTime}-{schedule.endTime}
              </div>
              <div className="text-gray-500 flex items-center gap-1">
                <Building className="h-3 w-3" />
                {schedule.agency.code}
              </div>
            </div>
          ))}
          
          {day.schedules.length > 2 && (
            <div className="text-xs text-gray-500 text-center py-1">
              +{day.schedules.length - 2} autre(s)
            </div>
          )}
        </div>

        {/* Bouton d'ajout pour les jours vides */}
        {day.schedules.length === 0 && day.isCurrentMonth && (
          <div className="flex items-center justify-center h-8 mt-2">
            <Plus 
              className="h-4 w-4 text-gray-400 hover:text-gray-600" 
              onClick={(e) => {
                e.stopPropagation();
                handleCreateSchedule(day.date);
              }}
            />
          </div>
        )}
      </div>
    );
  }, [handleDayClick, isSameDay, handleCreateSchedule]);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement du calendrier. 
              <Button variant="link" onClick={() => refetch()} className="ml-2 p-0 h-auto">
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec navigation et filtres */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendrier des Plannings
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => handleCreateSchedule()}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau planning
              </Button>
            </div>
          </div>

          {/* Navigation mois */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h2 className="text-xl font-semibold capitalize">
                {formatMonth(currentDate)}
              </h2>
              
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={goToToday}>
                Aujourd&apos;hui
              </Button>
            </div>

            {/* Filtres */}
            <div className="flex items-center gap-2">
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Toutes les agences" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les agences</SelectItem>
                  {agenciesData?.agencies?.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tous les préparateurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les préparateurs</SelectItem>
                  {usersData?.data?.users?.filter(user => user.role === 'preparateur').map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(selectedAgency !== 'all' || selectedUser !== 'all') && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <Filter className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Statistiques du mois */}
          {calendarData?.metadata && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {(calendarData.metadata as any)?.summary?.totalSchedules || 0}
                </div>
                <div className="text-sm text-gray-600">Plannings total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(calendarData.metadata as any)?.summary?.totalUsers || 0}
                </div>
                <div className="text-sm text-gray-600">Préparateurs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(calendarData.metadata as any)?.summary?.totalAgencies || 0}
                </div>
                <div className="text-sm text-gray-600">Agences</div>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Calendrier */}
      <Card>
        <CardContent className="p-0">
          {/* En-têtes des jours de la semaine */}
          <div className="grid grid-cols-7 border-b">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
              <div key={day} className="p-4 text-center font-medium text-gray-600 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Grille du calendrier */}
          <div className="grid grid-cols-7">
            {weeks.map((week, weekIndex) => 
              week.map((day) => renderCalendarDay(day))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal détails du jour */}
      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Plannings du {selectedDay?.date.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </DialogTitle>
            <DialogDescription>
              {selectedDay?.schedules.length} planning(s) prévu(s) ce jour
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedDay?.schedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {getUserInitials(schedule.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h3 className="font-semibold">{schedule.user.name}</h3>
                        <p className="text-sm text-gray-600">{schedule.user.email}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        {schedule.startTime} - {schedule.endTime}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Building className="h-4 w-4" />
                        {schedule.agency.name} ({schedule.agency.code})
                      </div>
                    </div>
                  </div>

                  {schedule.notes && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                      <strong>Notes:</strong> {schedule.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button 
              onClick={() => {
                setShowDayModal(false);
                handleCreateSchedule(selectedDay?.date);
              }}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un planning
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}