// admin-app/src/components/schedules/schedule-table.tsx - VERSION CORRIGÉE AVEC API CALENDAR
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Grid3X3, 
  CalendarDays, 
  List, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Search,
  Building,
  Clock,
  Edit,
  Trash2,
  Copy,
  MoreHorizontal,
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ✅ CORRECTION MAJEURE : Utiliser les deux APIs selon le contexte
import { 
  useSchedules, 
  useScheduleCalendar, 
  useDeleteSchedule 
} from '@/hooks/api/useSchedules';
import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';

// ✅ Import des utilitaires de date
import { createDateKey, isSameDay, getWeekRange } from '@/lib/utils/date-utils';

// Types
interface ScheduleFilters {
  page: number;
  limit: number;
  search?: string;
  status?: 'all' | 'active' | 'cancelled' | 'completed';
  user?: string;
  agency?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

interface Schedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
  status: string;
  timeRange?: string;
  workingHours?: number;
  hasBreak?: boolean;
  breakTime?: string;
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

interface PaginationData {
  current: number;
  pages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

type ViewMode = 'week' | 'day' | 'table';

export function ScheduleTable() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchInput, setSearchInput] = useState('');
  
  // États pour les filtres
  const [filters, setFilters] = useState<ScheduleFilters>({
    page: 1,
    limit: 20,
    search: '',
    status: 'all',
    sort: 'date',
    order: 'desc'
  });

  // ✅ CORRECTION MAJEURE : Calculer les paramètres pour l'API calendar
  const calendarParams = useMemo(() => {
    const today = new Date(currentDate);
    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1, // API attend 1-12
      view: 'month' as const,
      ...(filters.user && { user: filters.user }),
      ...(filters.agency && { agency: filters.agency })
    };
  }, [currentDate, filters.user, filters.agency]);

  // ✅ CORRECTION MAJEURE : Utiliser les bons hooks selon le mode de vue
  const calendarHook = useScheduleCalendar(calendarParams);
  const schedulesPaginatedHook = useSchedules({
    ...filters,
    limit: 50 // Augmenter la limite pour la vue table
  });
  
  const { data: usersData } = useUsers({ limit: 100 });
  const { data: agenciesData } = useAgencies({ limit: 100 });
  const deleteMutation = useDeleteSchedule();

  // ✅ CORRECTION MAJEURE : Choisir la source de données selon le mode de vue
  const { data, isLoading, error, refetch } = viewMode === 'table' 
    ? schedulesPaginatedHook 
    : calendarHook;

  // ✅ CORRECTION MAJEURE : Extraction des plannings selon la source
  const schedules: Schedule[] = useMemo(() => {
    if (viewMode === 'table') {
      // Pour la vue table, utiliser l'API paginée et adapter le format du user
      const rawSchedules = schedulesPaginatedHook.data?.data?.schedules || [];
      return rawSchedules.map((schedule: any) => ({
        ...schedule,
        user: {
          id: schedule.user.id,
          name: schedule.user.name
            ? schedule.user.name
            : [schedule.user.firstName, schedule.user.lastName].filter(Boolean).join(' '),
          email: schedule.user.email,
        },
        agency: {
          id: schedule.agency.id,
          name: schedule.agency.name,
          code: schedule.agency.code,
        },
      }));
    } else {
      // Pour les vues semaine/jour, utiliser l'API calendar
      const calendarData = calendarHook.data;
      if (!calendarData?.calendar) return [];

      // Extraire tous les plannings de toutes les semaines
      const allSchedules: Schedule[] = [];
      calendarData.calendar.forEach((week: any) => {
        if (week.days && Array.isArray(week.days)) {
          week.days.forEach((day: any) => {
            if (day.schedules && Array.isArray(day.schedules)) {
              day.schedules.forEach((schedule: any) => {
                allSchedules.push({
                  id: schedule.id,
                  date: day.date, // Utiliser la date du jour
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                  breakStart: schedule.breakStart,
                  breakEnd: schedule.breakEnd,
                  notes: schedule.notes,
                  status: 'active', // Status par défaut
                  timeRange: `${schedule.startTime} - ${schedule.endTime}`,
                  user: {
                    id: schedule.user.id,
                    name: schedule.user.name,
                    email: schedule.user.email
                  },
                  agency: {
                    id: schedule.agency.id,
                    name: schedule.agency.name,
                    code: schedule.agency.code
                  }
                });
              });
            }
          });
        }
      });
      return allSchedules;
    }
  }, [viewMode, schedulesPaginatedHook.data, calendarHook.data]);

  // Pagination seulement pour la vue table
  const pagination: PaginationData | undefined = viewMode === 'table'
    ? (() => {
        const pag = schedulesPaginatedHook.data?.data?.pagination;
        if (!pag) return undefined;
        return {
          current: pag.page,
          pages: pag.pages,
          total: pag.total,
          hasNext: pag.page < pag.pages,
          hasPrev: pag.page > 1,
        };
      })()
    : undefined;

  const users: User[] = usersData?.data?.users || [];
  const agencies: Agency[] = agenciesData?.agencies || [];

  // Navigation par date
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
    }
    
    setCurrentDate(newDate);
  };

  // Gestionnaires d'événements
  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleEditSchedule = (id: string) => {
    console.log('🔄 Navigation vers édition:', id);
    try {
      router.push(`/schedules/${id}/edit`);
    } catch (error) {
      console.error('❌ Erreur navigation édition:', error);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce planning ?')) {
      try {
        await deleteMutation.mutateAsync(id);
        // Refetch selon le mode de vue
        if (viewMode === 'table') {
          schedulesPaginatedHook.refetch();
        } else {
          calendarHook.refetch();
        }
      } catch (error) {
        console.error('Erreur suppression:', error);
      }
    }
  };

  const handleDuplicateSchedule = (schedule: Schedule) => {
    const params = new URLSearchParams({
      userId: schedule.user.id,
      agencyId: schedule.agency.id,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      ...(schedule.breakStart && { breakStart: schedule.breakStart }),
      ...(schedule.breakEnd && { breakEnd: schedule.breakEnd }),
      duplicate: 'true'
    });
    router.push(`/schedules/new?${params}`);
  };

  const handleStatusChange = (value: 'all' | 'active' | 'cancelled' | 'completed') => {
    setFilters(prev => ({ 
      ...prev, 
      status: value
    }));
  };

  // Formatage du titre selon la vue
  const getViewTitle = (): string => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('fr-FR', options);
        
      case 'week':
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return `${startOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        
      case 'table':
      default:
        return 'Tous les plannings';
    }
  };

  // ✅ Vue journalière corrigée
  const renderDayView = () => {
    const daySchedules = schedules.filter(schedule => {
      return isSameDay(schedule.date, currentDate);
    });

    if (daySchedules.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <CalendarDays className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun planning ce jour
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Il n'y a aucun planning prévu pour le {currentDate.toLocaleDateString('fr-FR')}
            </p>
            <Button onClick={() => router.push('/schedules/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un planning
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4">
        {daySchedules.map((schedule) => (
          <Card key={schedule.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {schedule.user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{schedule.user.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {schedule.agency.code}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {schedule.timeRange || `${schedule.startTime} - ${schedule.endTime}`}
                      </div>
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {schedule.agency.name}
                      </div>
                    </div>
                    
                    {schedule.notes && (
                      <p className="text-sm text-gray-500 mt-2">{schedule.notes}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={schedule.status === 'active' ? 'default' : 'secondary'}
                    className={schedule.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {schedule.status === 'active' ? 'Actif' : 'Inactif'}
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={() => handleEditSchedule(schedule.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => handleDuplicateSchedule(schedule)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Dupliquer
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // ✅ Vue hebdomadaire corrigée
  const renderWeekView = () => {
    const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    return (
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((dayName, index) => {
          const dayDate = new Date(startOfWeek);
          dayDate.setDate(startOfWeek.getDate() + index);
          
          const daySchedules = schedules.filter(schedule => {
            return isSameDay(schedule.date, dayDate);
          });

          const isToday = isSameDay(dayDate, new Date());

          return (
            <Card key={dayName} className={`min-h-[200px] ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  <div className="flex flex-col items-center">
                    <span className="text-gray-500">{dayName}</span>
                    <span className={`text-lg ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                      {dayDate.getDate()}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-2">
                {daySchedules.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-4">
                    Aucun planning
                  </div>
                ) : (
                  daySchedules.map((schedule) => (
                    <div 
                      key={schedule.id}
                      className="p-2 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
                      onClick={() => handleEditSchedule(schedule.id)}
                    >
                      <div className="text-xs font-medium text-blue-900 mb-1">
                        {schedule.user.name}
                      </div>
                      <div className="text-xs text-blue-700">
                        {schedule.timeRange || `${schedule.startTime} - ${schedule.endTime}`}
                      </div>
                      <div className="text-xs text-blue-600">
                        {schedule.agency.code}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Vue tableau (reste avec l'API paginée)
  const renderTableView = () => {
    if (schedules.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun planning trouvé
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Aucun planning ne correspond à vos critères de recherche
            </p>
            <Button onClick={() => router.push('/schedules/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un planning
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHead>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Préparateur</TableHead>
                <TableHead>Agence</TableHead>
                <TableHead>Horaires</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {new Date(schedule.date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(schedule.date).toLocaleDateString('fr-FR', {
                          weekday: 'long'
                        })}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {schedule.user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{schedule.user.name}</div>
                        <div className="text-sm text-gray-500">{schedule.user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium">{schedule.agency.name}</div>
                      <div className="text-sm text-gray-500">{schedule.agency.code}</div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {schedule.timeRange || `${schedule.startTime} - ${schedule.endTime}`}
                      </div>
                      {schedule.hasBreak && (
                        <div className="text-sm text-gray-500">
                          Pause: {schedule.breakTime}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant={schedule.status === 'active' ? 'default' : 'secondary'}
                      className={schedule.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {schedule.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => handleEditSchedule(schedule.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => handleDuplicateSchedule(schedule)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Dupliquer
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header avec navigation et contrôles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">{getViewTitle()}</h2>
          
          {/* Navigation par date pour day/week */}
          {(viewMode === 'day' || viewMode === 'week') && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Aujourd'hui
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Sélecteur de vue */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
          <TabsList>
            <TabsTrigger value="week" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Semaine
            </TabsTrigger>
            <TabsTrigger value="day" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Jour
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Tableau
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Rechercher un préparateur, une agence..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="max-w-sm"
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Select value={filters.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="cancelled">Annulés</SelectItem>
                <SelectItem value="completed">Terminés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contenu principal */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'table' && renderTableView()}
        </>
      )}

      {/* Pagination pour la vue tableau */}
      {viewMode === 'table' && pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={filters.page === 1}
          >
            Précédent
          </Button>
          
          <span className="text-sm text-gray-600">
            Page {filters.page} sur {pagination.pages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
            disabled={filters.page === pagination.pages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}