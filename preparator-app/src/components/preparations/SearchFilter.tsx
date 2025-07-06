// preparator-app/src/components/preparations/SearchFilter.tsx
// ✅ MISE À JOUR: Compatible avec le workflow flexible et nouvelles structures

import React, { useState } from 'react';
import { Search, Filter, X, Camera, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgencySelector } from './AgencySelector';

// ✅ Interface Agency mise à jour
interface Agency {
  id: string;
  name: string;
  code: string;
  client?: string;
}

// ✅ Nouvelles options de filtrage pour le workflow flexible
interface AdvancedFilters {
  status?: 'all' | 'in_progress' | 'completed' | 'cancelled';
  completionType?: 'all' | 'complete' | 'partial'; // Nouveau: complet vs partiel
  hasPhotos?: boolean; // Nouveau: a des photos
  hasIssues?: boolean; // Nouveau: a des incidents
  dateRange?: {
    from?: string;
    to?: string;
  };
  minSteps?: number; // Nouveau: nombre minimum d'étapes complétées
  maxSteps?: number; // Nouveau: nombre maximum d'étapes complétées
}

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedAgency: string;
  onAgencyChange: (value: string) => void;
  agencies: Agency[];
  placeholder?: string;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  activeFiltersCount?: number;
  // ✅ Nouveaux props pour le workflow flexible
  advancedFilters?: AdvancedFilters;
  onAdvancedFiltersChange?: (filters: AdvancedFilters) => void;
  showQuickFilters?: boolean; // Nouveau: filtres rapides
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  searchTerm,
  onSearchChange,
  selectedAgency,
  onAgencyChange,
  agencies,
  placeholder = "Rechercher une plaque d'immatriculation...",
  showFilters = false,
  onToggleFilters,
  activeFiltersCount = 0,
  advancedFilters = {},
  onAdvancedFiltersChange,
  showQuickFilters = true
}) => {
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(advancedFilters);

  const clearSearch = () => {
    onSearchChange('');
  };

  const clearAgency = () => {
    onAgencyChange('all');
  };

  const clearAllFilters = () => {
    onSearchChange('');
    onAgencyChange('all');
    const emptyFilters: AdvancedFilters = {
      status: 'all',
      completionType: 'all',
      hasPhotos: undefined,
      hasIssues: undefined
    };
    setLocalFilters(emptyFilters);
    onAdvancedFiltersChange?.(emptyFilters);
  };

  // ✅ Filtres rapides pour le workflow flexible
  const handleQuickFilter = (filterType: keyof AdvancedFilters, value: any) => {
    const newFilters = { ...localFilters, [filterType]: value };
    setLocalFilters(newFilters);
    onAdvancedFiltersChange?.(newFilters);
  };

  // ✅ Compter les filtres actifs (mis à jour)
  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedAgency !== 'all') count++;
    if (localFilters.status && localFilters.status !== 'all') count++;
    if (localFilters.completionType && localFilters.completionType !== 'all') count++;
    if (localFilters.hasPhotos !== undefined) count++;
    if (localFilters.hasIssues !== undefined) count++;
    return count;
  };

  const totalActiveFilters = getActiveFiltersCount();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Première ligne: Recherche + Agence + Filtres */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Barre de recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Sélecteur d'agence */}
            <div className="w-full sm:w-48">
              <AgencySelector
                agencies={agencies}
                value={selectedAgency}
                onChange={onAgencyChange}
                placeholder="Toutes les agences"
                showAllOption={true}
              />
            </div>

            {/* Bouton filtres avancés */}
            {onToggleFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={onToggleFilters}
                className="relative"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtres
                {totalActiveFilters > 0 && (
                  <Badge className="ml-2 px-1 py-0 text-xs bg-blue-500">
                    {totalActiveFilters}
                  </Badge>
                )}
              </Button>
            )}
          </div>

          {/* ✅ Filtres rapides pour le workflow flexible */}
          {showQuickFilters && (
            <div className="flex flex-wrap gap-2">
              <div className="text-sm font-medium text-gray-600 flex items-center">
                Filtres rapides:
              </div>
              
              {/* Statut */}
              <Button
                type="button"
                variant={localFilters.status === 'in_progress' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter('status', 
                  localFilters.status === 'in_progress' ? 'all' : 'in_progress'
                )}
                className="gap-1"
              >
                <Clock className="w-3 h-3" />
                En cours
              </Button>

              <Button
                type="button"
                variant={localFilters.status === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter('status', 
                  localFilters.status === 'completed' ? 'all' : 'completed'
                )}
                className="gap-1"
              >
                <CheckCircle className="w-3 h-3" />
                Terminé
              </Button>

              {/* Type de completion */}
              <Button
                type="button"
                variant={localFilters.completionType === 'partial' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter('completionType', 
                  localFilters.completionType === 'partial' ? 'all' : 'partial'
                )}
                className="gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                Partielle
              </Button>

              {/* Avec photos */}
              <Button
                type="button"
                variant={localFilters.hasPhotos === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter('hasPhotos', 
                  localFilters.hasPhotos === true ? undefined : true
                )}
                className="gap-1"
              >
                <Camera className="w-3 h-3" />
                Avec photos
              </Button>

              {/* Avec incidents */}
              <Button
                type="button"
                variant={localFilters.hasIssues === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter('hasIssues', 
                  localFilters.hasIssues === true ? undefined : true
                )}
                className="gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                Incidents
              </Button>

              {/* Effacer tout */}
              {totalActiveFilters > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="gap-1 text-red-600 hover:text-red-700"
                >
                  <X className="w-3 h-3" />
                  Effacer tout
                </Button>
              )}
            </div>
          )}

          {/* ✅ Filtres actifs avec plus de détails */}
          {totalActiveFilters > 0 && (
            <div className="flex flex-wrap gap-2">
              <div className="text-xs font-medium text-gray-500">
                Filtres actifs:
              </div>
              
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  <Search className="w-3 h-3" />
                  "{searchTerm}"
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="p-0 h-auto"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}

              {selectedAgency !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  📍 {agencies.find(a => a.id === selectedAgency)?.name}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAgency}
                    className="p-0 h-auto"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}

              {localFilters.status && localFilters.status !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {localFilters.status === 'in_progress' && <Clock className="w-3 h-3" />}
                  {localFilters.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                  {localFilters.status === 'in_progress' ? 'En cours' : 'Terminé'}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickFilter('status', 'all')}
                    className="p-0 h-auto"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}

              {localFilters.completionType && localFilters.completionType !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {localFilters.completionType === 'partial' ? 'Partielle' : 'Complète'}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickFilter('completionType', 'all')}
                    className="p-0 h-auto"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}

              {localFilters.hasPhotos === true && (
                <Badge variant="secondary" className="gap-1">
                  <Camera className="w-3 h-3" />
                  Avec photos
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickFilter('hasPhotos', undefined)}
                    className="p-0 h-auto"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}

              {localFilters.hasIssues === true && (
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Avec incidents
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickFilter('hasIssues', undefined)}
                    className="p-0 h-auto"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};