// admin-app/src/app/(dashboard)/preparations/components/preparation-filters.tsx
'use client';

import { Calendar, X, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import type { PreparationFilters, PreparationAgency, PreparationUser } from '@/types/preparation';
import { PREPARATION_STATUS_LABELS, PreparationStatus } from '@/types/preparation';

interface PreparationFiltersProps {
  filters: PreparationFilters;
  onFiltersChange: (filters: Partial<PreparationFilters>) => void;
  agencies: PreparationAgency[];
  users: PreparationUser[];
  isLoading?: boolean;
}

export function PreparationFiltersComponent({
  filters,
  onFiltersChange,
  agencies,
  users,
  isLoading = false
}: PreparationFiltersProps) {

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      user: undefined,
      agency: undefined,
      startDate: '',
      endDate: '',
      page: 1
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.user && filters.user !== 'all') count++;
    if (filters.agency && filters.agency !== 'all') count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const getSelectedAgencyName = (agencyId?: string) => {
    if (!agencyId || agencyId === 'all') return undefined;
    return agencies.find(agency => agency.id === agencyId)?.name;
  };

  const getSelectedUserName = (userId?: string) => {
    if (!userId || userId === 'all') return undefined;
    return users.find(user => user.id === userId)?.name;
  };

  return (
    <div className="space-y-4">
      {/* Filtres principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Statut */}
        <div className="space-y-2">
          <Label htmlFor="status">Statut</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => onFiltersChange({ 
              status: value === 'all' ? 'all' : value as PreparationStatus,
              page: 1 
            })}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(PREPARATION_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Agence */}
        <div className="space-y-2">
          <Label htmlFor="agency">Agence</Label>
          <Select
            value={filters.agency || "all"}
            onValueChange={(value) => onFiltersChange({ 
              agency: value === "all" ? undefined : value,
              page: 1 
            })}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes les agences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les agences</SelectItem>
              {agencies.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name} ({agency.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Préparateur */}
        <div className="space-y-2">
          <Label htmlFor="user">Préparateur</Label>
          <Select
            value={filters.user || "all"}
            onValueChange={(value) => onFiltersChange({ 
              user: value === "all" ? undefined : value,
              page: 1 
            })}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les préparateurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les préparateurs</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action clear */}
        <div className="space-y-2">
          <Label>&nbsp;</Label>
          <Button
            variant="outline"
            onClick={handleClearFilters}
            disabled={isLoading || activeFiltersCount === 0}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Effacer filtres
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Filtres de date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Date de début</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="startDate"
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFiltersChange({ 
                startDate: e.target.value,
                page: 1 
              })}
              disabled={isLoading}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">Date de fin</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="endDate"
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFiltersChange({ 
                endDate: e.target.value,
                page: 1 
              })}
              disabled={isLoading}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Résumé des filtres actifs */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filtres actifs:
          </div>
          
          {filters.search && (
            <Badge variant="secondary">
              Recherche: "{filters.search}"
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onFiltersChange({ search: '', page: 1 })}
              />
            </Badge>
          )}
          
          {filters.status && filters.status !== 'all' && (
            <Badge variant="secondary">
              Statut: {PREPARATION_STATUS_LABELS[filters.status as PreparationStatus]}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onFiltersChange({ status: 'all', page: 1 })}
              />
            </Badge>
          )}
          
          {filters.agency && filters.agency !== 'all' && (
            <Badge variant="secondary">
              Agence: {getSelectedAgencyName(filters.agency)}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onFiltersChange({ agency: undefined, page: 1 })}
              />
            </Badge>
          )}
          
          {filters.user && filters.user !== 'all' && (
            <Badge variant="secondary">
              Préparateur: {getSelectedUserName(filters.user)}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onFiltersChange({ user: undefined, page: 1 })}
              />
            </Badge>
          )}
          
          {filters.startDate && (
            <Badge variant="secondary">
              Début: {new Date(filters.startDate).toLocaleDateString('fr-FR')}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onFiltersChange({ startDate: '', page: 1 })}
              />
            </Badge>
          )}
          
          {filters.endDate && (
            <Badge variant="secondary">
              Fin: {new Date(filters.endDate).toLocaleDateString('fr-FR')}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onFiltersChange({ endDate: '', page: 1 })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}