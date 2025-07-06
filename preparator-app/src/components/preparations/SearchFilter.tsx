import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgencySelector } from './AgencySelector';
import { Agency } from '@/lib/api/preparations';

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
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  searchTerm,
  onSearchChange,
  selectedAgency,
  onAgencyChange,
  agencies,
  placeholder = "Rechercher...",
  showFilters = false,
  onToggleFilters,
  activeFiltersCount = 0
}) => {
  const clearSearch = () => {
    onSearchChange('');
  };

  const clearAgency = () => {
    onAgencyChange('all');
  };

  return (
    <Card>
      <CardContent className="p-4">
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
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 px-1 py-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          )}
        </div>

        {/* Filtres actifs */}
        {(searchTerm || selectedAgency !== 'all') && (
          <div className="flex flex-wrap gap-2 mt-3">
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Recherche: "{searchTerm}"
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
                Agence: {agencies.find(a => a.id === selectedAgency)?.name}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};