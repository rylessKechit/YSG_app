// admin-app/src/components/dashboard/dashboard-filters.tsx
'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Filter, RefreshCw, Download } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import { DashboardFilters as FilterType } from '@/types/dashboard';

interface DashboardFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  availableAgencies?: Array<{ id: string; name: string }>;
  isRefreshing?: boolean;
  className?: string;
}

// Types pour les périodes - CORRIGÉ
type PeriodValue = 'today' | 'week' | 'month' | 'quarter' | 'custom';

// Présets de périodes - CORRIGÉ
const periodPresets: Array<{ value: PeriodValue; label: string; days: number | null }> = [
  { value: 'today', label: "Aujourd'hui", days: 0 },
  { value: 'week', label: 'Cette semaine', days: 7 },
  { value: 'month', label: 'Ce mois', days: 30 },
  { value: 'quarter', label: 'Ce trimestre', days: 90 },
  { value: 'custom', label: 'Personnalisé', days: null }
];

export function DashboardFilters({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  availableAgencies = [],
  isRefreshing = false,
  className = ""
}: DashboardFiltersProps) {
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAgencyFilterOpen, setIsAgencyFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Synchronisation avec les filtres externes
  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      setDateRange({
        from: new Date(filters.startDate),
        to: new Date(filters.endDate)
      });
    } else {
      setDateRange(undefined);
    }
  }, [filters.startDate, filters.endDate]);

  // Gestion du changement de période - CORRIGÉ
  const handlePeriodChange = (period: string) => {
    const today = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (period !== 'custom') {
      switch (period) {
        case 'today':
          startDate = format(today, 'yyyy-MM-dd');
          endDate = format(today, 'yyyy-MM-dd');
          break;
        case 'week':
          startDate = format(startOfWeek(today, { locale: fr }), 'yyyy-MM-dd');
          endDate = format(endOfWeek(today, { locale: fr }), 'yyyy-MM-dd');
          break;
        case 'month':
          startDate = format(startOfMonth(today), 'yyyy-MM-dd');
          endDate = format(endOfMonth(today), 'yyyy-MM-dd');
          break;
        case 'quarter':
          const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
          const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
          startDate = format(quarterStart, 'yyyy-MM-dd');
          endDate = format(quarterEnd, 'yyyy-MM-dd');
          break;
      }
    }

    // Cast correct pour éviter l'erreur TypeScript - CORRIGÉ
    onFiltersChange({
      ...filters,
      period: period as FilterType['period'],
      startDate,
      endDate
    });
  };

  // Gestion du changement de dates personnalisées - CORRIGÉ
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    
    if (range?.from && range?.to) {
      onFiltersChange({
        ...filters,
        period: 'custom' as FilterType['period'], // Cast correct
        startDate: format(range.from, 'yyyy-MM-dd'),
        endDate: format(range.to, 'yyyy-MM-dd')
      });
    }
  };

  // Gestion du changement d'agences
  const handleAgencyToggle = (agencyId: string, checked: boolean) => {
    const currentAgencies = filters.agencies || [];
    let newAgencies: string[];
    
    if (checked) {
      newAgencies = [...currentAgencies, agencyId];
    } else {
      newAgencies = currentAgencies.filter(id => id !== agencyId);
    }
    
    onFiltersChange({
      ...filters,
      agencies: newAgencies
    });
  };

  // Réinitialisation des filtres - CORRIGÉ
  const handleResetFilters = () => {
    setDateRange(undefined);
    onFiltersChange({
      period: 'today' as FilterType['period'] // Cast correct
    });
  };

  // Formatage de l'affichage de la période - CORRIGÉ
  const getDisplayPeriod = (): string => {
    if (filters.period === 'custom' && filters.startDate && filters.endDate) {
      const start = format(new Date(filters.startDate), 'dd MMM', { locale: fr });
      const end = format(new Date(filters.endDate), 'dd MMM yyyy', { locale: fr });
      return `${start} - ${end}`;
    }
    
    const preset = periodPresets.find(p => p.value === filters.period);
    return preset?.label || 'Période inconnue';
  };

  // Compte des filtres actifs
  const activeFiltersCount = () => {
    let count = 0;
    if (filters.agencies && filters.agencies.length > 0) count++;
    if (filters.period === 'custom') count++;
    return count;
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Sélecteur de période - CORRIGÉ */}
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-4 w-4 text-gray-500" />
            <Select
              value={filters.period || 'today'}
              onValueChange={handlePeriodChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodPresets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sélecteur de dates personnalisées */}
          {filters.period === 'custom' && (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'dd MMM', { locale: fr })} -{' '}
                        {format(dateRange.to, 'dd MMM yyyy', { locale: fr })}
                      </>
                    ) : (
                      format(dateRange.from, 'dd MMM yyyy', { locale: fr })
                    )
                  ) : (
                    <span>Sélectionner une période</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Filtre par agences */}
          {availableAgencies.length > 0 && (
            <Popover open={isAgencyFilterOpen} onOpenChange={setIsAgencyFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  Agences
                  {filters.agencies && filters.agencies.length > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {filters.agencies.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <div className="space-y-4">
                  <div className="font-medium text-sm">Filtrer par agences</div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableAgencies.map((agency) => (
                      <div key={agency.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`agency-${agency.id}`}
                          checked={filters.agencies?.includes(agency.id) || false}
                          onCheckedChange={(checked) => 
                            handleAgencyToggle(agency.id, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={`agency-${agency.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {agency.name}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {/* Actions du filtre agences */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFiltersChange({ ...filters, agencies: [] })}
                      className="text-xs"
                    >
                      Tout désélectionner
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFiltersChange({ 
                        ...filters, 
                        agencies: availableAgencies.map(a => a.id) 
                      })}
                      className="text-xs"
                    >
                      Tout sélectionner
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Affichage de la période sélectionnée */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Période:</span>
            <Badge variant="outline">{getDisplayPeriod()}</Badge>
          </div>

          {/* Indicateur de filtres actifs */}
          {activeFiltersCount() > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount()} filtre{activeFiltersCount() > 1 ? 's' : ''} actif{activeFiltersCount() > 1 ? 's' : ''}
            </Badge>
          )}

          {/* Spacer pour pousser les actions à droite */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Bouton de réinitialisation */}
            {(filters.period !== 'today' || (filters.agencies && filters.agencies.length > 0)) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs"
              >
                Réinitialiser
              </Button>
            )}

            {/* Bouton d'actualisation */}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="min-w-[100px]"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Actualisation...' : 'Actualiser'}
              </Button>
            )}

            {/* Bouton d'export */}
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="min-w-[90px]"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            )}
          </div>
        </div>

        {/* Résumé des filtres appliqués */}
        {(filters.agencies && filters.agencies.length > 0) && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">Agences sélectionnées:</span>
              {filters.agencies.map(agencyId => {
                const agency = availableAgencies.find(a => a.id === agencyId);
                return agency ? (
                  <Badge 
                    key={agencyId} 
                    variant="secondary" 
                    className="text-xs"
                  >
                    {agency.name}
                    <button
                      onClick={() => handleAgencyToggle(agencyId, false)}
                      className="ml-1 hover:text-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}