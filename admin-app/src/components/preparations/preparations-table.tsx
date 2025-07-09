// admin-app/src/components/preparations/preparations-table.tsx
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
  Camera,
  Trash2,
  Edit
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
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
import { DeletePreparationDialog } from './delete-preparation-dialog';
import { ChangeAgencyDialog } from './change-agency-dialog';

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

interface PreparationsTableProps {
  preparations: Preparation[];
  pagination?: Pagination;
  filters: PreparationFilters;
  onFiltersChange: (filters: Partial<PreparationFilters>) => void;
  onPreparationSelect: (preparationId: string) => void;
  agencies: Agency[];
  isLoading?: boolean;
  selectedPreparations?: string[];
  onSelectionChange?: (preparationIds: string[]) => void;
}

export function PreparationsTable({
  preparations,
  pagination,
  filters,
  onFiltersChange,
  onPreparationSelect,
  agencies,
  isLoading = false,
  selectedPreparations = [],
  onSelectionChange
}: PreparationsTableProps) {
  const [selectedPreparation, setSelectedPreparation] = useState<Preparation | null>(null);
  const [showChangeAgencyDialog, setShowChangeAgencyDialog] = useState(false);

  const { mutate: updateAgency, isPending: isUpdatingAgency } = useUpdatePreparationAgency();

  // Handlers pour le tri et la pagination
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

  // Handlers pour les actions
  const handleChangeAgency = (preparation: Preparation) => {
    setSelectedPreparation(preparation);
    setShowChangeAgencyDialog(true);
  };

  const handleAgencyChangeSubmit = (agencyId: string, reason?: string) => {
    if (!selectedPreparation) return;

    updateAgency(
      {
        preparationId: selectedPreparation.id,
        agencyId,
        reason
      },
      {
        onSuccess: () => {
          setShowChangeAgencyDialog(false);
          setSelectedPreparation(null);
        }
      }
    );
  };

  // Gestion de la sélection multiple
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      onSelectionChange?.(preparations.map(prep => prep.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectOne = (preparationId: string, checked: boolean | 'indeterminate') => {
    if (checked === true) {
      onSelectionChange?.([...selectedPreparations, preparationId]);
    } else {
      onSelectionChange?.(selectedPreparations.filter(id => id !== preparationId));
    }
  };

  const isAllSelected = preparations.length > 0 && selectedPreparations.length === preparations.length;
  const isPartiallySelected = selectedPreparations.length > 0 && selectedPreparations.length < preparations.length;

  // Composant bouton de tri
  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-primary transition-colors font-medium"
    >
      {children}
      <ArrowUpDown className="h-4 w-4" />
    </button>
  );

  // État de chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table principale */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Checkbox sélection globale */}
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  ref={undefined}
                  onCheckedChange={handleSelectAll}
                  aria-label="Sélectionner toutes les préparations"
                  {...(isPartiallySelected && !isAllSelected ? { 'data-state': 'indeterminate' } : {})}
                />
              </TableHead>
              
              {/* Colonnes avec tri */}
              <TableHead className="min-w-[200px]">
                <SortButton field="vehicle">Véhicule</SortButton>
              </TableHead>
              
              <TableHead className="min-w-[180px]">
                <SortButton field="user">Préparateur</SortButton>
              </TableHead>
              
              <TableHead className="min-w-[150px]">
                <SortButton field="agency">Agence</SortButton>
              </TableHead>
              
              <TableHead className="min-w-[120px]">
                <SortButton field="status">Statut</SortButton>
              </TableHead>
              
              <TableHead className="text-center min-w-[150px]">Progression</TableHead>
              
              <TableHead className="min-w-[100px]">
                <SortButton field="totalTime">Durée</SortButton>
              </TableHead>
              
              <TableHead className="min-w-[120px]">
                <SortButton field="createdAt">Créé le</SortButton>
              </TableHead>
              
              <TableHead className="text-right w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {preparations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Aucune préparation trouvée
                </TableCell>
              </TableRow>
            ) : (
              preparations.map((preparation) => (
                <TableRow 
                  key={preparation.id}
                  className={`
                    ${selectedPreparations.includes(preparation.id) ? 'bg-muted/50' : ''}
                    hover:bg-muted/30 transition-colors
                  `}
                >
                  {/* Checkbox sélection individuelle */}
                  <TableCell>
                    <Checkbox
                      checked={selectedPreparations.includes(preparation.id)}
                      onCheckedChange={(checked) => handleSelectOne(preparation.id, checked)}
                      aria-label={`Sélectionner la préparation ${preparation.vehicle?.licensePlate || preparation.id}`}
                    />
                  </TableCell>

                  {/* Informations du véhicule */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">
                        {preparation.vehicle?.model || ''}
                      </div>
                      <div className="text-sm text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                        {preparation.vehicle?.licensePlate || 'Aucune'}
                      </div>
                      {preparation.vehicle?.year && (
                        <div className="text-xs text-gray-400">
                          {preparation.vehicle.year}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Informations du préparateur */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-primary">
                          {preparation.user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">
                          {preparation.user?.name || 'Non assigné'}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {preparation.user?.email || ''}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Informations de l'agence */}
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">
                          {preparation.agency?.name || 'Non assignée'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {preparation.agency?.code && preparation.agency?.client && (
                            <span>{preparation.agency.code} - {preparation.agency.client}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Statut */}
                  <TableCell>
                    <Badge variant={getStatusColor(preparation.status)} className="whitespace-nowrap">
                      {PREPARATION_STATUS_LABELS[preparation.status] || preparation.status}
                    </Badge>
                  </TableCell>

                  {/* Barre de progression */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress 
                        value={preparation.progress || 0} 
                        className="flex-1 h-2" 
                      />
                      <span className="text-sm font-medium min-w-[3rem] text-right">
                        {preparation.progress || 0}%
                      </span>
                    </div>
                  </TableCell>

                  {/* Durée et ponctualité */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm">
                        {formatDuration(preparation.totalTime || 0)}
                      </span>
                      {preparation.isOnTime === false && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>

                  {/* Date et heure de création */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {new Date(preparation.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(preparation.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </TableCell>

                  {/* Menu d'actions */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Ouvrir le menu d'actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        
                        <DropdownMenuItem 
                          onClick={() => onPreparationSelect(preparation.id)}
                          className="cursor-pointer"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir les détails
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={() => onPreparationSelect(preparation.id)}
                          className="cursor-pointer"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={() => handleChangeAgency(preparation)}
                          className="cursor-pointer"
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          Changer d'agence
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DeletePreparationDialog
                          preparation={preparation}
                          onSuccess={() => window.location.reload()}
                        >
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600 cursor-pointer"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DeletePreparationDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Section de pagination */}
      {pagination && pagination.totalPages && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          {/* Informations sur les résultats */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
              {pagination.total} résultats
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Sélecteur de limite par page */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Lignes par page:</span>
              <Select value={String(filters.limit)} onValueChange={handleLimitChange}>
                <SelectTrigger className="w-20">
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

            {/* Contrôles de navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="h-8"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Précédent
              </Button>

              {/* Numéros de pages */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  
                  // Logique pour afficher les bonnes pages
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === pagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="h-8 w-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                {/* Ellipsis si nécessaire */}
                {pagination.totalPages > 5 && pagination.page < pagination.totalPages - 2 && (
                  <>
                    <span className="px-2 text-muted-foreground">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.totalPages)}
                      className="h-8 w-8 p-0"
                    >
                      {pagination.totalPages}
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="h-8"
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ChangeAgencyDialog
        open={showChangeAgencyDialog}
        onOpenChange={setShowChangeAgencyDialog}
        preparation={selectedPreparation}
        agencies={agencies}
        onSubmit={handleAgencyChangeSubmit}
        isLoading={isUpdatingAgency}
      />
    </div>
  );
}