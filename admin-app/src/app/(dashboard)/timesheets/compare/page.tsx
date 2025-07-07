// admin-app/src/app/(dashboard)/timesheets/compare/page.tsx - VERSION CORRIGÉE
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Users, Building, Download, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/common/loading-spinner';

// ✅ Import correct des hooks et types
import { useTimesheetComparison, useMissingTimesheets } from '@/hooks/use-timesheets';
import { ComparisonFilters } from '@/types/timesheet';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TimesheetsComparePage() {
  const router = useRouter();
  
  // Filtres par défaut - derniers 7 jours
  const [filters, setFilters] = useState<ComparisonFilters>({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    includeDetails: true,
    anomaliesOnly: false
  });

  // Data hooks
  const { 
    data: comparisonData, 
    isLoading: isLoadingComparison,
    error: comparisonError,
    refetch: refetchComparison
  } = useTimesheetComparison(filters);

  const { 
    data: missingData, 
    isLoading: isLoadingMissing 
  } = useMissingTimesheets(filters);

  // Handlers
  const handleBack = () => {
    router.push('/timesheets');
  };

  const handleFiltersChange = (newFilters: Partial<ComparisonFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleExport = () => {
    // TODO: Implémenter export CSV/Excel
    console.log('Export comparison data');
  };

  const handleRefresh = () => {
    refetchComparison();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux pointages
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vue Comparative</h1>
            <p className="text-gray-600 mt-1">
              Comparaison planning prévu vs pointages réels
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres de comparaison
          </CardTitle>
          <CardDescription>
            Sélectionnez la période et les critères pour la comparaison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Période */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFiltersChange({ startDate: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFiltersChange({ endDate: e.target.value })}
              />
            </div>

            {/* Agence */}
            <div className="space-y-2">
              <Label>Agence</Label>
              <Select
                value={filters.agencyId || 'all'}
                onValueChange={(value) => 
                  handleFiltersChange({ agencyId: value === 'all' ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les agences" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les agences</SelectItem>
                  {/* TODO: Charger dynamiquement les agences */}
                </SelectContent>
              </Select>
            </div>

            {/* Utilisateur */}
            <div className="space-y-2">
              <Label>Utilisateur</Label>
              <Select
                value={filters.userId || 'all'}
                onValueChange={(value) => 
                  handleFiltersChange({ userId: value === 'all' ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les utilisateurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  {/* TODO: Charger dynamiquement les utilisateurs */}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Options avancées */}
          <div className="flex items-center gap-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.includeDetails || false}
                onChange={(e) => handleFiltersChange({ includeDetails: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Inclure les détails</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.anomaliesOnly || false}
                onChange={(e) => handleFiltersChange({ anomaliesOnly: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Anomalies uniquement</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Résumé de la comparaison */}
      {comparisonData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{comparisonData.summary.total}</div>
              <p className="text-xs text-muted-foreground">Total comparaisons</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {comparisonData.summary.onTimeCount}
              </div>
              <p className="text-xs text-muted-foreground">À l'heure</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {comparisonData.summary.lateCount}
              </div>
              <p className="text-xs text-muted-foreground">En retard</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-600">
                {comparisonData.summary.missingCount}
              </div>
              <p className="text-xs text-muted-foreground">Manquants</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {comparisonData.summary.punctualityRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Ponctualité</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pointages manquants (si présents) */}
      {missingData && missingData.count > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">
              Pointages manquants ({missingData.count})
            </CardTitle>
            <CardDescription className="text-red-700">
              Ces plannings n'ont pas de pointage correspondant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {missingData.missingTimesheets.slice(0, 3).map((missing) => (
                <div key={missing.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium">
                      {missing.user.firstName} {missing.user.lastName}
                    </span>
                    <span className="text-gray-500 ml-2">
                      - {missing.agency.name}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(missing.date), 'dd/MM/yyyy', { locale: fr })} 
                    ({missing.startTime} - {missing.endTime})
                  </div>
                </div>
              ))}
              {missingData.count > 3 && (
                <p className="text-sm text-gray-600 text-center pt-2">
                  ... et {missingData.count - 3} autres
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ Table de comparaison simplifiée en attendant le composant */}
      <Card>
        <CardHeader>
          <CardTitle>Résultats de la comparaison</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingComparison ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="ml-2">Chargement de la comparaison...</span>
            </div>
          ) : comparisonError ? (
            <div className="text-center py-8 text-red-600">
              Erreur lors du chargement de la comparaison
            </div>
          ) : !comparisonData?.comparisons?.length ? (
            <div className="text-center py-8 text-gray-500">
              Aucune donnée de comparaison trouvée pour cette période
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {comparisonData.comparisons.length} comparaison(s) trouvée(s)
              </p>
              
              {/* Liste simplifiée des comparaisons */}
              <div className="space-y-2">
                {comparisonData.comparisons.slice(0, 10).map((comparison) => (
                  <div key={comparison.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {comparison.user.firstName} {comparison.user.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(comparison.date), 'dd/MM/yyyy', { locale: fr })} - {comparison.agency.name}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        comparison.analysis.status === 'on_time' ? 'bg-green-100 text-green-800' :
                        comparison.analysis.status === 'late' ? 'bg-red-100 text-red-800' :
                        comparison.analysis.status === 'missing' ? 'bg-gray-100 text-gray-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>`
                        {comparison.analysis.status === 'on_time' ? 'Ponctuel' :
                         comparison.analysis.status === 'late' ? 'En retard' :
                         comparison.analysis.status === 'missing' ? 'Manquant' :
                         'Autre'}
                      </span>
                    </div>
                  </div>
                ))}
                
                {comparisonData.comparisons.length > 10 && (
                  <p className="text-center text-sm text-gray-500 pt-4">
                    ... et {comparisonData.comparisons.length - 10} autres comparaisons
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}