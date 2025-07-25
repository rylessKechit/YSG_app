// 🔧 FIX COMPLET - admin-app/src/components/timesheets/timesheets-list-view.tsx
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
  Calendar,
  AlertTriangle,
  Clock
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

// ✅ IMPORTATION DU TYPE CORRECT DEPUIS LE FICHIER GLOBAL
import { TimesheetFilters as GlobalTimesheetFilters } from '@/types/timesheet';

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

// ✅ SUPPRESSION DE L'INTERFACE LOCALE - UTILISATION DU TYPE GLOBAL
// interface TimesheetFilters { ... } ❌ SUPPRIMÉ

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
  // ✅ UTILISATION DU TYPE GLOBAL CORRECT
  const [filters, setFilters] = useState<GlobalTimesheetFilters>({
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

  // ===== HANDLERS FIXES =====
  // ✅ FIX: Typage correct avec le type global
  const handleFiltersChange = (newFilters: Partial<GlobalTimesheetFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleSearch = (search: string) => {
    handleFiltersChange({ search });
  };

  // ✅ FIX: Cast correct vers le type du status global
  const handleStatusChange = (status: string) => {
    handleFiltersChange({ 
      status: status as GlobalTimesheetFilters['status'] 
    });
  };

  // ✅ FIX: Typage correct pour les champs de date
  const handleSortChange = (sort: string) => {
    handleFiltersChange({ 
      sort: sort as GlobalTimesheetFilters['sort']
    });
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher par nom, email, agence..."
                  value={filters.search || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select 
              value={filters.status || 'all'} 
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="incomplete">Incomplets</SelectItem>
                <SelectItem value="complete">Complets</SelectItem>
                <SelectItem value="validated">Validés</SelectItem>
                <SelectItem value="disputed">En litige</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ligne 2: Dates et tri */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="w-40"
              />
              <span className="flex items-center text-gray-500">à</span>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="w-40"
              />
            </div>
            
            <Select 
              value={filters.sort || 'date'} 
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="user">Employé</SelectItem>
                <SelectItem value="agency">Agence</SelectItem>
                <SelectItem value="startTime">Heure d'arrivée</SelectItem>
                <SelectItem value="delays.startDelay">Retard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques rapides */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <Clock className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalTimesheets}</p>
                  <p className="text-sm text-gray-500">Total pointages</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.completeTimesheets}</p>
                  <p className="text-sm text-gray-500">Complets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <XCircle className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.incompleteTimesheets}</p>
                  <p className="text-sm text-gray-500">Incomplets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.disputedTimesheets}</p>
                  <p className="text-sm text-gray-500">En litige</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions en masse */}
      {selectedRows.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedRows.length} pointage(s) sélectionné(s)
              </span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkAction('validate')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Valider
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkAction('export')}
                >
                  Exporter
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleBulkAction('delete')}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tableau des données */}
      <Card>
        <CardHeader>
          <CardTitle>
            Pointages 
            {pagination && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({pagination.total} résultats)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              Erreur lors du chargement des données
            </div>
          ) : timesheets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun pointage trouvé
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(timesheets.map(t => t._id));
                          } else {
                            setSelectedRows([]);
                          }
                        }}
                        checked={selectedRows.length === timesheets.length && timesheets.length > 0}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employé
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agence
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Horaires
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Temps
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {timesheets.map((timesheet) => {
                    const statusBadge = getStatusBadge(timesheet.status);
                    const isSelected = selectedRows.includes(timesheet._id);
                    
                    return (
                      <tr 
                        key={timesheet._id}
                        className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRows([...selectedRows, timesheet._id]);
                              } else {
                                setSelectedRows(selectedRows.filter(id => id !== timesheet._id));
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(parseISO(timesheet.date), 'dd MMM yyyy', { locale: fr })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {getUserName(timesheet.user)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getUserEmail(timesheet.user)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {getAgencyName(timesheet.agency)}
                          </div>
                          {getAgencyCode(timesheet.agency) && (
                            <div className="text-sm text-gray-500">
                              {getAgencyCode(timesheet.agency)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>Arrivée: {formatTime(timesheet.startTime)}</div>
                          <div>Départ: {formatTime(timesheet.endTime)}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {timesheet.totalWorkedMinutes ? (
                            <div>
                              {Math.floor(timesheet.totalWorkedMinutes / 60)}h{(timesheet.totalWorkedMinutes % 60).toString().padStart(2, '0')}
                              {timesheet.delays?.startDelay && timesheet.delays.startDelay > 0 && (
                                <div className="text-xs text-red-600">
                                  +{timesheet.delays.startDelay}min retard
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.total > pagination.limit && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
                {pagination.total} résultats
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Précédent
                </Button>
                
                <span className="text-sm">
                  Page {pagination.page} sur {pagination.totalPages || pagination.pages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}