// ✅ Page History optimisée - SEARCH TRIGGER ONLY + NO AUTO REFRESH

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  RefreshCw,
  X,
  Loader2,
  Calendar
} from 'lucide-react';

import { usePreparationHistory } from '@/hooks/usePreparationHistory';
import { usePreparationStore } from '@/lib/stores/preparation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { PreparationCard } from '@/components/preparations/PreparationCard';
import { BottomNavigation } from '@/components/layout/BottomNavigation';

export default function PreparationHistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // ✅ États locaux pour les filtres - PAS DE DEBOUNCE AUTO
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Hooks
  const { userAgencies, getUserAgencies } = usePreparationStore();
  const {
    preparations,
    pagination,
    isLoading,
    error,
    loadHistory,
    loadMore,
    refresh,
    setFilters,
    applyFiltersAndLoad, // ✅ Nouvelle méthode du hook
    hasMore,
    isEmpty,
    total,
    clearError
  } = usePreparationHistory({
    autoLoad: true, // ✅ Charge au montage une seule fois
    limit: 50
  });

  // Charger les agences au montage
  useEffect(() => {
    const loadAgencies = async () => {
      try {
        await getUserAgencies();
      } catch (error) {
        console.error('Erreur chargement agences:', error);
      }
    };

    loadAgencies();
  }, [getUserAgencies]);

  // ✅ SUPPRIMÉ: useEffect avec debounce automatique
  // Maintenant on applique les filtres seulement quand l'utilisateur trigger

  // ===== GESTIONNAIRES D'ÉVÉNEMENTS =====

  const handleBack = () => {
    router.push('/preparations');
  };

  const handleRefresh = async () => {
    try {
      await refresh();
      toast({
        title: "Actualisé",
        description: "L'historique du jour a été actualisé avec succès."
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'actualiser l'historique.",
        variant: "destructive"
      });
    }
  };

  // ✅ NOUVEAU: Gestionnaire pour le search - TRIGGER MANUAL
  const handleSearchSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Search triggered:', { searchTerm, selectedAgency });
    
    try {
      await applyFiltersAndLoad({
        search: searchTerm.trim() || undefined,
        agencyId: selectedAgency === 'all' ? undefined : selectedAgency,
        page: 1
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la recherche.",
        variant: "destructive"
      });
    }
  }, [searchTerm, selectedAgency, applyFiltersAndLoad, toast]);

  // ✅ NOUVEAU: Clear search
  const handleClearSearch = useCallback(async () => {
    setSearchTerm('');
    setSelectedAgency('all');
    
    try {
      await applyFiltersAndLoad({
        search: undefined,
        agencyId: undefined,
        page: 1
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du reset des filtres.",
        variant: "destructive"
      });
    }
  }, [applyFiltersAndLoad, toast]);

  // ✅ NOUVEAU: Gestionnaire pour changement d'agence - TRIGGER MANUAL
  const handleAgencyChange = useCallback(async (agencyId: string) => {
    setSelectedAgency(agencyId);
    
    try {
      await applyFiltersAndLoad({
        search: searchTerm.trim() || undefined,
        agencyId: agencyId === 'all' ? undefined : agencyId,
        page: 1
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du changement d'agence.",
        variant: "destructive"
      });
    }
  }, [searchTerm, applyFiltersAndLoad, toast]);

  // Afficher les erreurs
  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur",
        description: error,
        variant: "destructive"
      });
      clearError();
    }
  }, [error, toast, clearError]);

  // ===== RENDU =====

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Historique
                </h1>
                <p className="text-sm text-gray-600 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date().toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* ✅ Filtres - FORM AVEC SUBMIT */}
        {showFilters && (
          <div className="px-4 pb-3 border-t border-gray-100">
            <form onSubmit={handleSearchSubmit} className="space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Rechercher par plaque, marque, modèle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Agency filter */}
              <Select
                value={selectedAgency}
                onValueChange={handleAgencyChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les agences" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les agences</SelectItem>
                  {userAgencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name} ({agency.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Actions */}
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearSearch}
                >
                  Effacer
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Rechercher
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {/* Stats */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
                <p className="text-sm text-gray-600">préparations aujourd'hui</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Page {pagination.page}</p>
                <p className="text-xs text-gray-500">sur {pagination.totalPages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error state */}
        {error && (
          <Card className="mb-4 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center text-red-600">
                <X className="w-5 h-5 mr-2" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && preparations.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-gray-600">Chargement de l'historique...</span>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && !isLoading && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune préparation aujourd'hui
              </h3>
              <p className="text-gray-600">
                Aucune préparation trouvée pour les critères sélectionnés.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Preparations list */}
        {preparations.length > 0 && (
          <div className="space-y-3 pb-20">
            {preparations.map((preparation) => (
              <div 
                key={preparation.id}
                onClick={() => router.push(`/preparations/${preparation.id}/view`)}
                className="cursor-pointer"
              >
                <PreparationCard
                  preparation={preparation}
                  showViewButton={false}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ Navigation Bottom */}
      <BottomNavigation />
    </div>
  );
}