// admin-app/src/components/agencies/agency-table.tsx - TABLEAU AGENCES
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  RotateCcw,
  Eye,
  MapPin,
  Phone,
  Mail,
  Users,
  CheckCircle,
  XCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { PaginationControls } from '@/components/common/pagination-controls';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

import { useDeleteAgency, useReactivateAgency } from '@/hooks/api/useAgencies';
import { Agency, AgencyFilters, AgencyListData } from '@/types/agency';
import { cn } from '@/lib/utils';

interface AgencyTableProps {
  data?: AgencyListData;
  filters: AgencyFilters;
  selectedIds: string[];
  onFiltersChange: (filters: Partial<AgencyFilters>) => void;
  onPageChange: (page: number) => void;
  onEdit: (agency: Agency) => void;
  onSelectionChange: (ids: string[]) => void;
}

export function AgencyTable({
  data,
  filters,
  selectedIds,
  onFiltersChange,
  onPageChange,
  onEdit,
  onSelectionChange,
}: AgencyTableProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [deleteConfirm, setDeleteConfirm] = useState<Agency | null>(null);

  // Hooks pour les mutations
  const deleteAgency = useDeleteAgency();
  const reactivateAgency = useReactivateAgency();

  // Gestion de la sélection
  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.agencies) {
      onSelectionChange(data.agencies.map(agency => agency.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  // Gestion de la recherche
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ search: searchInput });
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (value === '') {
      onFiltersChange({ search: '' });
    }
  };

  // Actions sur les agences
  const handleView = (agency: Agency) => {
    router.push(`/agencies/${agency.id}`);
  };

  const handleDelete = async (agency: Agency) => {
    try {
      if (agency.isActive) {
        await deleteAgency.mutateAsync(agency.id);
      } else {
        await reactivateAgency.mutateAsync(agency.id);
      }
      setDeleteConfirm(null);
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  // Formatage des données
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatusBadge = (isActive?: boolean) => {
    if (isActive) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
        <XCircle className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  // État de sélection
  const isAllSelected = data?.agencies && selectedIds.length === data.agencies.length;
  const isPartiallySelected = selectedIds.length > 0 && !isAllSelected;

  return (
    <div className="space-y-4">
      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Recherche */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, code ou client..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        {/* Filtres */}
        <div className="flex gap-2">
          <Select
            value={filters.client || 'all'}
            onValueChange={(value) => 
              onFiltersChange({ client: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              <SelectItem value="SIXT">SIXT</SelectItem>
              <SelectItem value="Europcar">Europcar</SelectItem>
              <SelectItem value="Hertz">Hertz</SelectItem>
              <SelectItem value="Avis">Avis</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => 
              onFiltersChange({ status: value as AgencyFilters['status'] })
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actives</SelectItem>
              <SelectItem value="inactive">Inactives</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tableau */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Sélectionner tout"
                  className={cn(
                    isPartiallySelected && "data-[state=checked]:bg-primary/50"
                  )}
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onFiltersChange({
                  sort: 'name',
                  order: filters.sort === 'name' && filters.order === 'asc' ? 'desc' : 'asc'
                })}
              >
                Agence
              </TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onFiltersChange({
                  sort: 'createdAt',
                  order: filters.sort === 'createdAt' && filters.order === 'asc' ? 'desc' : 'asc'
                })}
              >
                Créée le
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.agencies?.map((agency) => (
              <TableRow 
                key={agency.id}
                className={cn(
                  "hover:bg-muted/50",
                  selectedIds.includes(agency.id) && "bg-muted/30"
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(agency.id)}
                    onCheckedChange={(checked) => 
                      handleSelectOne(agency.id, checked as boolean)
                    }
                    aria-label={`Sélectionner ${agency.name}`}
                  />
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{agency.name}</div>
                    {agency.address && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{agency.address}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {agency.code}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  {agency.client ? (
                    <Badge variant="secondary">
                      {agency.client}
                    </Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    {agency.phone && (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span>{agency.phone}</span>
                      </div>
                    )}
                    {agency.email && (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span className="truncate max-w-[150px]">{agency.email}</span>
                      </div>
                    )}
                    {!agency.phone && !agency.email && (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  {getStatusBadge(agency.isActive)}
                </TableCell>
                
                <TableCell>
                  <span className="text-sm text-gray-500">
                    {formatDate(agency.createdAt)}
                  </span>
                </TableCell>
                
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={() => handleView(agency)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Voir les détails
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => onEdit(agency)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        onClick={() => setDeleteConfirm(agency)}
                        className={cn(
                          agency.isActive 
                            ? "text-red-600 focus:text-red-600" 
                            : "text-green-600 focus:text-green-600"
                        )}
                      >
                        {agency.isActive ? (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Désactiver
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Réactiver
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            
            {data?.agencies?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Building className="h-8 w-8 text-gray-400" />
                    <span className="text-gray-500">Aucune agence trouvée</span>
                    {filters.search && (
                      <Button 
                        variant="link" 
                        size="sm"
                        onClick={() => {
                          setSearchInput('');
                          onFiltersChange({ search: '' });
                        }}
                      >
                        Effacer les filtres
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data?.pagination && (
        <PaginationControls
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          totalItems={data.pagination.total}
          onPageChange={onPageChange}
        />
      )}

      {/* Dialog de confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title={deleteConfirm?.isActive ? "Désactiver l'agence" : "Réactiver l'agence"}
        description={
          deleteConfirm?.isActive
            ? `Êtes-vous sûr de vouloir désactiver l'agence "${deleteConfirm?.name}" ? Elle ne sera plus accessible aux utilisateurs.`
            : `Êtes-vous sûr de vouloir réactiver l'agence "${deleteConfirm?.name}" ?`
        }
        confirmText={deleteConfirm?.isActive ? "Désactiver" : "Réactiver"}
        cancelText="Annuler"
        variant={deleteConfirm?.isActive ? "destructive" : "default"}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        loading={deleteAgency.isPending || reactivateAgency.isPending}
      />
    </div>
  );
}