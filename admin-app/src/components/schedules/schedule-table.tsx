// admin-app/src/components/schedules/schedule-table.tsx - VERSION FINALE SANS ERREURS
'use client&apos;;

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
} from &apos;lucide-react&apos;;

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
} from &apos;@/components/ui/select&apos;;
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from &apos;@/components/ui/table&apos;;
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from &apos;@/components/ui/dropdown-menu&apos;;

import { useSchedules, useDeleteSchedule } from '@/hooks/api/useSchedules';
import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';

// ✅ CORRECTION: Types complets avec toutes les propriétés nécessaires
interface ScheduleFilters {
  page: number;
  limit: number;
  search?: string;
  status?: &apos;all&apos; | &apos;active&apos; | &apos;cancelled&apos; | &apos;completed&apos;;
  user?: string;
  agency?: string;
  sort?: string;
  order?: &apos;asc&apos; | &apos;desc&apos;;
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
  timeRange: string;
  workingHours: number;
  hasBreak: boolean;
  breakTime?: string;
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

// ✅ CORRECTION: Interfaces pour les retours d'API avec union types
interface ApiScheduleData {
  data?: {
    schedules?: Schedule[];
    pagination?: PaginationData;
  };
}

interface ApiUserData {
  data?: {
    users?: User[];
  };
}

interface ApiAgencyData {
  data?: {
    agencies?: Agency[];
  };
}

// ✅ CORRECTION: Interface pour le hook useSchedules
interface UseSchedulesReturn {
  data: ApiScheduleData | undefined;
  isLoading: boolean;
  error: any;
  refetch: () => void;
}

interface UseUsersReturn {
  data: ApiUserData | undefined;
  isLoading?: boolean;
}

interface UseAgenciesReturn {
  data: ApiAgencyData | undefined;
  isLoading?: boolean;
}

interface UseDeleteScheduleReturn {
  mutateAsync: (id: string) => Promise<any>;
  isPending?: boolean;
}

type ViewMode = &apos;week&apos; | &apos;day&apos; | &apos;table&apos;;

export function ScheduleTable() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchInput, setSearchInput] = useState('');
  
  // États pour les filtres
  const [filters, setFilters] = useState<ScheduleFilters>({
    page: 1,
    limit: 20,
    search: &apos;&apos;,
    status: &apos;all&apos;,
    sort: &apos;date&apos;,
    order: &apos;desc&apos;
  });

  // Calcul des dates selon le mode de vue
  const dateRange = useMemo(() => {
    const today = new Date(currentDate);
    
    switch (viewMode) {
      case &apos;day&apos;:
        const dayString = today.toISOString().split('T')[0];
        return {
          startDate: dayString,
          endDate: dayString
        };
        
      case &apos;week&apos;:
        const startOfWeek = new Date(today);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return {
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: endOfWeek.toISOString().split('T')[0]
        };
        
      case &apos;table&apos;:
      default:
        return {};
    }
  }, [currentDate, viewMode]);

  // Filtres enrichis avec les dates calculées
  const enrichedFilters = useMemo(() => ({
    ...filters,
    ...dateRange
  }), [filters, dateRange]);

  // ✅ CORRECTION: Hooks API avec typage approprié et assertions
  const schedulesHook = useSchedules(enrichedFilters) as UseSchedulesReturn;
  const usersHook = useUsers({ limit: 100 }) as UseUsersReturn;
  const agenciesHook = useAgencies({ limit: 100 }) as UseAgenciesReturn;
  const deleteMutation = useDeleteSchedule() as UseDeleteScheduleReturn;

  // Extraction des données
  const { data: schedulesData, isLoading, error, refetch } = schedulesHook;
  const { data: usersData } = usersHook;
  const { data: agenciesData } = agenciesHook;

  // ✅ CORRECTION: Extraction sécurisée des données
  const schedules: Schedule[] = schedulesData?.data?.schedules || [];
  const pagination: PaginationData | undefined = schedulesData?.data?.pagination;
  const users: User[] = usersData?.data?.users || [];
  const agencies: Agency[] = agenciesData?.data?.agencies || [];

  // Navigation par date
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case &apos;day&apos;:
        newDate.setDate(newDate.getDate() + (direction === &apos;next&apos; ? 1 : -1));
        break;
      case &apos;week&apos;:
        newDate.setDate(newDate.getDate() + (direction === &apos;next&apos; ? 7 : -7));
        break;
    }
    
    setCurrentDate(newDate);
  };

  // Gestionnaires d'événements
  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleEditSchedule = (id: string) => {
    console.log('🔄 Navigation vers édition:&apos;, id);
    try {
      router.push(`/schedules/${id}/edit`);
    } catch (error) {
      console.error('❌ Erreur navigation édition:&apos;, error);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce planning ?&apos;)) {
      try {
        await deleteMutation.mutateAsync(id);
        refetch();
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
      duplicate: &apos;true&apos;
    });
    router.push(`/schedules/new?${params}`);
  };

  // ✅ CORRECTION: Gestion du changement de statut avec types appropriés
  const handleStatusChange = (value: 'all' | 'active' | 'cancelled' | 'completed') => {
    setFilters(prev => ({ 
      ...prev, 
      status: value
    }));
  };

  // Formatage du titre selon la vue
  const getViewTitle = (): string => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: &apos;long&apos;, 
      year: &apos;numeric&apos;, 
      month: &apos;long&apos;, 
      day: &apos;numeric&apos; 
    };
    
    switch (viewMode) {
      case &apos;day&apos;:
        return currentDate.toLocaleDateString('fr-FR', options);
        
      case &apos;week&apos;:
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return `${startOfWeek.toLocaleDateString('fr-FR', { day: &apos;numeric&apos;, month: &apos;short&apos; })} - ${endOfWeek.toLocaleDateString('fr-FR', { day: &apos;numeric&apos;, month: &apos;short&apos;, year: &apos;numeric&apos; })}`;
        
      case &apos;table&apos;:
      default:
        return &apos;Tous les plannings&apos;;
    }
  };

  // Vue journalière
  const renderDayView = () => {
    const daySchedules = schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.date).toISOString().split('T')[0];
      const targetDate = currentDate.toISOString().split('T')[0];
      return scheduleDate === targetDate;
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
              Il n&apos;y a aucun planning prévu pour le {currentDate.toLocaleDateString('fr-FR')}
            </p>
            <Button onClick={() => router.push(&apos;/schedules/new&apos;)}>
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
                      {schedule.user.name.split(' &apos;).map(n => n[0]).join(&apos;&apos;)}
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
                        <span>{schedule.timeRange}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        <span>{schedule.agency.name}</span>
                      </div>
                      
                      {schedule.hasBreak && schedule.breakTime && (
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            Pause: {schedule.breakTime}
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {schedule.notes && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                        {schedule.notes}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={schedule.status === &apos;active&apos; ? &apos;default&apos; : 'secondary'}
                    className={schedule.status === &apos;active&apos; ? &apos;bg-green-100 text-green-800&apos; : ''}
                  >
                    {schedule.status === &apos;active&apos; ? &apos;Actif&apos; : 'Inactif'}
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

  // Vue hebdomadaire
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
          const dayString = dayDate.toISOString().split('T')[0];
          
          const daySchedules = schedules.filter(schedule => {
            const scheduleDate = new Date(schedule.date).toISOString().split('T')[0];
            return scheduleDate === dayString;
          });

          const isToday = dayString === new Date().toISOString().split('T')[0];

          return (
            <Card key={dayName} className={`min-h-[200px] ${isToday ? &apos;ring-2 ring-blue-500&apos; : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  <div className="flex flex-col items-center">
                    <span className="text-gray-500">{dayName}</span>
                    <span className={`text-lg ${isToday ? &apos;text-blue-600 font-bold&apos; : ''}`}>
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
                        {schedule.timeRange}
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

  // Vue tableau
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
            <Button onClick={() => router.push(&apos;/schedules/new&apos;)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un planning
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Agence</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Horaires</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((schedule) => (
              <TableRow key={schedule.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        {schedule.user.name.split(' &apos;).map(n => n[0]).join(&apos;&apos;)}
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
                  {new Date(schedule.date).toLocaleDateString('fr-FR')}
                </TableCell>
                
                <TableCell>
                  <div>
                    <div>{schedule.timeRange}</div>
                    {schedule.hasBreak && schedule.breakTime && (
                      <div className="text-sm text-gray-500">
                        Pause: {schedule.breakTime}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  {Math.round(schedule.workingHours * 10) / 10}h
                </TableCell>
                
                <TableCell>
                  <Badge 
                    variant={schedule.status === &apos;active&apos; ? &apos;default&apos; : 'secondary'}
                    className={schedule.status === &apos;active&apos; ? &apos;bg-green-100 text-green-800&apos; : ''}
                  >
                    {schedule.status === &apos;active&apos; ? &apos;Actif&apos; : 'Inactif'}
                  </Badge>
                </TableCell>
                
                <TableCell className="text-right">
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
      </Card>
    );
  };

  // Gestion d'erreur
  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Erreur de chargement
          </h3>
          <p className="text-gray-500 text-center mb-4">
            Une erreur est survenue lors du chargement des plannings
          </p>
          <Button onClick={() => refetch()}>
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec navigation et vues */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Plannings</h1>
          
          {/* Navigation par date */}
          {(viewMode === &apos;day&apos; || viewMode === &apos;week&apos;) && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDate(&apos;prev&apos;)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="px-4 py-2 text-sm font-medium bg-gray-100 rounded">
                {getViewTitle()}
              </div>
              
              <Button variant="outline" size="sm" onClick={() => navigateDate(&apos;next&apos;)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCurrentDate(new Date())}
                className="text-blue-600"
              >
                Aujourd&apos;hui
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sélecteur de vue */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <TabsList>
              <TabsTrigger value="week">
                <Grid3X3 className="h-4 w-4 mr-2" />
                Semaine
              </TabsTrigger>
              <TabsTrigger value="day">
                <CalendarDays className="h-4 w-4 mr-2" />
                Jour
              </TabsTrigger>
              <TabsTrigger value="table">
                <List className="h-4 w-4 mr-2" />
                Liste
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={() => router.push(&apos;/schedules/new&apos;)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau planning
          </Button>
        </div>
      </div>

      {/* Filtres pour la vue tableau */}
      {viewMode === &apos;table&apos; && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex gap-2">
                  <Input
                    placeholder="Rechercher un utilisateur, agence..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === &apos;Enter&apos; && handleSearch()}
                  />
                  <Button onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Select 
                value={filters.status || 'all'} 
                onValueChange={handleStatusChange}
              >
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
      )}

      {/* Contenu principal */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === &apos;day&apos; && renderDayView()}
          {viewMode === &apos;week&apos; && renderWeekView()}
          {viewMode === &apos;table&apos; && renderTableView()}
        </>
      )}

      {/* Pagination pour la vue tableau */}
      {viewMode === &apos;table&apos; && pagination && pagination.pages > 1 && (
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