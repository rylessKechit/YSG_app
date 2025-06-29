// src/components/schedules/schedule-table.tsx
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Calendar,
  Clock,
  Building,
  User,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Search,
  Download,
  Filter
} from 'lucide-react';

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/common/loading-spinner';

import { useSchedules, useDeleteSchedule } from '@/hooks/api/useSchedules';
import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';
import { ScheduleFilters } from '@/types/schedule';

// Hook personnalisé pour le debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function ScheduleTable() {
  // États locaux
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<ScheduleFilters>({
    page: 1,
    limit: 20,
    search: '',
    status: 'all',
    sort: 'date',
    order: 'desc'
  });

  // Débouncer la recherche
  const debouncedSearchInput = useDebounce(searchInput, 500);

  // Mettre à jour les filtres
  useEffect(() => {
    setFilters(prev => ({ 
      ...prev, 
      search: debouncedSearchInput, 
      page: 1
    }));
  }, [debouncedSearchInput]);

  // Hooks API
  const { data: schedulesData, isLoading, error, refetch } = useSchedules(filters);
  const { data: usersData } = useUsers({ limit: 100 }); // Pour les filtres
  const { data: agenciesData } = useAgencies({ limit: 100 }); // Pour les filtres
  const deleteSchedule = useDeleteSchedule();

  // Extraction des données
  const { schedules, pagination, stats } = useMemo(() => {
    if (!schedulesData?.data) {
      return { 
        schedules: [], 
        pagination: null, 
        stats: null 
      };
    }
    
    const responseData = schedulesData.data;
    
    return {
      schedules: responseData.schedules || [],
      pagination: responseData.pagination || null,
      stats: responseData.stats || null
    };
  }, [schedulesData]);

  // Handlers
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  const handleFilterChange = useCallback((key: keyof ScheduleFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const handleSort = useCallback((column: string) => {
    setFilters(prev => ({
      ...prev,
      sort: column,
      order: prev.sort === column && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleEditSchedule = useCallback((scheduleId: string) => {
    // Navigation vers la page d'édition
    window.location.href = `/schedules/${scheduleId}/edit`;
  }, []);

  const handleDeleteSchedule = useCallback(async (scheduleId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce planning ?')) {
      try {
        await deleteSchedule.mutateAsync(scheduleId);
        refetch();
      } catch (error) {
        // Erreur gérée par le hook
      }
    }
  }, [deleteSchedule, refetch]);

  const handleDuplicateSchedule = useCallback((schedule: any) => {
    // Navigation vers création avec données pré-remplies
    const params = new URLSearchParams({
      duplicate: 'true',
      userId: schedule.user.id,
      agencyId: schedule.agency.id,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      ...(schedule.breakStart && { breakStart: schedule.breakStart }),
      ...(schedule.breakEnd && { breakEnd: schedule.breakEnd }),
    });
    window.location.href = `/schedules/new?${params}`;
  }, []);

  // Fonctions utilitaires
  const getUserInitials = useCallback((user: any) => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    const variants = {
      active: 'default',
      cancelled: 'destructive',
      completed: 'secondary'
    } as const;

    const labels = {
      active: 'Actif',
      cancelled: 'Annulé', 
      completed: 'Terminé'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  const formatWorkingHours = useCallback((startTime: string, endTime: string, breakStart?: string, breakEnd?: string) => {
    // Calcul simple des heures de travail
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    let duration = (end.getTime() - start.getTime()) / (1000 * 60); // en minutes

    if (breakStart && breakEnd) {
      const breakStartTime = new Date(`2000-01-01T${breakStart}`);
      const breakEndTime = new Date(`2000-01-01T${breakEnd}`);
      const breakDuration = (breakEndTime.getTime() - breakStartTime.getTime()) / (1000 * 60);
      duration -= breakDuration;
    }

    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h${minutes > 0 ? minutes.toString().padStart(2, '0') : ''}`;
  }, []);

  // Pagination
  const paginationData = useMemo(() => {
    if (!pagination) return null;
    
    const totalPages = pagination.pages || 1;
    const currentPage = pagination.page || 1;
    
    return {
      totalPages,
      currentPage,
      total: pagination.total,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    };
  }, [pagination]);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erreur lors du chargement</p>
            <Button onClick={() => refetch()}>Réessayer</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const users = usersData?.data?.users || [];
  const agencies = agenciesData?.data?.agencies || [];

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Rechercher par utilisateur, agence ou notes..."
            value={searchInput}
            onChange={handleSearchInputChange}
            className="pl-10"
          />
        </div>
        
        <Select 
          value={filters.status} 
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="cancelled">Annulés</SelectItem>
            <SelectItem value="completed">Terminés</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.user || 'all'} 
          onValueChange={(value) => handleFilterChange('user', value === 'all' ? undefined : value)}
        >
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

        <Select 
          value={filters.agency || 'all'} 
          onValueChange={(value) => handleFilterChange('agency', value === 'all' ? undefined : value)}
        >
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

        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exporter
        </Button>
      </div>

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('user')}
                >
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Préparateur
                    {filters.sort === 'user' && (
                      <span className="ml-1">
                        {filters.order === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('agency')}
                >
                  <div className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    Agence
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Date
                    {filters.sort === 'date' && (
                      <span className="ml-1">
                        {filters.order === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Horaires
                  </div>
                </TableHead>
                <TableHead>Pause</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule: any) => (
                <TableRow key={schedule.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getUserInitials(schedule.user)}
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
                      {formatDate(schedule.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{schedule.startTime} - {schedule.endTime}</div>
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
                      {formatWorkingHours(schedule.startTime, schedule.endTime, schedule.breakStart, schedule.breakEnd)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(schedule.status)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditSchedule(schedule.id)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateSchedule(schedule)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Dupliquer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {paginationData && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-gray-500">
                Page {paginationData.currentPage} sur {paginationData.totalPages} 
                ({paginationData.total} planning(s) au total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!paginationData.hasPrev}
                  onClick={() => handleFilterChange('page', paginationData.currentPage - 1)}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!paginationData.hasNext}
                  onClick={() => handleFilterChange('page', paginationData.currentPage + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* État vide */}
      {schedules.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                {filters.search ? 
                  'Aucun planning trouvé pour cette recherche' : 
                  'Aucun planning trouvé'
                }
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Utilisez le bouton "Nouveau planning" pour créer le premier planning
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}