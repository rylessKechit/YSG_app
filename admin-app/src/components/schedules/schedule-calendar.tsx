// src/components/schedules/schedule-calendar.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  Users,
  Building,
  Plus,
  Filter
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LoadingSpinner } from '@/components/common/loading-spinner';

import { useScheduleCalendar } from '@/hooks/api/useSchedules';
import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  schedules: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    agency: {
      id: string;
      name: string;
      code: string;
    };
    startTime: string;
    endTime: string;
    workingHours: number;
    status: string;
  }>;
}

export function ScheduleCalendar() {
  // États locaux
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedAgency, setSelectedAgency] = useState<string>('all');
  const [view, setView] = useState<'month' | 'week'>('month');

  // Calcul des paramètres de la vue actuelle
  const calendarParams = useMemo(() => ({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    view,
    ...(selectedUser !== 'all' && { user: selectedUser }),
    ...(selectedAgency !== 'all' && { agency: selectedAgency })
  }), [currentDate, view, selectedUser, selectedAgency]);

  // Hooks API
  const { data: calendarData, isLoading, error } = useScheduleCalendar(calendarParams);
  const { data: usersData } = useUsers({ limit: 100 });
  const { data: agenciesData } = useAgencies({ limit: 100 });

  // Navigation du calendrier
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Construction des jours du calendrier
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Premier jour du mois
    const firstDay = new Date(year, month, 1);
    // Dernier jour du mois
    const lastDay = new Date(year, month + 1, 0);
    
    // Premier jour affiché (peut être du mois précédent)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay() + 1); // Commencer le lundi
    
    // Dernier jour affiché (peut être du mois suivant)
    const endDate = new Date(lastDay);
    const daysToAdd = 7 - lastDay.getDay();
    if (daysToAdd < 7) {
      endDate.setDate(endDate.getDate() + daysToAdd);
    }

    const days: CalendarDay[] = [];
    const currentDay = new Date(startDate);
    const today = new Date();
    
    // Créer les données simulées pour les jours en attendant l'API
    while (currentDay <= endDate) {
      const isCurrentMonth = currentDay.getMonth() === month;
      const isToday = currentDay.toDateString() === today.toDateString();
      const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6;
      
      // Simuler quelques plannings pour la démo
      const schedules = isCurrentMonth && Math.random() > 0.7 ? [
        {
          id: `schedule-${currentDay.getTime()}`,
          user: {
            id: 'user1',
            name: 'Jean Dupont',
            email: 'jean.dupont@sixt.fr'
          },
          agency: {
            id: 'agency1',
            name: 'Paris Gare du Nord',
            code: 'PGDN'
          },
          startTime: '08:00',
          endTime: '17:00',
          workingHours: 8,
          status: 'active'
        }
      ] : [];

      days.push({
        date: new Date(currentDay),
        isCurrentMonth,
        isToday,
        isWeekend,
        schedules
      });
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

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
            <p className="text-red-600 mb-2">Erreur lors du chargement du calendrier</p>
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
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

        <div className="flex items-center gap-2">
          {/* Filtre utilisateur */}
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous les utilisateurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              {users.map((user: any) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtre agence */}
          <Select value={selectedAgency} onValueChange={setSelectedAgency}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes les agences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les agences</SelectItem>
              {agencies.map((agency: any) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sélecteur de vue */}
          <Select value={view} onValueChange={(value: 'month' | 'week') => setView(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mois</SelectItem>
              <SelectItem value="week">Semaine</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Planning actif</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded"></div>
          <span>Planning annulé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Planning terminé</span>
        </div>
      </div>

      {/* Calendrier */}
      <Card>
        <CardContent className="p-4">
          {/* En-têtes des jours */}
          <div className="grid grid-cols-7 gap-px mb-4">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => (
              <div
                key={day}
                className={`p-2 text-center text-sm font-medium ${
                  index >= 5 ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grille du calendrier */}
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {weeks.map((week, weekIndex) =>
              week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`
                    min-h-[120px] bg-white p-2 cursor-pointer hover:bg-gray-50 transition-colors
                    ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                    ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                    ${day.isWeekend ? 'bg-red-50' : ''}
                  `}
                  onClick={() => handleDayClick(day)}
                >
                  {/* Numéro du jour */}
                  <div className={`
                    text-sm font-medium mb-1
                    ${day.isToday ? 'text-blue-600' : ''}
                    ${day.isWeekend ? 'text-red-600' : ''}
                  `}>
                    {day.date.getDate()}
                  </div>

                  {/* Plannings du jour */}
                  <div className="space-y-1">
                    {day.schedules.slice(0, 3).map((schedule, index) => (
                      <TooltipProvider key={schedule.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`
                                text-xs p-1 rounded cursor-pointer truncate
                                ${schedule.status === 'active' ? 'bg-blue-100 text-blue-800' : ''}
                                ${schedule.status === 'cancelled' ? 'bg-gray-100 text-gray-600' : ''}
                                ${schedule.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                                hover:opacity-80
                              `}
                              onClick={(e) => handleScheduleClick(e, schedule)}
                            >
                              <div className="flex items-center gap-1">
                                <Avatar className="h-3 w-3">
                                  <AvatarFallback className="text-[8px]">
                                    {getUserInitials(schedule.user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">
                                  {schedule.startTime} - {schedule.user.name.split(' ')[0]}
                                </span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div className="font-medium">{schedule.user.name}</div>
                              <div>{schedule.agency.name}</div>
                              <div>{schedule.startTime} - {schedule.endTime}</div>
                              <div>{schedule.workingHours}h de travail</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                    
                    {/* Indicateur s'il y a plus de plannings */}
                    {day.schedules.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{day.schedules.length - 3} autre(s)
                      </div>
                    )}
                    
                    {/* Bouton d'ajout pour les jours vides */}
                    {day.schedules.length === 0 && day.isCurrentMonth && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-6 text-xs text-gray-400 hover:text-gray-600"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Résumé du mois */}
      {calendarData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-blue-600" />
                <div className="ml-3">
                  <div className="text-lg font-bold">{calendarData.summary.totalSchedules}</div>
                  <p className="text-xs text-gray-600">Plannings ce mois</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-green-600" />
                <div className="ml-3">
                  <div className="text-lg font-bold">{Math.round(calendarData.summary.totalWorkingHours)}h</div>
                  <p className="text-xs text-gray-600">Heures totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center">
                <Users className="h-4 w-4 text-purple-600" />
                <div className="ml-3">
                  <div className="text-lg font-bold">{calendarData.summary.averagePerDay}h</div>
                  <p className="text-xs text-gray-600">Moyenne par jour</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center">
                <Building className="h-4 w-4 text-orange-600" />
                <div className="ml-3">
                  <div className="text-lg font-bold">{calendarData.summary.busiest?.count || 0}</div>
                  <p className="text-xs text-gray-600">Jour le plus chargé</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}