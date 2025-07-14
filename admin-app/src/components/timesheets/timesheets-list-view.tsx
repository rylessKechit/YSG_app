// admin-app/src/components/timesheets/timesheets-list-view-fixed.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Calendar
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

import { useTimesheets, useDeleteTimesheet, useValidateTimesheet } from '@/hooks/use-timesheets';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

// ===== TYPES COMPATIBLES AVEC LE BACKEND =====
interface BackendTimesheet {
  _id: string;
  id?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
  totalWorkedMinutes?: number;
  notes?: string;
  adminNotes?: string;
  status: 'incomplete' | 'complete' | 'validated' | 'disputed';
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | string;
  agency: {
    _id: string;
    name: string;
    code?: string;
  } | string;
  delays?: {
    startDelay?: number;
    endDelay?: number;
  };
}

interface BackendTimesheetListResponse {
  timesheets: BackendTimesheet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  filters?: any;
  stats?: {
    totalTimesheets: number;
    completeTimesheets: number;
    incompleteTimesheets: number;
    disputedTimesheets: number;
  };
}

interface TimesheetFilters {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  agencyId?: string;
  status?: 'all' | 'incomplete' | 'complete' | 'validated' | 'disputed';
  sort?: string;
  order?: 'asc' | 'desc';
}

interface TimesheetsListViewProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  onDateRangeChange: (startDate: string, endDate: string) => void;
}

export function TimesheetsListView({ dateRange, onDateRangeChange }: TimesheetsListViewProps) {
  const router = useRouter();
  
  // ===== ÉTAT LOCAL =====
  const [filters, setFilters] = useState<TimesheetFilters>({
    page: 1,
    limit: 20,
    search: '',
    status: 'all',
    sort: 'date',
    order: 'desc',
    ...dateRange
  });
  
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // ===== HOOKS DE DONNÉES =====
  const { data: response, isLoading, error } = useTimesheets(filters);
  const deleteTimesheet = useDeleteTimesheet();
  const validateTimesheet = useValidateTimesheet();

  // ===== EXTRACTION DES DONNÉES DU BACKEND =====
  const backendData = response as BackendTimesheetListResponse | undefined;
  const timesheets = backendData?.timesheets || [];
  const pagination = backendData?.pagination;
  const stats = backendData?.stats;

  // ===== HANDLERS =====
  const handleFiltersChange = (newFilters: Partial<TimesheetFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleSearch = (search: string) => {
    handleFiltersChange({ search });
  };

  const handleStatusChange = (status: string) => {
    handleFiltersChange({ status: status as TimesheetFilters['status'] });
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newDateRange = {
      ...dateRange,
      [field]: value
    };
    onDateRangeChange(newDateRange.startDate, newDateRange.endDate);
    handleFiltersChange(newDateRange);
  };

  const handleViewTimesheet = (timesheet: BackendTimesheet) => {
    const id = timesheet.id || timesheet._id;
    router.push(`/timesheets/${id}`);
  };

  const handleEditTimesheet = (timesheet: BackendTimesheet) => {
    const id = timesheet.id || timesheet._id;
    router.push(`/timesheets/${id}/edit`);
  };

  const handleDeleteTimesheet = async (timesheet: BackendTimesheet) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce pointage ?')) {
      try {
        const id = timesheet.id || timesheet._id;
        await deleteTimesheet.mutateAsync(id);
      } catch (error) {
        console.error('Erreur suppression:', error);
      }
    }
  };

  const handleValidateTimesheet = async (timesheet: BackendTimesheet) => {
    try {
      const id = timesheet.id || timesheet._id;
      await validateTimesheet.mutateAsync({ 
        id, 
        adminNotes: 'Validé depuis la liste' 
      });
    } catch (error) {
      console.error('Erreur validation:', error);
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedRows.length === 0) {
      toast.warning('Sélectionnez au moins un pointage');
      return;
    }
    
    toast.info(`Action "${action}" sur ${selectedRows.length} pointage(s)`);
  };

  const handlePageChange = (page: number) => {
    handleFiltersChange({ page });
  };

  // ===== FONCTIONS UTILITAIRES =====
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      incomplete: { label: 'Incomplet', variant: 'secondary' as const },
      complete: { label: 'Complet', variant: 'default' as const },
      validated: { label: 'Validé', variant: 'default' as const },
      disputed: { label: 'En litige', variant: 'destructive' as const },
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.incomplete;
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return <span className="text-gray-400">Non renseigné</span>;
    try {
      return format(parseISO(timeString), 'HH:mm');
    } catch {
      return <span className="text-gray-400">Format invalide</span>;
    }
  };

  const getUserName = (user: BackendTimesheet['user']) => {
    if (typeof user === 'object' && user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'Employé inconnu';
  };

  const getUserEmail = (user: BackendTimesheet['user']) => {
    if (typeof user === 'object' && user) {
      return user.email;
    }
    return '';
  };

  const getAgencyName = (agency: BackendTimesheet['agency']) => {
    if (typeof agency === 'object' && agency) {
      return agency.name;
    }
    return 'Agence inconnue';
  };

  const getAgencyCode = (agency: BackendTimesheet['agency']) => {
    if (typeof agency === 'object' && agency) {
      return agency.code;
    }
    return '';
  };

  // ===== RENDU =====
  return (
    <div className="space-y-6">
      {/* Filtres et contrôles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres et recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ligne 1: Recherche et statut */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par nom, email..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filters.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="incomplete">Incomplet</SelectItem>
                <SelectItem value="complete">Complet</SelectItem>
                <SelectItem value="validated">Validé</SelectItem>
                <SelectItem value="disputed">En litige</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ligne 2: Dates */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Date début</label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Date fin</label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
              />
            </div>
          </div>

          {/* Actions en masse */}
          {selectedRows.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">
                {selectedRows.length} pointage(s) sélectionné(s)
              </span>
              <Button size="sm" onClick={() => handleBulkAction('validate')}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Valider
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('dispute')}>
                <XCircle className="h-4 w-4 mr-1" />
                Marquer en litige
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tableau des données */}
      <Card>
        <CardHeader>
          <CardTitle>
            Liste des pointages ({pagination?.total || timesheets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center text-red-600 h-32 flex items-center justify-center">
              Erreur lors du chargement des pointages
            </div>
          ) : timesheets.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun pointage trouvé pour cette période</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tableau responsive */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Employé</th>
                      <th className="text-left p-3">Agence</th>
                      <th className="text-left p-3">Horaires</th>
                      <th className="text-left p-3">Statut</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timesheets.map((timesheet) => (
                      <tr key={timesheet._id || timesheet.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium">
                            {format(parseISO(timesheet.date), 'dd/MM/yyyy', { locale: fr })}
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{getUserName(timesheet.user)}</div>
                            <div className="text-sm text-gray-500">{getUserEmail(timesheet.user)}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{getAgencyName(timesheet.agency)}</div>
                            {getAgencyCode(timesheet.agency) && (
                              <div className="text-sm text-gray-500">{getAgencyCode(timesheet.agency)}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm space-y-1">
                            <div>Début: {formatTime(timesheet.startTime)}</div>
                            <div>Fin: {formatTime(timesheet.endTime)}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={getStatusBadge(timesheet.status).variant}>
                            {getStatusBadge(timesheet.status).label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleViewTimesheet(timesheet)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditTimesheet(timesheet)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              {timesheet.status === 'complete' && (
                                <DropdownMenuItem onClick={() => handleValidateTimesheet(timesheet)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Valider
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleDeleteTimesheet(timesheet)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.total > pagination.limit && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600">
                    Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
                    {pagination.total} pointages
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      Précédent
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} sur {pagination.pages || pagination.totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= (pagination.pages || pagination.totalPages || 1)}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}