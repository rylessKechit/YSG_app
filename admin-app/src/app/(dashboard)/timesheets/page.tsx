// admin-app/src/app/(dashboard)/timesheets/page.tsx - VERSION COMPLÈTEMENT CORRIGÉE
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Users, Plus, BarChart3, AlertTriangle, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/common/loading-spinner';

// ✅ Import des hooks et types existants
import { useTimesheets } from '@/hooks/use-timesheets';
import { TimesheetFilters, Timesheet } from '@/types/timesheet';

export default function TimesheetsPage() {
  const router = useRouter();
  
  // ✅ State pour les filtres (comme dans users/page.tsx)
  const [filters, setFilters] = useState<TimesheetFilters>({
    page: 1,
    limit: 20,
    search: '',
    status: 'all',
    sort: 'date',
    order: 'desc'
  });

  // ✅ Hook de données (comme dans vos autres pages)
  const { data, isLoading, error } = useTimesheets(filters);

  const handleCreateTimesheet = () => {
    router.push('/timesheets/new');
  };

  const handleEditTimesheet = (timesheet: Timesheet) => {
    router.push(`/timesheets/${timesheet.id}/edit`);
  };

  const handleViewComparison = () => {
    router.push('/timesheets/compare');
  };

  const handleViewDetailedTimesheet = (timesheet: Timesheet) => {
    router.push(`/timesheets/${timesheet.id}`);
  };

  // ✅ Handlers pour les filtres (pattern identique à users)
  const handleFiltersChange = (newFilters: Partial<TimesheetFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleSearch = (search: string) => {
    handleFiltersChange({ search });
  };

  const handleStatusChange = (status: string) => {
    handleFiltersChange({ status: status as TimesheetFilters['status'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Gestion des Pointages
          </h1>
          <p className="text-gray-600 mt-1">
            Vérification, comparaison et édition des pointages employés
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleViewComparison}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Vue comparative
          </Button>
          
          <Button 
            onClick={handleCreateTimesheet} 
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nouveau pointage
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pointages</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.stats?.totalTimesheets || '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Chargement...' : 'Ce mois'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data?.stats?.completeTimesheets || '-'}
            </div>
            <p className="text-xs text-muted-foreground">Validés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incomplets</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {data?.stats?.incompleteTimesheets || '-'}
            </div>
            <p className="text-xs text-muted-foreground">Nécessitent attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En litige</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data?.stats?.disputedTimesheets || '-'}
            </div>
            <p className="text-xs text-muted-foreground">À résoudre</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 transform -translate-y-1/2" />
                <Input
                  placeholder="Rechercher par nom d'utilisateur..."
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
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="incomplete">Incomplets</SelectItem>
                <SelectItem value="complete">Complets</SelectItem>
                <SelectItem value="validated">Validés</SelectItem>
                <SelectItem value="disputed">En litige</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtres avancés
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contenu principal */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="ml-2">Chargement des pointages...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              Erreur lors du chargement des pointages
            </div>
          ) : !data?.timesheets?.length ? (
            <div className="text-center py-8 text-gray-500">
              Aucun pointage trouvé
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {data.timesheets.length} pointage(s) trouvé(s)
              </p>
              
              {/* ✅ CORRECTION : Liste avec vérifications null */}
              <div className="space-y-2">
                {data.timesheets.slice(0, 10).map((timesheet) => {
                  // ✅ CORRECTION : Vérifier si timesheet.user existe et n'est pas null
                  const userName = timesheet.user && typeof timesheet.user === 'object' 
                    ? `${timesheet.user.firstName || ''} ${timesheet.user.lastName || ''}`.trim()
                    : typeof timesheet.user === 'string' 
                      ? timesheet.user 
                      : 'Utilisateur supprimé';

                  // ✅ CORRECTION : Vérifier si timesheet.agency existe et n'est pas null
                  const agencyName = timesheet.agency && typeof timesheet.agency === 'object'
                    ? timesheet.agency.name || 'Agence sans nom'
                    : typeof timesheet.agency === 'string'
                      ? timesheet.agency
                      : 'Agence supprimée';

                  return (
                    <div 
                      key={timesheet.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleViewDetailedTimesheet(timesheet)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {userName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {agencyName}
                            </p>
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(timesheet.date).toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right text-sm">
                          <p className="text-gray-900">
                            {timesheet.startTime 
                              ? new Date(timesheet.startTime).toLocaleTimeString('fr-FR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })
                              : 'Non pointé'
                            }
                            {' - '}
                            {timesheet.endTime 
                              ? new Date(timesheet.endTime).toLocaleTimeString('fr-FR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })
                              : 'En cours'
                            }
                          </p>
                          <p className="text-gray-500">
                            {timesheet.totalWorkedMinutes 
                              ? `${Math.floor(timesheet.totalWorkedMinutes / 60)}h${(timesheet.totalWorkedMinutes % 60).toString().padStart(2, '0')}`
                              : 'Durée inconnue'
                            }
                          </p>
                        </div>
                        
                        <Badge 
                          variant={
                            timesheet.status === 'validated' ? 'default' :
                            timesheet.status === 'complete' ? 'secondary' :
                            timesheet.status === 'disputed' ? 'destructive' :
                            'outline'
                          }
                        >
                          {timesheet.status === 'incomplete' && 'Incomplet'}
                          {timesheet.status === 'complete' && 'Complet'}
                          {timesheet.status === 'validated' && 'Validé'}
                          {timesheet.status === 'disputed' && 'En litige'}
                        </Badge>
                        
                        {/* Indicateur de retard */}
                        {timesheet.delays?.startDelay && timesheet.delays.startDelay > 0 && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-xs text-orange-600">
                              +{timesheet.delays.startDelay}min
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination simple */}
              {data.timesheets.length > 10 && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" size="sm">
                    Voir plus de pointages
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}