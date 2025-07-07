'use client&apos;;

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from &apos;@/components/ui/select&apos;;
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from &apos;@/components/ui/popover&apos;;
import {
  Filter,
  Search,
  Calendar,
  X,
  RotateCcw,
  Building,
  Users,
  Clock,
} from &apos;lucide-react&apos;;
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { TimesheetFilters as TimesheetFiltersType } from '@/types/timesheet';
import { User } from '@/types/auth';
import { Agency } from '@/types/agency';

interface TimesheetFiltersProps {
  filters: TimesheetFiltersType;
  onFiltersChange: (filters: TimesheetFiltersType) => void;
  users?: User[];
  agencies?: Agency[];
  isLoading?: boolean;
}

export function TimesheetFilters({
  filters,
  onFiltersChange,
  users = [],
  agencies = [],
  isLoading = false,
}: TimesheetFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof TimesheetFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
      page: 1, // Reset à la première page lors du changement de filtre
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      page: 1,
      limit: 20,
      status: &apos;all&apos;,
      sort: &apos;date&apos;,
      order: &apos;desc&apos;,
    });
  };

  const applyQuickFilter = (type: 'today' | 'week' | 'month' | 'late' | 'missing') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (type) {
      case &apos;today&apos;:
        updateFilter('startDate', today.toISOString().split('T')[0]);
        updateFilter('endDate', today.toISOString().split('T')[0]);
        break;

      case &apos;week&apos;:
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        updateFilter('startDate', monday.toISOString().split('T')[0]);
        updateFilter('endDate', sunday.toISOString().split('T')[0]);
        break;

      case &apos;month&apos;:
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        updateFilter('startDate', firstDay.toISOString().split('T')[0]);
        updateFilter('endDate', lastDay.toISOString().split('T')[0]);
        break;

      case &apos;late&apos;:
        updateFilter('sort', 'delays.startDelay');
        updateFilter('order', 'desc');
        break;

      case &apos;missing&apos;:
        updateFilter('status', 'incomplete');
        break;
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.userId) count++;
    if (filters.agencyId) count++;
    if (filters.status && filters.status !== &apos;all&apos;) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? &apos;Masquer&apos; : 'Avancés'}
            </Button>
            
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-red-600 hover:text-red-700"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filtres rapides */}
        <div>
          <label className="text-sm font-medium mb-2 block">Filtres rapides</label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter(&apos;today&apos;)}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Aujourd&apos;hui
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter(&apos;week&apos;)}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Cette semaine
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter(&apos;month&apos;)}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Ce mois
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter(&apos;late&apos;)}
            >
              <Clock className="h-4 w-4 mr-1" />
              Retards
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter(&apos;missing&apos;)}
            >
              <X className="h-4 w-4 mr-1" />
              Manquants
            </Button>
          </div>
        </div>

        {/* Filtres principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recherche */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Nom, email..."
                value={filters.search || ''}
                onChange={(e) => updateFilter(&apos;search&apos;, e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Statut */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Statut</label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => updateFilter(&apos;status&apos;, value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="incomplete">Incomplet</SelectItem>
                <SelectItem value="complete">Complet</SelectItem>
                <SelectItem value="validated">Validé</SelectItem>
                <SelectItem value="disputed">En litige</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date début */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date début</label>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => updateFilter(&apos;startDate&apos;, e.target.value)}
            />
          </div>

          {/* Date fin */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date fin</label>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => updateFilter(&apos;endDate&apos;, e.target.value)}
            />
          </div>
        </div>

        {/* Filtres avancés */}
        {showAdvanced && (
          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Employé */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Employé
                </label>
                <Select
                  value={filters.userId || ''}
                  onValueChange={(value) => updateFilter(&apos;userId&apos;, value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les employés" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les employés</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agence */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Agence
                </label>
                <Select
                  value={filters.agencyId || ''}
                  onValueChange={(value) => updateFilter(&apos;agencyId&apos;, value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les agences" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes les agences</SelectItem>
                    {agencies.map((agency) => (
                      <SelectItem key={agency.id} value={agency.id}>
                        {agency.name} ({agency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tri */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Trier par</label>
                <div className="flex gap-2">
                  <Select
                    value={filters.sort || 'date'}
                    onValueChange={(value) => updateFilter(&apos;sort&apos;, value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="user">Employé</SelectItem>
                      <SelectItem value="agency">Agence</SelectItem>
                      <SelectItem value="startTime">Heure début</SelectItem>
                      <SelectItem value="delays.startDelay">Retard</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={filters.order || 'desc'}
                    onValueChange={(value) => updateFilter(&apos;order&apos;, value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">↑ Asc</SelectItem>
                      <SelectItem value="desc">↓ Desc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtres actifs */}
        {activeFiltersCount > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Filtres actifs</h4>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  Recherche: {filters.search}
                  <button onClick={() => updateFilter(&apos;search&apos;, undefined)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              {filters.status && filters.status !== &apos;all&apos; && (
                <Badge variant="secondary" className="gap-1">
                  Statut: {filters.status}
                  <button onClick={() => updateFilter(&apos;status&apos;, 'all')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              {filters.startDate && (
                <Badge variant="secondary" className="gap-1">
                  Début: {format(new Date(filters.startDate), 'dd/MM/yyyy', { locale: fr })}
                  <button onClick={() => updateFilter(&apos;startDate&apos;, undefined)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              {filters.endDate && (
                <Badge variant="secondary" className="gap-1">
                  Fin: {format(new Date(filters.endDate), 'dd/MM/yyyy', { locale: fr })}
                  <button onClick={() => updateFilter(&apos;endDate&apos;, undefined)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              {filters.userId && (
                <Badge variant="secondary" className="gap-1">
                  Employé: {users.find(u => u.id === filters.userId)?.firstName}
                  <button onClick={() => updateFilter(&apos;userId&apos;, undefined)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              {filters.agencyId && (
                <Badge variant="secondary" className="gap-1">
                  Agence: {agencies.find(a => a.id === filters.agencyId)?.name}
                  <button onClick={() => updateFilter(&apos;agencyId&apos;, undefined)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}