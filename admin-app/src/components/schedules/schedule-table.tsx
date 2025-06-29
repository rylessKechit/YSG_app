'use client';

import { useState, useMemo, useEffect } from 'react';
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
  User as UserIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

import { useSchedules, useDeleteSchedule } from '@/hooks/api/useSchedules';
import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';
import { ScheduleFilters, Schedule } from '@/types/schedule';

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
    user: undefined,
    agency: undefined,
    sort: 'date',
    order: 'desc'
  });

  // Calcul des dates selon le mode de vue
  const dateRange = useMemo(() => {
    const today = new Date(currentDate);
    
    switch (viewMode) {
      case 'day':
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
        
      case 'week':
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
        
      case 'table':
      default:
        return {};
    }
  }, [currentDate, viewMode]);

  // Filtres enrichis avec les dates calculées
  const enrichedFilters = useMemo(() => ({
    ...filters,
    ...dateRange
  }), [filters, dateRange]);

  // Hooks API complets
  const { data: schedulesData, isLoading, error, refetch } = useSchedules(enrichedFilters);
  const { data: usersData } = useUsers({ limit: 100 });
  const { data: agenciesData } = useAgencies({ limit: 100 });
  const deleteMutation = useDeleteSchedule();

  // Données extraites avec sécurité
  const schedules = schedulesData?.data?.schedules || [];
  const pagination = schedulesData?.data?.pagination;
  const users = usersData?.data?.users || [];
  const agencies = agenciesData?.data?.agencies || [];

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
    router.push(`/schedules/${id}/edit`);
  };

  const handleDeleteSchedule = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce planning ?')) {
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
      duplicate: 'true'
    });
    router.push(`/schedules/new?${params}`);
  };

  // Formatage du titre selon la vue
  const getViewTitle = () => {
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

  // Vue hebdomadaire avec données réelles
  const renderWeekView = () => {
    const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((dayName, index) => {
          const dayDate = new Date(startOfWeek);
          dayDate.setDate(startOfWeek.getDate() + index);
          const daySchedules = schedules.filter(
            s => new Date(s.date).toDateString() === dayDate.toDateString()
          );

          return (
            <Card key={index} className="min-h-[200px]">
              <CardHeader className="pb-2">
                <div className="text-center">
                  <div className="font-medium">{dayName}</div>
                  <div className="text-sm text-gray-500">
                    {dayDate.getDate()}/{dayDate.getMonth() + 1}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {daySchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="p-2 bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100"
                    onClick={() => router.push(`/schedules/${schedule.id}`)}
                  >
                    <div className="text-xs font-medium truncate">
                      {schedule.user.firstName} {schedule.user.lastName}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {schedule.agency.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {schedule.startTime} - {schedule.endTime}
                    </div>
                  </div>
                ))}
                {daySchedules.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-4">
                    Aucun planning
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Vue journalière avec données réelles
  const renderDayView = () => {
    const daySchedules = schedules.filter(
      s => new Date(s.date).toDateString() === currentDate.toDateString()
    );

    return (
      <div className="space-y-4">
        {daySchedules.length > 0 ? (
          <div className="grid gap-4">
            {daySchedules.map((schedule) => (
              <Card key={schedule.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {schedule.user.firstName[0]}{schedule.user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {schedule.user.firstName} {schedule.user.lastName}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <Building className="h-3 w-3" />
                          {schedule.agency.name}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {schedule.startTime} - {schedule.endTime}
                        </div>
                        {schedule.breakStart && schedule.breakEnd && (
                          <div className="text-sm text-gray-500">
                            Pause: {schedule.breakStart} - {schedule.breakEnd}
                          </div>
                        )}
                      </div>
                      
                      <Badge variant={schedule.status === 'active' ? 'default' : 'secondary'}>
                        {getStatusLabel(schedule.status)}
                      </Badge>
                      
                      <ScheduleActionsMenu 
                        schedule={schedule}
                        onEdit={handleEditSchedule}
                        onDelete={handleDeleteSchedule}
                        onDuplicate={handleDuplicateSchedule}
                      />
                    </div>
                  </div>
                  
                  {schedule.notes && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                      {schedule.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">Aucun planning</h3>
              <p className="text-gray-500 mb-4">
                Aucun planning prévu pour cette journée
              </p>
              <Button onClick={() => router.push('/schedules/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un planning
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Vue tableau avec données réelles
  const renderTableView = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Préparateur</TableHead>
            <TableHead>Agence</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Horaires</TableHead>
            <TableHead>Pause</TableHead>
            <TableHead>Durée</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-12">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => (
            <TableRow key={schedule.id} className="hover:bg-gray-50">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {schedule.user.firstName[0]}{schedule.user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {schedule.user.firstName} {schedule.user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {schedule.user.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{schedule.agency.name}</div>
                  {schedule.agency.code && (
                    <div className="text-sm text-gray-500">
                      {schedule.agency.code}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {new Date(schedule.date).toLocaleDateString('fr-FR')}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {schedule.startTime} - {schedule.endTime}
                </div>
              </TableCell>
              <TableCell>
                {schedule.breakStart && schedule.breakEnd ? (
                  <div className="text-sm">
                    {schedule.breakStart} - {schedule.breakEnd}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {calculateDuration(schedule.startTime, schedule.endTime, schedule.breakStart, schedule.breakEnd)}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={schedule.status === 'active' ? 'default' : 'secondary'}>
                  {getStatusLabel(schedule.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <ScheduleActionsMenu 
                  schedule={schedule}
                  onEdit={handleEditSchedule}
                  onDelete={handleDeleteSchedule}
                  onDuplicate={handleDuplicateSchedule}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'week':
        return renderWeekView();
      case 'day':
        return renderDayView();
      case 'table':
        return renderTableView();
      default:
        return renderWeekView();
    }
  };

  // Affichage des états de chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner className="h-8 w-8 mr-2" />
        <span>Chargement des plannings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec sélecteur de vue */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">{getViewTitle()}</h2>
          
          {(viewMode === 'week' || viewMode === 'day') && (
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

        <div className="flex items-center gap-2">
          {/* Sélecteur de vue */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <TabsList>
              <TabsTrigger value="week" className="flex items-center gap-1">
                <Grid3X3 className="h-4 w-4" />
                Semaine
              </TabsTrigger>
              <TabsTrigger value="day" className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                Jour
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-1">
                <List className="h-4 w-4" />
                Liste
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button onClick={() => router.push('/schedules/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau planning
          </Button>
        </div>
      </div>

      {/* Filtres pour vue tableau */}
      {viewMode === 'table' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex gap-2">
                  <Input
                    placeholder="Rechercher un préparateur, agence..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="max-w-sm"
                  />
                  <Button onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <Select
                value={filters.user || 'all'}
                onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, user: value === 'all' ? undefined : value, page: 1 }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tous les préparateurs" />
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

              <Select
                value={filters.agency || 'all'}
                onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, agency: value === 'all' ? undefined : value, page: 1 }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Toutes les agences" />
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

              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, status: value === 'all' ? 'all' : value as any, page: 1 }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contenu selon la vue */}
      {renderContent()}

      {/* Pagination pour vue tableau */}
      {viewMode === 'table' && pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {pagination.page} sur {pagination.pages} ({pagination.total} résultats)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page! - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page! + 1 }))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant pour le menu d'actions
function ScheduleActionsMenu({ 
  schedule, 
  onEdit, 
  onDelete, 
  onDuplicate 
}: {
  schedule: Schedule;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (schedule: Schedule) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(schedule.id)}>
          <Edit className="w-4 h-4 mr-2" />
          Modifier
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDuplicate(schedule)}>
          <Copy className="w-4 h-4 mr-2" />
          Dupliquer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onDelete(schedule.id)}
          className="text-red-600"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Fonctions utilitaires
function calculateDuration(startTime: string, endTime: string, breakStart?: string, breakEnd?: string): string {
  if (!startTime || !endTime) return '0h00';
  
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  let duration = (end.getTime() - start.getTime()) / (1000 * 60);
  
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
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Actif';
    case 'cancelled': return 'Annulé';
    case 'completed': return 'Terminé';
    default: return status;
  }
}