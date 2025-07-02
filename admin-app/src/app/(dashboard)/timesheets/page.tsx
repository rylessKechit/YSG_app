// admin-app/src/app/(dashboard)/timesheets/page.tsx - VERSION CORRIGÉE
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

      {/* Alert for pending reviews */}
      {data?.stats && (data.stats.incompleteTimesheets > 0 || data.stats.disputedTimesheets > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Pointages nécessitant votre attention
            </CardTitle>
            <CardDescription className="text-orange-700">
              Plusieurs pointages sont en attente de validation ou présentent des anomalies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {data.stats.incompleteTimesheets > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {data.stats.incompleteTimesheets} incomplets
                </Badge>
              )}
              {data.stats.disputedTimesheets > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {data.stats.disputedTimesheets} en litige
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ Filtres simplifiés (en attendant le composant TimesheetTable) */}
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

      {/* ✅ Table temporaire en attendant TimesheetTable */}
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
              
              {/* ✅ Liste simplifiée en attendant le composant table */}
              <div className="space-y-2">
                {data.timesheets.slice(0, 5).map((timesheet) => (
                  <div 
                    key={timesheet.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewDetailedTimesheet(timesheet)}
                  >
                    <div>
                      <p className="font-medium">
                        {typeof timesheet.user === 'object' 
                          ? `${timesheet.user.firstName} ${timesheet.user.lastName}`
                          : 'Utilisateur'
                        }
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(timesheet.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={timesheet.status === 'validated' ? 'default' : 'secondary'}
                        className={
                          timesheet.status === 'complete' ? 'bg-blue-100 text-blue-800' :
                          timesheet.status === 'validated' ? 'bg-green-100 text-green-800' :
                          timesheet.status === 'disputed' ? 'bg-red-100 text-red-800' :
                          'bg-orange-100 text-orange-800'
                        }
                      >
                        {timesheet.status === 'incomplete' ? 'Incomplet' :
                         timesheet.status === 'complete' ? 'Complet' :
                         timesheet.status === 'validated' ? 'Validé' :
                         'En litige'}
                      </Badge>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTimesheet(timesheet);
                        }}
                      >
                        Modifier
                      </Button>
                    </div>
                  </div>
                ))}
                
                {data.timesheets.length > 5 && (
                  <p className="text-center text-sm text-gray-500 pt-4">
                    ... et {data.timesheets.length - 5} autres pointages
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}