// app/(dashboard)/preparations/history/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  RefreshCw,
  X,
  Loader2
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

export default function PreparationHistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // États locaux pour les filtres
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
    hasMore,
    isEmpty,
    total,
    clearError
  } = usePreparationHistory({
    autoLoad: true,
    limit: 10
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

  // Appliquer les filtres avec debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters({
        search: searchTerm || undefined,
        agencyId: selectedAgency === 'all' ? undefined : selectedAgency,
        page: 1
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedAgency, setFilters]);

  // Gestionnaires d'événements
  const handleBack = () => {
    router.push('/preparations');
  };

  const handleRefresh = async () => {
    try {
      await refresh();
      toast({
        title: "Actualisé",
        description: "L'historique a été actualisé avec succès."
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'actualiser l'historique.",
        variant: "destructive"
      });
    }
  };

  const handleLoadMore = async () => {
    if (hasMore && !isLoading) {
      try {
        await loadMore();
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger plus de résultats.",
          variant: "destructive"
        });
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedAgency('all');
    setShowFilters(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header mobile */}
      <div className="header-mobile bg-white">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="p-2 -ml-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-gray-900">Historique</h1>
          <p className="text-sm text-gray-500">{total} préparation{total > 1 ? 's' : ''}</p>
        </div>
        <Button
          variant="ghost"
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2 -mr-2"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Contenu principal */}
      <div className="px-4 py-6 space-y-4" style={{ 
        paddingTop: 'calc(4rem + env(safe-area-inset-top) + 1.5rem)',
        paddingBottom: 'calc(4rem + env(safe-area-inset-bottom) + 1.5rem)',
        minHeight: '100vh'
      }}>
        {/* Barre de recherche */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher par plaque, marque, modèle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Filtres */}
          <div className="flex items-center space-x-2">
            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Toutes les agences" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les agences</SelectItem>
                {userAgencies.map(agency => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Bouton effacer filtres */}
          {(searchTerm || selectedAgency !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="w-full text-gray-600"
            >
              <X className="h-4 w-4 mr-2" />
              Effacer les filtres
            </Button>
          )}
        </div>

        {/* Messages d'erreur */}
        {error && (
          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-600">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state initial */}
        {isLoading && preparations.length === 0 && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-gray-600">Chargement de l'historique...</p>
          </div>
        )}

        {/* État vide */}
        {isEmpty && !isLoading && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 mb-3">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">
                Aucune préparation trouvée
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {searchTerm || selectedAgency !== 'all' 
                  ? 'Essayez de modifier vos critères de recherche' 
                  : 'Vous n\'avez pas encore de préparations dans votre historique'
                }
              </p>
              {(searchTerm || selectedAgency !== 'all') && (
                <Button variant="outline" onClick={clearFilters}>
                  Effacer les filtres
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Liste des préparations */}
        {preparations.length > 0 && (
          <div className="space-y-3">
            {preparations.map((preparation) => (
              <PreparationCard
                key={preparation.id}
                preparation={preparation}
                showViewButton={true}
              />
            ))}
          </div>
        )}

        {/* Bouton charger plus */}
        {hasMore && (
          <div className="text-center pt-4">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                `Charger plus (${total - preparations.length} restantes)`
              )}
            </Button>
          </div>
        )}

        {/* Fin de liste */}
        {!hasMore && preparations.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              Vous avez vu toutes les préparations
            </p>
          </div>
        )}
      </div>
    </div>
  );
}