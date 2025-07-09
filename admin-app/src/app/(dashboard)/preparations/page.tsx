// admin-app/src/app/(dashboard)/preparations/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  Pause
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/common/loading-spinner';

import { usePreparations, usePreparationsStats, useExportPreparations } from '@/hooks/api/usePreparations';
import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';

import { PreparationFilters, PreparationStatus } from '@/types/preparation';
import type { User as AuthUser } from '@/types/auth';
import type { Agency as AgencyType } from '@/types/agency';

import { PreparationsTable } from '@/components/preparations/preparations-table';
import { PreparationFiltersComponent } from '@/components/preparations/preparation-filters';
import { PreparationStatsCards } from '@/components/preparations/preparation-stats';

export default function PreparationsPage() {
  const router = useRouter();

  // États pour les filtres
  const [filters, setFilters] = useState<PreparationFilters>({
    page: 1,
    limit: 20,
    search: '',
    status: 'all',
    user: undefined,
    agency: undefined,
    startDate: '',
    endDate: '',
    sort: 'createdAt',
    order: 'desc'
  });

  const [searchInput, setSearchInput] = useState('');

  // Hooks API
  const { 
    data: preparationsData, 
    isLoading: isLoadingPreparations, 
    error: preparationsError,
    refetch: refetchPreparations 
  } = usePreparations(filters);

  const { 
    data: statsData, 
    isLoading: isLoadingStats 
  } = usePreparationsStats({
    startDate: filters.startDate,
    endDate: filters.endDate,
    agency: filters.agency
  });

  const { data: usersData } = useUsers({ 
    role: 'preparateur',
    status: 'active',
    limit: 100 
  });

  const { data: agenciesData } = useAgencies({ 
    status: 'active',
    limit: 100 
  });

  const { mutate: exportPreparations, isPending: isExporting } = useExportPreparations();

  // Handlers
  const handleFiltersChange = (newFilters: Partial<PreparationFilters>) => {
    setFilters(prev => ({ 
      ...prev, 
      ...newFilters,
      page: newFilters.page || 1 // Reset à la page 1 si changement de filtre
    }));
  };

  const handleSearch = () => {
    handleFiltersChange({ search: searchInput, page: 1 });
  };

  const handlePreparationSelect = (preparationId: string) => {
    router.push(`/preparations/${preparationId}`);
  };

  const handleExport = () => {
    exportPreparations(filters);
  };

  const handleRefresh = () => {
    refetchPreparations();
  };

  // Données formatées pour les composants
  const preparations = preparationsData?.data.preparations || [];
  const pagination = preparationsData?.data.pagination;
  const listStats = preparationsData?.data.stats;
  const globalStats = statsData?.data.stats;
  
  // Conversion des types pour compatibilité
  const users = (usersData?.data.users || []).map((user: AuthUser) => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone
  }));
  
  const agencies = (agenciesData?.agencies || []).map((agency: AgencyType) => ({
    id: agency.id,
    name: agency.name,
    code: agency.code,
    client: agency.client || '',
    address: agency.address
  }));

  // État de chargement global
  const isLoading = isLoadingPreparations || isLoadingStats;

  // Statistiques pour les cartes
  const statsCards = useMemo(() => {
    if (!listStats) return null;

    return [
      {
        title: 'Total',
        value: listStats.total,
        icon: Building2,
        color: 'text-blue-600'
      },
      {
        title: 'En cours',
        value: listStats.inProgress,
        icon: Clock,
        color: 'text-yellow-600'
      },
      {
        title: 'Terminées',
        value: listStats.completed,
        icon: CheckCircle,
        color: 'text-green-600'
      },
      {
        title: 'En attente',
        value: listStats.pending,
        icon: Pause,
        color: 'text-gray-600'
      }
    ];
  }, [listStats]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Préparations</h1>
          <p className="text-muted-foreground">
            Gestion et suivi des préparations de véhicules
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || preparations.length === 0}
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Export...' : 'Exporter'}
          </Button>
        </div>
      </div>

      {/* Cartes statistiques */}
      {statsCards && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <IconComponent className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Statistiques avancées */}
      {globalStats && (
        <PreparationStatsCards 
          stats={globalStats.global}
          statusStats={globalStats.byStatus}
          isLoading={isLoadingStats}
        />
      )}

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtres et recherche</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barre de recherche */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par plaque, modèle ou notes..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Filtres avancés */}
          <PreparationFiltersComponent
            filters={filters}
            onFiltersChange={handleFiltersChange}
            agencies={agencies}
            users={users}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Table des préparations */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Liste des préparations</CardTitle>
              <CardDescription>
                {pagination && `${pagination.total} préparation(s) trouvée(s)`}
              </CardDescription>
            </div>
            
            {filters.search && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchInput('');
                  handleFiltersChange({ search: '', page: 1 });
                }}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Effacer recherche
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {preparationsError ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">
                Erreur lors du chargement des préparations
              </div>
              <Button variant="outline" onClick={handleRefresh}>
                Réessayer
              </Button>
            </div>
          ) : (
            <PreparationsTable
              preparations={preparations}
              pagination={pagination}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onPreparationSelect={handlePreparationSelect}
              agencies={agencies}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}