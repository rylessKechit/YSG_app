// src/components/reports/report-filters.tsx
'use client&apos;;

import React, { useState, useEffect } from 'react';
import { CalendarIcon, Filter, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import { ReportFilters as ReportFiltersType, ReportPeriod, ReportType } from '@/types/reports';

interface ReportFiltersProps {
  filters: ReportFiltersType;
  onFiltersChange: (filters: ReportFiltersType) => void;
  onReset?: () => void;
  onApply?: () => void;
  isLoading?: boolean;
  availableAgencies?: Array<{ id: string; name: string; }>;
  availableUsers?: Array<{ id: string; name: string; agency: string; }>;
  showAdvanced?: boolean;
}

const PERIOD_OPTIONS = [
  { value: &apos;today&apos; as ReportPeriod, label: "Aujourd&apos;hui" },
  { value: &apos;week&apos; as ReportPeriod, label: &apos;Cette semaine&apos; },
  { value: &apos;month&apos; as ReportPeriod, label: &apos;Ce mois&apos; },
  { value: &apos;quarter&apos; as ReportPeriod, label: &apos;Ce trimestre&apos; },
  { value: &apos;year&apos; as ReportPeriod, label: &apos;Cette année&apos; },
  { value: &apos;custom&apos; as ReportPeriod, label: &apos;Période personnalisée&apos; },
];

const FORMAT_OPTIONS = [
  { value: &apos;json&apos;, label: &apos;JSON (Aperçu)' },
  { value: &apos;csv&apos;, label: &apos;CSV&apos; },
  { value: &apos;excel&apos;, label: &apos;Excel&apos; },
  { value: &apos;pdf&apos;, label: &apos;PDF&apos; },
];

export function ReportFilters({
  filters,
  onFiltersChange,
  onReset,
  onApply,
  isLoading = false,
  availableAgencies = [],
  availableUsers = [],
  showAdvanced = false
}: ReportFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [hasChanges, setHasChanges] = useState(false);

  // Synchroniser les dates avec les filtres
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

  // Détecter les changements
  useEffect(() => {
    setHasChanges(true);
  }, [filters]);

  const updateFilter = (key: keyof ReportFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const updateDateRange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onFiltersChange({
        ...filters,
        startDate: range.from.toISOString().split('T')[0],
        endDate: range.to.toISOString().split('T')[0],
        period: &apos;custom&apos;
      });
    } else {
      onFiltersChange({
        ...filters,
        startDate: undefined,
        endDate: undefined
      });
    }
  };

  const toggleAgency = (agencyId: string) => {
    const currentAgencies = filters.agencies || [];
    const newAgencies = currentAgencies.includes(agencyId)
      ? currentAgencies.filter(id => id !== agencyId)
      : [...currentAgencies, agencyId];
    
    updateFilter('agencies', newAgencies);
  };

  const toggleUser = (userId: string) => {
    const currentUsers = filters.users || [];
    const newUsers = currentUsers.includes(userId)
      ? currentUsers.filter(id => id !== userId)
      : [...currentUsers, userId];
    
    updateFilter('users', newUsers);
  };

  const handleReset = () => {
    const defaultFilters: ReportFiltersType = {
      period: &apos;month&apos;,
      format: &apos;json&apos;,
      includeDetails: false,
      includeComparison: false,
      includeGraphiques: false
    };
    onFiltersChange(defaultFilters);
    setDateRange(undefined);
    setHasChanges(false);
    onReset?.();
  };

  const handleApply = () => {
    setHasChanges(false);
    onApply?.();
  };

  const getSelectedAgencyNames = () => {
    if (!filters.agencies || filters.agencies.length === 0) return 'Toutes les agences&apos;;
    if (filters.agencies.length === availableAgencies.length) return 'Toutes les agences&apos;;
    
    const names = filters.agencies
      .map(id => availableAgencies.find(a => a.id === id)?.name)
      .filter(Boolean)
      .slice(0, 2);
    
    if (filters.agencies.length > 2) {
      return `${names.join(', ')} +${filters.agencies.length - 2}`;
    }
    return names.join(', ');
  };

  const getSelectedUserNames = () => {
    if (!filters.users || filters.users.length === 0) return 'Tous les utilisateurs&apos;;
    if (filters.users.length === availableUsers.length) return 'Tous les utilisateurs&apos;;
    
    const names = filters.users
      .map(id => availableUsers.find(u => u.id === id)?.name)
      .filter(Boolean)
      .slice(0, 2);
    
    if (filters.users.length > 2) {
      return `${names.join(', ')} +${filters.users.length - 2}`;
    }
    return names.join(', ');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres de Rapport
            </CardTitle>
            <CardDescription>
              Configurez les paramètres de votre rapport
            </CardDescription>
          </div>
          {hasChanges && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Modifications non appliquées
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtres de base */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Période */}
          <div className="space-y-2">
            <Label htmlFor="period">Période</Label>
            <Select 
              value={filters.period || 'month'} 
              onValueChange={(value: ReportPeriod) => updateFilter(&apos;period&apos;, value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates personnalisées */}
          {filters.period === &apos;custom&apos; && (
            <div className="space-y-2">
              <Label>Dates personnalisées</Label>
              <DateRangePicker 
                date={dateRange} 
                onDateChange={updateDateRange}
                placeholder="Sélectionner une période"
                className="w-full"
              />
            </div>
          )}

          {/* Format */}
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select 
              value={filters.format || 'json'} 
              onValueChange={(value) => updateFilter(&apos;format&apos;, value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions rapides */}
          <div className="space-y-2">
            <Label>Actions</Label>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button 
                size="sm" 
                onClick={handleApply}
                disabled={!hasChanges || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Filter className="h-4 w-4 mr-1" />
                )}
                Appliquer
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Sélection des agences */}
        <div className="space-y-3">
          <Label>Agences</Label>
          <div className="p-3 border rounded-lg bg-gray-50">
            <div className="text-sm text-muted-foreground mb-2">
              Sélectionnées: {getSelectedAgencyNames()}
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {availableAgencies.map(agency => (
                <div key={agency.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`agency-${agency.id}`}
                    checked={filters.agencies?.includes(agency.id) || false}
                    onCheckedChange={() => toggleAgency(agency.id)}
                  />
                  <Label 
                    htmlFor={`agency-${agency.id}`} 
                    className="text-sm cursor-pointer"
                  >
                    {agency.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sélection des utilisateurs (si mode avancé) */}
        {showAdvanced && availableUsers.length > 0 && (
          <div className="space-y-3">
            <Label>Utilisateurs</Label>
            <div className="p-3 border rounded-lg bg-gray-50">
              <div className="text-sm text-muted-foreground mb-2">
                Sélectionnés: {getSelectedUserNames()}
              </div>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {availableUsers.map(user => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={filters.users?.includes(user.id) || false}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <Label 
                      htmlFor={`user-${user.id}`} 
                      className="text-sm cursor-pointer"
                    >
                      {user.name}
                      <span className="text-muted-foreground ml-1">({user.agency})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Options d'inclusion */}
        <div className="space-y-3">
          <Label>Options d&apos;inclusion</Label>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeDetails"
                checked={filters.includeDetails || false}
                onCheckedChange={(checked) => updateFilter(&apos;includeDetails&apos;, checked)}
              />
              <Label htmlFor="includeDetails" className="text-sm cursor-pointer">
                Détails par utilisateur
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeComparison"
                checked={filters.includeComparison || false}
                onCheckedChange={(checked) => updateFilter(&apos;includeComparison&apos;, checked)}
              />
              <Label htmlFor="includeComparison" className="text-sm cursor-pointer">
                Comparaison période précédente
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeGraphiques"
                checked={filters.includeGraphiques || false}
                onCheckedChange={(checked) => updateFilter(&apos;includeGraphiques&apos;, checked)}
              />
              <Label htmlFor="includeGraphiques" className="text-sm cursor-pointer">
                Graphiques et visualisations
              </Label>
            </div>
          </div>
        </div>

        {/* Résumé des filtres actifs */}
        {(filters.agencies?.length || filters.users?.length || filters.period !== &apos;month&apos;) && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Filtres actifs</Label>
              <div className="flex flex-wrap gap-2">
                {filters.period && filters.period !== &apos;month&apos; && (
                  <Badge variant="secondary">
                    Période: {PERIOD_OPTIONS.find(p => p.value === filters.period)?.label}
                  </Badge>
                )}
                
                {filters.agencies && filters.agencies.length > 0 && (
                  <Badge variant="secondary">
                    {filters.agencies.length === availableAgencies.length 
                      ? &apos;Toutes les agences&apos; 
                      : `${filters.agencies.length} agence(s)`
                    }
                  </Badge>
                )}
                
                {filters.users && filters.users.length > 0 && (
                  <Badge variant="secondary">
                    {filters.users.length} utilisateur(s)
                  </Badge>
                )}
                
                {filters.includeDetails && (
                  <Badge variant="outline">Avec détails</Badge>
                )}
                
                {filters.includeComparison && (
                  <Badge variant="outline">Avec comparaison</Badge>
                )}
                
                {filters.includeGraphiques && (
                  <Badge variant="outline">Avec graphiques</Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}