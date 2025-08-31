'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  Edit,
  ChevronsLeft,
  ChevronsRight
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
  Pagination
} from '@/types/preparation';

import type { Agency } from '@/types/agency';

// ✅ INTERFACES CORRIGÉES
interface PreparationsTableProps {
  preparations: Preparation[];
  pagination?: Pagination;
  filters: PreparationFilters;
  onFiltersChange: (filters: Partial<PreparationFilters>) => void;
  onPreparationSelect: (preparationId: string) => void;
  agencies: Agency[]; // ✅ CORRECTION: Utiliser PreparationAgency[] au lieu d'Agency[]
  isLoading?: boolean;
  selectedPreparations?: string[];
  onSelectionChange?: (preparationIds: string[]) => void;
}

// ✅ FONCTIONS UTILITAIRES CORRIGÉES
const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'completed': return 'default';
    case 'in_progress': return 'secondary';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'pending': 'En attente',
    'in_progress': 'En cours',
    'completed': 'Terminé',
    'cancelled': 'Annulé'
  };
  return labels[status] || status;
};

const formatDuration = (minutes: number | null | undefined): string => {
  if (!minutes || minutes === 0) return '0 min';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
};

// ✅ COMPOSANT PRINCIPAL CORRIGÉ
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
  const [showChangeAgencyDialog, setShowChangeAgencyDialog] = useState<boolean>(false);
  
  const selectAllCheckboxRef = useRef<any>(null);
  const { mutate: updateAgency, isPending: isUpdatingAgency } = useUpdatePreparationAgency();

  // ✅ CALLBACKS CORRIGÉS
  const handleSort = useCallback((field: string) => {
    const newOrder: 'asc' | 'desc' = filters.sort === field && filters.order === 'asc' ? 'desc' : 'asc';
    onFiltersChange({ sort: field as any, order: newOrder });
  }, [filters.sort, filters.order, onFiltersChange]);

  const handlePageChange = useCallback((newPage: number) => {
    if (!pagination) return;
    
    const maxPage = pagination.totalPages || pagination.pages || 1;
    if (newPage >= 1 && newPage <= maxPage) {
      onFiltersChange({ page: newPage });
    }
  }, [pagination, onFiltersChange]);

  const handleLimitChange = useCallback((newLimit: string) => {
    const limit = parseInt(newLimit, 10);
    if (!isNaN(limit) && limit > 0) {
      onFiltersChange({ limit, page: 1 });
    }
  }, [onFiltersChange]);

  const handleSelectAll = useCallback((checked: boolean | "indeterminate") => {
    if (onSelectionChange && checked !== "indeterminate") {
      onSelectionChange(checked ? preparations.map(prep => prep.id) : []);
    }
  }, [preparations, onSelectionChange]);

  const handleSelectOne = useCallback((preparationId: string, checked: boolean | "indeterminate") => {
    if (onSelectionChange && checked !== "indeterminate") {
      if (checked) {
        onSelectionChange([...selectedPreparations, preparationId]);
      } else {
        onSelectionChange(selectedPreparations.filter(id => id !== preparationId));
      }
    }
  }, [selectedPreparations, onSelectionChange]);

  const handleChangeAgency = useCallback((preparation: Preparation) => {
    setSelectedPreparation(preparation);
    setShowChangeAgencyDialog(true);
  }, []);

  const handleAgencyChangeSubmit = useCallback((agencyId: string, reason?: string) => {
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
  }, [selectedPreparation, updateAgency]);

  // ✅ CALCULS PAGINATION CORRIGÉS
  const totalPages = pagination?.totalPages || pagination?.pages || 1;
  const currentPage = pagination?.page || 1;
  const limit = pagination?.limit || filters.limit || 20;
  const total = pagination?.total || pagination?.totalCount || 0;

  const startItem = total === 0 ? 0 : ((currentPage - 1) * limit) + 1;
  const endItem = Math.min(currentPage * limit, total);

  const isAllSelected = preparations.length > 0 && 
    preparations.every(prep => selectedPreparations.includes(prep.id));
  const isIndeterminate = selectedPreparations.length > 0 && !isAllSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const getPageNumbers = useCallback((): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];
    pages.push(1);

    if (currentPage <= 4) {
      for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
        pages.push(i);
      }
      if (totalPages > 5) {
        pages.push('ellipsis');
      }
    } else if (currentPage >= totalPages - 3) {
      pages.push('ellipsis');
      for (let i = Math.max(2, totalPages - 4); i <= totalPages - 1; i++) {
        pages.push(i);
      }
    } else {
      pages.push('ellipsis');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i);
      }
      pages.push('ellipsis');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header sélection multiple */}
      {selectedPreparations.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm text-blue-700 font-medium">
            {selectedPreparations.length} préparation{selectedPreparations.length > 1 ? 's' : ''} sélectionnée{selectedPreparations.length > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectionChange?.([])}
            >
              Désélectionner tout
            </Button>
            <Button variant="default" size="sm">
              Actions groupées
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {onSelectionChange && (
                <TableHead className="w-12">
                  <Checkbox
                    ref={selectAllCheckboxRef}
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Sélectionner tout"
                  />
                </TableHead>
              )}
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort('vehicle')}
                >
                  Véhicule
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort('user')}
                >
                  Préparateur
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort('agency')}
                >
                  Agence
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Progression</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort('totalTime')}
                >
                  Durée
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort('createdAt')}
                >
                  Créé le
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preparations.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={onSelectionChange ? 9 : 8} 
                  className="h-24 text-center"
                >
                  Aucune préparation trouvée.
                </TableCell>
              </TableRow>
            ) : (
              preparations.map((preparation) => (
                <TableRow 
                  key={preparation.id}
                  className="hover:bg-muted/50"
                >
                  {onSelectionChange && (
                    <TableCell>
                      <Checkbox
                        checked={selectedPreparations.includes(preparation.id)}
                        onCheckedChange={(checked) => handleSelectOne(preparation.id, checked)}
                        aria-label={`Sélectionner préparation ${preparation.vehicle.licensePlate}`}
                      />
                    </TableCell>
                  )}
                  
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div className="font-mono text-sm">
                        {preparation.vehicle.licensePlate}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {preparation.vehicle.brand && preparation.vehicle.brand !== 'N/A' 
                          ? `${preparation.vehicle.brand} ${preparation.vehicle.model}` 
                          : preparation.vehicle.model
                        }
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {preparation.user.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {preparation.user.email}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">
                          {preparation.agency.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {preparation.agency.code}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={getStatusColor(preparation.status)}>
                      {getStatusLabel(preparation.status)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{preparation.progress}%</span>
                        {preparation.isOnTime === false && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        {preparation.status === 'completed' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <Progress value={preparation.progress} className="h-2" />
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {formatDuration(preparation.totalTime || preparation.currentDuration)}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {new Date(preparation.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Ouvrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => onPreparationSelect(preparation.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir détails
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => window.open(`/preparations/${preparation.id}/photos`, '_blank')}>
                          <Camera className="h-4 w-4 mr-2" />
                          Photos
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => handleChangeAgency(preparation)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Changer d&apos;agence
                        </DropdownMenuItem>
                        
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

      {/* Pagination */}
      {pagination && total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t bg-gray-50/50">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground">
            <span>
              Affichage de <span className="font-medium">{startItem}</span> à{' '}
              <span className="font-medium">{endItem}</span> sur{' '}
              <span className="font-medium">{total}</span> résultats
            </span>

            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">Lignes par page:</span>
              <Select value={String(limit)} onValueChange={handleLimitChange}>
                <SelectTrigger className="w-20 h-8">
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
          </div>

          {/* Navigation pagination */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage <= 1}
              className="h-8 w-8 p-0"
              title="Première page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="h-8 px-3"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Précédent
            </Button>

            <div className="flex items-center gap-1">
              {getPageNumbers().map((pageNum, index) => {
                if (pageNum === 'ellipsis') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-2 py-1 text-sm text-muted-foreground">
                      ...
                    </span>
                  );
                }

                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="h-8 w-8 p-0"
                    disabled={pageNum === currentPage}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="h-8 px-3"
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages}
              className="h-8 w-8 p-0"
              title="Dernière page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Message vide */}
      {pagination && total === 0 && (
        <div className="flex items-center justify-center py-8 text-center">
          <div className="space-y-2">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="text-lg font-medium text-muted-foreground">
              Aucun résultat trouvé
            </div>
            <div className="text-sm text-muted-foreground">
              Essayez de modifier vos filtres de recherche
            </div>
          </div>
        </div>
      )}

      {/* Dialog changement d'agence */}
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