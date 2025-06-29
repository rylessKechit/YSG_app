// src/components/schedules/schedule-calendar.tsx - VERSION SANS SIMULATION
'use client';

import { useState, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Users,
  Building,
  Clock,
  AlertCircle
} from 'lucide-react';

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

import { useScheduleCalendar } from '@/hooks/api/useSchedules';
import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';
import { CalendarDay, CalendarData } from '@/types/schedule';

export function ScheduleCalendar() {
  // État local pour la navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAgency, setSelectedAgency] = useState<string>('all'); // ✅ Valeur non-vide
  const [selectedUser, setSelectedUser] = useState<string>('all'); // ✅ Valeur non-vide

  // Calcul des paramètres pour l'API
  const calendarParams = useMemo(() => ({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    view: 'month' as const,
    // ✅ Convertir "all" en undefined pour l'API
    ...(selectedAgency !== 'all' && { agency: selectedAgency }),
    ...(selectedUser !== 'all' && { user: selectedUser })
  }), [currentDate, selectedAgency, selectedUser]);

  // ✅ HOOKS API - UNIQUEMENT des vraies données avec types corrects
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

  // ✅ DONNÉES RÉELLES SEULEMENT - pas de simulation avec types sécurisés
  const calendarDays = useMemo(() => {
    if (!calendarData?.calendar) return [];

    // Transformer les données API en format calendrier
    const days: CalendarDay[] = [];
    
    calendarData.calendar.forEach((week: any) => {
      if (week.days && Array.isArray(week.days)) {
        week.days.forEach((day: any) => {
          days.push({
            date: new Date(day.date),
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

  const handleDayClick = useCallback((day: CalendarDay) => {
    if (day.schedules.length > 0) {
      // Ouvrir un modal avec les détails des plannings du jour
      console.log('Plannings du jour:', day.schedules);
    } else {
      // Créer un nouveau planning pour ce jour
      const dateStr = day.date.toISOString().split('T')[0];
      window.location.href = `/schedules/new?date=${dateStr}`;
    }
  }, []);

  const handleScheduleClick = useCallback((e: React.MouseEvent, schedule: any) => {
    e.stopPropagation();
    window.location.href = `/schedules/${schedule.id}/edit`;
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">Erreur lors du chargement du calendrier</p>
            <p className="text-sm text-gray-500 mb-4">
              {error?.message || 'Impossible de récupérer les données depuis l\'API'}
            </p>
            <Button onClick={() => refetch()}>Réessayer</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const users = usersData?.data?.users || [];
  const agencies = agenciesData?.data?.agencies || [];

  return (
    <div className="space-y-6">
      {/* En-tête du calendrier */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
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
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd'hui
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Filtres */}
          <Select value={selectedAgency} onValueChange={setSelectedAgency}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par agence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les agences</SelectItem>
              {agencies.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par préparateur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les préparateurs</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau planning
          </Button>
        </div>
      </div>

      {/* Calendrier */}
      <Card>
        <CardContent className="p-0">
          {/* En-têtes des jours */}
          <div className="grid grid-cols-7 border-b">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
              <div key={day} className="p-4 text-center font-medium text-gray-600 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Grille des jours */}
          {weeks.length > 0 ? (
            <div className="grid grid-cols-7">
              {weeks.map((week, weekIndex) => (
                week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`
                      min-h-[120px] p-2 border-r border-b last:border-r-0 cursor-pointer hover:bg-gray-50
                      ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                      ${day.isToday ? 'bg-blue-50 border-blue-200' : ''}
                    `}
                    onClick={() => handleDayClick(day)}
                  >
                    {/* Numéro du jour */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`
                        text-sm font-medium
                        ${day.isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}
                      `}>
                        {day.date.getDate()}
                      </span>
                      {day.stats.totalSchedules > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {day.stats.totalSchedules}
                        </Badge>
                      )}
                    </div>

                    {/* Plannings du jour */}
                    <div className="space-y-1">
                      {day.schedules.slice(0, 3).map((schedule) => (
                        <div
                          key={schedule.id}
                          className="text-xs p-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                          onClick={(e) => handleScheduleClick(e, schedule)}
                        >
                          <div className="font-medium truncate">
                            {schedule.user.name}
                          </div>
                          <div className="flex items-center gap-1 text-blue-600">
                            <Clock className="h-3 w-3" />
                            {schedule.startTime}-{schedule.endTime}
                          </div>
                          <div className="flex items-center gap-1 text-blue-600">
                            <Building className="h-3 w-3" />
                            {schedule.agency.code}
                          </div>
                        </div>
                      ))}

                      {/* Indicateur s'il y a plus de plannings */}
                      {day.schedules.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{day.schedules.length - 3} autres
                        </div>
                      )}
                    </div>

                    {/* Stats du jour (si pas de plannings) */}
                    {day.schedules.length === 0 && day.isCurrentMonth && (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <Plus className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>Aucune donnée de calendrier disponible</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Légende et informations */}
      {calendarData?.metadata && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total plannings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calendarData.metadata.totalSchedules}</div>
              <p className="text-xs text-muted-foreground">ce mois</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Heures totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(calendarData.metadata.totalWorkingHours)}h</div>
              <p className="text-xs text-muted-foreground">planifiées</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Préparateurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calendarData.metadata.uniqueUsers}</div>
              <p className="text-xs text-muted-foreground">actifs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Agences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calendarData.metadata.uniqueAgencies}</div>
              <p className="text-xs text-muted-foreground">impliquées</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}