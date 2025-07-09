// admin-app/src/app/(dashboard)/preparations/page.tsx - VERSION MISE À JOUR
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
  Pause,
  Trash2,
  Plus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';

import { usePreparations, usePreparationsStats } from '@/hooks/api/usePreparations';
import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';

import { PreparationFilters, PreparationStatus } from '@/types/preparation';
import type { User as AuthUser } from '@/types/auth';
import type { Agency as AgencyType } from '@/types/agency';

import { PreparationsTable } from '@/components/preparations/preparations-table';
import { PreparationFiltersComponent } from '@/components/preparations/preparation-filters';
import { PreparationStatsCards } from '@/components/preparations/preparation-stats';
import { ExportDialog } from '@/components/preparations/export-dialog';
import { DeletePreparationDialog } from '@/components/preparations/delete-preparation-dialog';

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
  const [selectedPreparations, setSelectedPreparations] = useState<string[]>([]);

  // Hooks API
  const { 
    data: preparationsData, 
    isLoading: isLoadingPreparations,
    refetch: refetchPreparations,
    error: preparationsError
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
    page: 1, 
    limit: 100, 
    role: 'preparateur'
  });

  const { data: agenciesData } = useAgencies({ 
    page: 1, 
    limit: 100
  });

  // Données extraites
  const preparations = preparationsData?.data?.preparations || [];
  const pagination = preparationsData?.data?.pagination;
  const stats = statsData?.data?.stats;
  const users = usersData?.data?.users || [];
  const agencies = agenciesData?.agencies || [];

  // Préparations sélectionnées pour suppression
  const selectedPreparationsData = useMemo(() => {
    return preparations.filter(prep => selectedPreparations.includes(prep.id));
  }, [preparations, selectedPreparations]);

  // Handlers
  const handleFiltersChange = (newFilters: Partial<PreparationFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSearch = () => {
    handleFiltersChange({ search: searchInput, page: 1 });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePreparationSelect = (preparationId: string) => {
    router.push(`/preparations/${preparationId}`);
  };

  const handleRefresh = () => {
    refetchPreparations();
  };

  const handleSelectionChange = (preparationIds: string[]) => {
    setSelectedPreparations(preparationIds);
  };

  const handleDeleteSuccess = () => {
    setSelectedPreparations([]);
    refetchPreparations();
  };

  // États de chargement et d'erreur
  if (preparationsError) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-gray-600 mb-4">
              Impossible de charger les préparations
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Préparations</h1>
          <p className="text-gray-600 mt-1">
            Gestion et suivi des préparations de véhicules
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Actions de sélection multiple */}
          {selectedPreparations.length > 0 && (
            <>
              <Badge variant="secondary" className="px-3 py-1">
                {selectedPreparations.length} sélectionnée(s)
              </Badge>
              
              <DeletePreparationDialog
                preparations={selectedPreparationsData}
                onSuccess={handleDeleteSuccess}
              >
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer ({selectedPreparations.length})
                </Button>
              </DeletePreparationDialog>
            </>
          )}

          {/* Export */}
          <ExportDialog currentFilters={filters}>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </ExportDialog>

          {/* Actualiser */}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoadingPreparations}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingPreparations ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          {/* Nouvelle préparation */}
          <Button onClick={() => router.push('/preparations/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle préparation
          </Button>
        </div>
      </div>

      {/* Cartes de statistiques */}
      {stats && (
        <PreparationStatsCards 
          stats={stats.global || stats} 
          statusStats={stats.byStatus}
          isLoading={isLoadingStats} 
        />
      )}

      {/* Filtres et recherche */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres et recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barre de recherche */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par plaque, modèle ou notes..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full"
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoadingPreparations}>
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </Button>
          </div>

          {/* Filtres avancés */}
          <PreparationFiltersComponent
            filters={filters}
            onFiltersChange={handleFiltersChange}
            users={users.map(user => ({
              id: user.id,
              name: user.firstName,
              email: user.email,
              phone: user.phone
            }))}
            agencies={agencies}
            isLoading={isLoadingPreparations}
          />
        </CardContent>
      </Card>

      {/* Table des préparations */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Liste des préparations
              {pagination && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({pagination.total} au total)
                </span>
              )}
            </CardTitle>

            {selectedPreparations.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{selectedPreparations.length} élément(s) sélectionné(s)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPreparations([])}
                >
                  Désélectionner tout
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPreparations ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : preparations.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucune préparation trouvée
                </h3>
                <p className="text-gray-600 mb-4">
                  {filters.search || filters.status !== 'all' || filters.agency || filters.user
                    ? 'Essayez de modifier vos filtres de recherche'
                    : 'Commencez par créer une nouvelle préparation'
                  }
                </p>
                {!(filters.search || filters.status !== 'all' || filters.agency || filters.user) && (
                  <Button onClick={() => router.push('/preparations/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une préparation
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <PreparationsTable
              preparations={preparations}
              pagination={pagination}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onPreparationSelect={handlePreparationSelect}
              agencies={agencies}
              isLoading={isLoadingPreparations}
              selectedPreparations={selectedPreparations}
              onSelectionChange={handleSelectionChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}