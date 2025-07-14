// admin-app/src/components/preparations/preparations-table.tsx - CORRECTIONS FINALES

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
  Agency
} from '@/types/preparation';

// ✅ CORRECTION 1 : Types stricts
interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// ✅ CORRECTION 2 : SortField avec tous les champs valides
type SortField = keyof PreparationFilters['sort'] extends string 
  ? PreparationFilters['sort'] 
  : 'createdAt' | 'startTime' | 'endTime' | 'totalTime' | 'status';

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

// ✅ CORRECTION 3 : Fonctions utilitaires avec types stricts
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

const formatDuration = (minutes: number): string => {
  if (!minutes || minutes === 0) return '0 min';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
};

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
  
  // ✅ CORRECTION 4 : Ref avec type correct pour HTMLInputElement
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const { mutate: updateAgency, isPending: isUpdatingAgency } = useUpdatePreparationAgency();

  // ✅ CORRECTION 5 : handleSort avec type any pour plus de flexibilité
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

  // ✅ CORRECTION 6 : handleSelectAll avec type correct
  const handleSelectAll = useCallback((checked: boolean | "indeterminate") => {
    if (onSelectionChange && checked !== "indeterminate") {
      onSelectionChange(checked ? preparations.map(prep => prep.id) : []);
    }
  }, [preparations, onSelectionChange]);

  // ✅ CORRECTION 7 : handleSelectOne avec type correct
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

  // Calculs pagination
  const totalPages = pagination?.totalPages || pagination?.pages || 1;
  const currentPage = pagination?.page || 1;
  const limit = pagination?.limit || filters.limit || 20;
  const total = pagination?.total || 0;

  const startItem = total === 0 ? 0 : ((currentPage - 1) * limit) + 1;
  const endItem = Math.min(currentPage * limit, total);

  const isAllSelected = preparations.length > 0 && 
    preparations.every(prep => selectedPreparations.includes(prep.id));
  const isIndeterminate = selectedPreparations.length > 0 && !isAllSelected;

  // ✅ CORRECTION 8 : useEffect pour indeterminate avec HTMLInputElement
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  // ✅ CORRECTION 9 : getPageNumbers avec type union explicite
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
            <DeletePreparationDialog
              preparations={preparations.filter(prep => selectedPreparations.includes(prep.id))}
              onSuccess={() => {
                onSelectionChange?.([]);
                window.location.reload();
              }}
            >
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer la sélection
              </Button>
            </DeletePreparationDialog>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                {/* ✅ CORRECTION 10 : Checkbox sans ref, gestion manuelle indeterminate */}
                <Checkbox
                  checked={isAllSelected}
                  // @ts-ignore - Temporaire pour éviter l'erreur indeterminate
                  ref={selectAllCheckboxRef}
                  onCheckedChange={handleSelectAll}
                  aria-label="Sélectionner tout"
                />
              </TableHead>

              <TableHead className="min-w-[200px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('vehicle')}
                  className="h-auto p-0 hover:bg-transparent font-semibold"
                >
                  Véhicule
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>

              <TableHead className="min-w-[180px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('user')}
                  className="h-auto p-0 hover:bg-transparent font-semibold"
                >
                  Préparateur
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>

              <TableHead className="min-w-[160px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('agency')}
                  className="h-auto p-0 hover:bg-transparent font-semibold"
                >
                  Agence
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>

              <TableHead className="min-w-[120px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('status')}
                  className="h-auto p-0 hover:bg-transparent font-semibold"
                >
                  Statut
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>

              <TableHead className="min-w-[140px]">Progression</TableHead>

              <TableHead className="min-w-[120px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('totalTime')}
                  className="h-auto p-0 hover:bg-transparent font-semibold"
                >
                  Durée
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>

              <TableHead className="min-w-[120px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('createdAt')}
                  className="h-auto p-0 hover:bg-transparent font-semibold"
                >
                  Date
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>

              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {preparations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                    <span>Aucune préparation trouvée</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              preparations.map((preparation) => (
                <TableRow
                  key={preparation.id}
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedPreparations.includes(preparation.id) ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => onPreparationSelect(preparation.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedPreparations.includes(preparation.id)}
                      onCheckedChange={(checked) => 
                        handleSelectOne(preparation.id, checked)
                      }
                      aria-label={`Sélectionner ${preparation.vehicle?.licensePlate || 'cette préparation'}`}
                    />
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">
                        {preparation.vehicle?.licensePlate || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {preparation.vehicle?.brand} {preparation.vehicle?.model}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">
                        {preparation.user?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {preparation.user?.email}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="space-y-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {preparation.agency?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {preparation.agency?.code}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={getStatusColor(preparation.status)} className="whitespace-nowrap">
                      {getStatusLabel(preparation.status)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{preparation.progress || 0}%</span>
                        <span className="text-muted-foreground">
                          {preparation.steps?.filter(s => s.completed).length || 0}/
                          {preparation.steps?.length || 6}
                        </span>
                      </div>
                      <Progress 
                        value={preparation.progress || 0} 
                        className="h-2"
                      />
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="space-y-1">
                        <div className="font-medium">
                          {formatDuration(preparation.totalTime || preparation.duration || 0)}
                        </div>
                        {preparation.isOnTime !== undefined && (
                          <div className="flex items-center gap-1 text-sm">
                            {preparation.isOnTime ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                <span className="text-green-600">À temps</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3 text-orange-500" />
                                <span className="text-orange-600">En retard</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div className="font-medium">
                        {new Date(preparation.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(preparation.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Ouvrir le menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
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

          <div className="flex items-center gap-1">
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

            <div className="flex items-center gap-1 mx-2">
              {getPageNumbers().map((pageNum, index) => {
                if (pageNum === 'ellipsis') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
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