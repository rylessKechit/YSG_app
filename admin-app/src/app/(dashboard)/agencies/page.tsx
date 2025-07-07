// admin-app/src/app/(dashboard)/agencies/page.tsx - PAGE PRINCIPALE AGENCES
'use client';

import { useState } from 'react';
import { Building, Plus, Filter, Download, MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/page-header';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { AgencyTable } from '@/components/agencies/agency-table';
import { AgencyForm } from '@/components/agencies/agency-form';
import { BulkActionsAgencies } from '@/components/agencies/bulk-actions-agencies';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAgencies, useExportAgencies } from '@/hooks/api/useAgencies';
import { Agency, AgencyFilters } from '@/types/agency';

export default function AgenciesPage() {
  // États locaux
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<AgencyFilters>({
    page: 1,
    limit: 20,
    search: '',
    status: 'all',
    sort: 'name',
    order: 'asc'
  });

  // Hooks API
  const { data, isLoading, error } = useAgencies(filters);
  const exportAgencies = useExportAgencies();

  // Handlers
  const handleCreateAgency = () => {
    setEditingAgency(null);
    setShowCreateDialog(true);
  };

  const handleEditAgency = (agency: Agency) => {
    setEditingAgency(agency);
    setShowCreateDialog(true);
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingAgency(null);
  };

  const handleFiltersChange = (newFilters: Partial<AgencyFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset page lors du changement de filtres
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleSelectionChange = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const handleExport = async (format: 'excel' | 'csv') => {
    try {
      await exportAgencies.mutateAsync({ format, filters });
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  // Statistiques rapides
  const stats = data?.stats;

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Building className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
              <p className="text-gray-600 mb-4">
                Impossible de charger les agences. Veuillez réessayer.
              </p>
              <Button onClick={() => window.location.reload()}>
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <PageHeader
        title="Gestion des Agences"
        description="Gérez les agences, leurs informations et leurs paramètres"
        icon={Building}
        actions={
          <div className="flex items-center gap-3">
            {/* Actions en masse */}
            {selectedIds.length > 0 && (
              <BulkActionsAgencies
                selectedIds={selectedIds}
                onSuccess={() => setSelectedIds([])}
              />
            )}

            {/* Menu export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={exportAgencies.isPending}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Format d'export</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  Fichier Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Fichier CSV (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bouton création */}
            <Button onClick={handleCreateAgency}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Agence
            </Button>
          </div>
        }
      />

      {/* Cartes de statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Agences
              </CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAgencies}</div>
              <p className="text-xs text-muted-foreground">
                Toutes les agences du système
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Agences Actives
              </CardTitle>
              <div className="h-2 w-2 bg-green-500 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.activeAgencies}
              </div>
              <p className="text-xs text-muted-foreground">
                Agences en service
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Agences Inactives
              </CardTitle>
              <div className="h-2 w-2 bg-red-500 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.inactiveAgencies}
              </div>
              <p className="text-xs text-muted-foreground">
                Agences suspendues
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tableau des agences */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Agences</CardTitle>
          <CardDescription>
            {data?.pagination && (
              `${data.pagination.total} agence${data.pagination.total > 1 ? 's' : ''} au total`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <AgencyTable
              data={data}
              filters={filters}
              selectedIds={selectedIds}
              onFiltersChange={handleFiltersChange}
              onPageChange={handlePageChange}
              onEdit={handleEditAgency}
              onSelectionChange={handleSelectionChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialog de création/modification */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAgency ? 'Modifier l\'agence' : 'Créer une nouvelle agence'}
            </DialogTitle>
            <DialogDescription>
              {editingAgency 
                ? 'Modifiez les informations de l\'agence ci-dessous.'
                : 'Complétez les informations pour créer une nouvelle agence.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <AgencyForm
            agency={editingAgency}
            onSuccess={handleCloseDialog}
            onCancel={handleCloseDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}