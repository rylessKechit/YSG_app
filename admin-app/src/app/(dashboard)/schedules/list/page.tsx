// admin-app/src/app/(dashboard)/schedules/list/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus,
  Search,
  Filter,
  Calendar,
  Download,
  Eye,
  Edit,
  Trash2,
  Copy,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  SortDesc
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { LoadingSpinner } from '@/components/common/loading-spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { useSchedules, useDeleteSchedule, useExportSchedules } from '@/hooks/api/useSchedules';
import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';
import { ScheduleFilters } from '@/types/schedule';

export default function ScheduleListPage() {
  const router = useRouter();
  
  // États pour les filtres
  const [filters, setFilters] = useState<ScheduleFilters>({
    page: 1,
    limit: 20,
    search: '',
    status: 'all',
    user: undefined,
    agency: undefined,
    startDate: '',
    endDate: '',
    sort: 'date',
    order: 'desc'
  });
  
  const [searchInput, setSearchInput] = useState('');

  // Hooks API
  const { data: schedulesData, isLoading, error, refetch } = useSchedules(filters);
  const { data: usersData } = useUsers({ limit: 100 });
  const { data: agenciesData } = useAgencies({ limit: 100 });
  const deleteSchedule = useDeleteSchedule();
  const exportSchedules = useExportSchedules();

  // Extraction des données
  const { schedules, pagination } = useMemo(() => {
    if (!schedulesData?.data) {
      return { schedules: [], pagination: null };
    }
    
    return {
      schedules: schedulesData.data.schedules || [],
      pagination: schedulesData.data.pagination || null
    };
  }, [schedulesData]);

  // Handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handleSearchSubmit = () => {
    setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleFilterChange = (key: keyof ScheduleFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSort = (column: string) => {
    setFilters(prev => ({
      ...prev,
      sort: column,
      order: prev.sort === column && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleView = (scheduleId: string) => {
    router.push(`/schedules/${scheduleId}`);
  };

  const handleEdit = (scheduleId: string) => {
    router.push(`/schedules/${scheduleId}/edit`);
  };

  const handleDelete = async (scheduleId: string) => {
    try {
      await deleteSchedule.mutateAsync(scheduleId);
      refetch();
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  const handleDuplicate = (schedule: any) => {
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

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      await exportSchedules.mutateAsync({ ...filters, format });
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  // Fonctions utilitaires
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Actif</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      case 'completed':
        return <Badge variant="secondary">Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (startTime: string, endTime: string, breakStart?: string, breakEnd?: string): string => {
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    let duration = end - start;
    
    if (breakStart && breakEnd) {
      const breakDuration = timeToMinutes(breakEnd) - timeToMinutes(breakStart);
      duration -= breakDuration;
    }
    
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`;
  };

  const getSortIcon = (column: string) => {
    if (filters.sort !== column) return null;
    return filters.order === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />;
  };

  const users = usersData?.data?.users || [];
  const agencies = agenciesData?.data?.agencies || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Liste des plannings</h1>
          <p className="text-gray-600">
            Gérez tous les plannings des préparateurs
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Format d'export</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Fichier CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                Fichier Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                Fichier PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={() => router.push('/schedules/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau planning
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtres et recherche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Recherche */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher par nom, agence..."
                  value={searchInput}
                  onChange={handleSearchChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Statut */}
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="cancelled">Annulés</SelectItem>
                <SelectItem value="completed">Terminés</SelectItem>
              </SelectContent>
            </Select>

            {/* Préparateur */}
            <Select 
              value={filters.user || 'all'} 
              onValueChange={(value) => handleFilterChange('user', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Préparateur" />
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

            {/* Agence */}
            <Select 
              value={filters.agency || 'all'} 
              onValueChange={(value) => handleFilterChange('agency', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Agence" />
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

            {/* Date de début */}
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              placeholder="Date de début"
            />

            {/* Date de fin */}
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              placeholder="Date de fin"
            />
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button onClick={handleSearchSubmit} size="sm">
              Appliquer les filtres
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setFilters({
                  page: 1,
                  limit: 20,
                  search: '',
                  status: 'all',
                  user: undefined,
                  agency: undefined,
                  startDate: '',
                  endDate: '',
                  sort: 'date',
                  order: 'desc'
                });
                setSearchInput('');
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des plannings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plannings</CardTitle>
              <CardDescription>
                {pagination ? `${pagination.total} planning(s) trouvé(s)` : 'Chargement...'}`
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select 
                value={filters.limit?.toString()} 
                onValueChange={(value) => handleFilterChange('limit', parseInt(value))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-500">par page</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-red-600 mb-2">Erreur lors du chargement</p>
                <Button onClick={() => refetch()}>Réessayer</Button>
              </div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Aucun planning trouvé</p>
                <p className="text-sm text-gray-500">Essayez de modifier vos filtres</p>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-2">
                        Date {getSortIcon('date')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('user')}
                    >
                      <div className="flex items-center gap-2">
                        Préparateur {getSortIcon('user')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('agency')}
                    >
                      <div className="flex items-center gap-2">
                        Agence {getSortIcon('agency')}
                      </div>
                    </TableHead>
                    <TableHead>Horaires</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        Statut {getSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
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
                        <div>
                          <div className="font-medium">
                            {schedule.user.firstName} {schedule.user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {schedule.user.email}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <div className="font-medium">{schedule.agency.name}</div>
                          <div className="text-sm text-gray-500">
                            {schedule.agency.code} - {schedule.agency.client}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {schedule.startTime} - {schedule.endTime}
                          </div>
                          {schedule.breakStart && schedule.breakEnd && (
                            <div className="text-sm text-gray-500">
                              Pause: {schedule.breakStart} - {schedule.breakEnd}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium">
                          {formatDuration(schedule.startTime, schedule.endTime, schedule.breakStart, schedule.breakEnd)}
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
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem onClick={() => handleView(schedule.id)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir les détails
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem onClick={() => handleEdit(schedule.id)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem onClick={() => handleDuplicate(schedule)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Dupliquer
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer le planning</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer ce planning ? Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(schedule.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-500">
                    Page {pagination.page} sur {pagination.pages} 
                    ({pagination.total} résultat{pagination.total > 1 ? 's' : ''})
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </Button>
                    
                    {/* Pages */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        let pageNum;
                        if (pagination.pages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.pages - 2) {
                          pageNum = pagination.pages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === pagination.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Statistiques rapides */}
      {schedulesData?.data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{schedulesData.data.stats.totalSchedules}</div>
              <p className="text-sm text-gray-600">Total plannings</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{schedulesData.data.stats.activeSchedules}</div>
              <p className="text-sm text-gray-600">Plannings actifs</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{Math.round(schedulesData.data.stats.totalHours)}h</div>
              <p className="text-sm text-gray-600">Heures totales</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}