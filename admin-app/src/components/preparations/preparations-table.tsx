// admin-app/src/app/(dashboard)/preparations/components/preparations-table.tsx
'use client';

import { useState } from 'react';
import { 
  Eye,
  MoreHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Camera
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/common/loading-spinner';

import { useUpdatePreparationAgency } from '@/hooks/api/usePreparations';

import type { 
  Preparation, 
  PreparationFilters,
  Pagination,
  Agency
} from '@/types/preparation';
import { 
  PREPARATION_STATUS_LABELS,
  PREPARATION_STEP_LABELS,
  getStatusColor,
  getProgressColor,
  formatDuration
} from '@/types/preparation';

import { ChangeAgencyDialog } from './change-agency-dialog';

interface PreparationsTableProps {
  preparations: Preparation[];
  pagination?: Pagination;
  filters: PreparationFilters;
  onFiltersChange: (filters: Partial<PreparationFilters>) => void;
  onPreparationSelect: (preparationId: string) => void;
  agencies: Agency[];
  isLoading?: boolean;
}

export function PreparationsTable({
  preparations,
  pagination,
  filters,
  onFiltersChange,
  onPreparationSelect,
  agencies,
  isLoading = false
}: PreparationsTableProps) {
  const [selectedPreparation, setSelectedPreparation] = useState<Preparation | null>(null);
  const [showChangeAgencyDialog, setShowChangeAgencyDialog] = useState(false);

  const { mutate: updateAgency, isPending: isUpdatingAgency } = useUpdatePreparationAgency();

  // Handlers
  const handleSort = (field: string) => {
    const newOrder = filters.sort === field && filters.order === 'asc' ? 'desc' : 'asc';
    onFiltersChange({ sort: field as any, order: newOrder });
  };

  const handlePageChange = (page: number) => {
    onFiltersChange({ page });
  };

  const handleLimitChange = (limit: string) => {
    onFiltersChange({ limit: parseInt(limit), page: 1 });
  };

  const handleChangeAgency = (preparation: Preparation) => {
    setSelectedPreparation(preparation);
    setShowChangeAgencyDialog(true);
  };

  const handleAgencyChangeSubmit = (agencyId: string, reason?: string) => {
    if (!selectedPreparation) return;

    updateAgency({
      preparationId: selectedPreparation.id,
      agencyId,
      reason
    }, {
      onSuccess: () => {
        setShowChangeAgencyDialog(false);
        setSelectedPreparation(null);
      }
    });
  };

  const getSortIcon = (field: string) => {
    if (filters.sort !== field) return <ArrowUpDown className="h-4 w-4" />;
    return filters.order === 'asc' ? '↑' : '↓';
  };

  const getStepSummary = (preparation: Preparation) => {
    const completedSteps = preparation.steps.filter(step => step.completed).length;
    const totalSteps = preparation.steps.length;
    const hasPhotos = preparation.steps.some(step => step.photosCount && step.photosCount > 0);

    return {
      completed: completedSteps,
      total: totalSteps,
      hasPhotos
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (preparations.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground mb-2">
          Aucune préparation trouvée
        </div>
        <Button 
          variant="outline" 
          onClick={() => onFiltersChange({ search: '', status: 'all', user: undefined, agency: undefined })}
        >
          Réinitialiser les filtres
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('vehicle')}
                    className="h-auto p-0 font-medium"
                  >
                    Véhicule {getSortIcon('vehicle')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('user')}
                    className="h-auto p-0 font-medium"
                  >
                    Préparateur {getSortIcon('user')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('agency')}
                    className="h-auto p-0 font-medium"
                  >
                    Agence {getSortIcon('agency')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('status')}
                    className="h-auto p-0 font-medium"
                  >
                    Statut {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead>Progression</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('totalTime')}
                    className="h-auto p-0 font-medium"
                  >
                    Durée {getSortIcon('totalTime')}
                  </Button>
                </TableHead>
                <TableHead>Étapes</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('createdAt')}
                    className="h-auto p-0 font-medium"
                  >
                    Créé le {getSortIcon('createdAt')}
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preparations.map((preparation) => {
                const stepSummary = getStepSummary(preparation);
                return (
                  <TableRow key={preparation.id} className="hover:bg-muted/50">
                    {/* Véhicule */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{preparation.vehicle.licensePlate}</div>
                        <div className="text-sm text-muted-foreground">
                          {preparation.vehicle.brand} {preparation.vehicle.model}
                        </div>
                      </div>
                    </TableCell>

                    {/* Préparateur */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{preparation.user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {preparation.user.email}
                        </div>
                      </div>
                    </TableCell>

                    {/* Agence */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{preparation.agency.name}</div>
                        <Badge variant="outline" className="text-xs">
                          {preparation.agency.code}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Statut */}
                    <TableCell>
                      <Badge className={getStatusColor(preparation.status)}>
                        {PREPARATION_STATUS_LABELS[preparation.status]}
                      </Badge>
                    </TableCell>

                    {/* Progression */}
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{preparation.progress}%</span>
                          {!preparation.isOnTime && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <Progress 
                          value={preparation.progress} 
                          className="h-2"
                        />
                      </div>
                    </TableCell>

                    {/* Durée */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className={`font-medium ${!preparation.isOnTime ? 'text-red-600' : ''}`}>
                          {preparation.totalTime ? formatDuration(preparation.totalTime) : formatDuration(preparation.duration)}
                        </div>
                        {!preparation.isOnTime && (
                          <div className="text-xs text-red-500">En retard</div>
                        )}
                      </div>
                    </TableCell>

                    {/* Étapes */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">
                          {stepSummary.completed}/{stepSummary.total}
                        </div>
                        {stepSummary.hasPhotos && (
                          <Camera className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                    </TableCell>

                    {/* Date création */}
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(preparation.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onPreparationSelect(preparation.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Voir détail
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleChangeAgency(preparation)}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Changer d'agence
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
                {pagination.total} résultats
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Sélecteur de limite */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Afficher:</span>
                <Select
                  value={String(filters.limit)}
                  onValueChange={handleLimitChange}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Navigation pages */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-sm text-muted-foreground px-2">
                  Page {pagination.page} sur {pagination.pages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext || isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialog changement d'agence */}
      <ChangeAgencyDialog
        open={showChangeAgencyDialog}
        onOpenChange={setShowChangeAgencyDialog}
        preparation={selectedPreparation}
        agencies={agencies}
        onSubmit={handleAgencyChangeSubmit}
        isLoading={isUpdatingAgency}
      />
    </>
  );
}