// preparator-app/src/app/(dashboard)/preparations/history/page.tsx
// ✅ Page d'historique complète avec tous les correctifs

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Download, 
  Clock,
  Car,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building2,
  X,
  RefreshCw
} from 'lucide-react';

import { usePreparationHistory } from '@/hooks/usePreparationHistory';
import { usePreparationStore } from '@/lib/stores/preparation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import type { Preparation, Agency } from '@/lib/types';

// ===== COMPOSANT CARTE PRÉPARATION =====

interface PreparationCardProps {
  preparation: Preparation;
}

const PreparationCard: React.FC<PreparationCardProps> = ({ preparation }) => {
  const router = useRouter();

  // ✅ Calcul correct du statut retard basé sur la durée totale
  const getStatusInfo = () => {
    const totalMinutes = preparation.totalTime || preparation.currentDuration || 0;
    const isLate = totalMinutes > 30; // Plus de 30 minutes = retard
    
    if (preparation.status === 'completed') {
      return {
        label: isLate ? 'Terminé en retard' : 'Terminé à temps',
        variant: isLate ? 'destructive' : 'default',
        bgColor: isLate ? 'bg-orange-50' : 'bg-green-50',
        textColor: isLate ? 'text-orange-600' : 'text-green-600'
      };
    } else if (preparation.status === 'cancelled') {
      return {
        label: 'Annulé',
        variant: 'secondary',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-600'
      };
    }
    
    return {
      label: 'En cours',
      variant: 'default',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    };
  };

  // ✅ Formatage correct de la durée
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`;
  };

  // ✅ Formatage des dates
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const statusInfo = getStatusInfo();
  const completedSteps = preparation.steps.filter(step => step.completed).length;
  const totalSteps = preparation.steps.length;
  const duration = preparation.totalTime || preparation.currentDuration || 0;

  const handleCardClick = () => {
    router.push(`/preparations/${preparation.id}`);
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Header avec plaque et statut */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg">
              {preparation.vehicle.licensePlate}
            </h3>
            <div className="flex items-center text-gray-600 text-sm mt-1">
              <Car className="w-4 h-4 mr-1" />
              {preparation.vehicle.brand} {preparation.vehicle.model}
            </div>
          </div>
          
          <Badge 
            variant={statusInfo.variant as any}
            className={`${statusInfo.bgColor} ${statusInfo.textColor} border-0`}
          >
            {statusInfo.label}
          </Badge>
        </div>

        {/* Agence */}
        <div className="flex items-center text-gray-600 text-sm mb-3">
          <Building2 className="w-4 h-4 mr-1" />
          {preparation.agency.name}
        </div>

        {/* Dates et durée */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            {formatDateTime(preparation.startTime)}
            {preparation.endTime && (
              <>
                <span className="mx-2">→</span>
                {formatDateTime(preparation.endTime)}
              </>
            )}
          </div>
        </div>

        {/* Progression et durée */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {completedSteps}/{totalSteps} étapes
          </div>
          
          <div className="flex items-center text-sm">
            <Clock className="w-4 h-4 mr-1 text-gray-400" />
            {formatDuration(duration)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ===== COMPOSANT PRINCIPAL =====

const PreparationHistoryPage: React.FC = () => {
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
    router.back();
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

  const clearSearch = () => {
    setSearchTerm('');
  };

  const clearAgencyFilter = () => {
    setSelectedAgency('all');
  };

  // Nettoyage des erreurs
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // ✅ Calcul du nombre total de préparations
  const preparationCount = total || preparations.length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
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
                <h1 className="text-xl font-semibold">Historique</h1>
                {/* ✅ Affichage correct du nombre de préparations */}
                <p className="text-sm text-gray-600">
                  {preparationCount} préparation{preparationCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Filtres de recherche */}
      <div className="bg-white border-b p-4 space-y-3">
        {/* ✅ Barre de recherche fonctionnelle */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
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
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex space-x-3">
          {/* ✅ Sélecteur d'agence fonctionnel */}
          <Select
            value={selectedAgency}
            onValueChange={setSelectedAgency}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Toutes les agences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les agences</SelectItem>
              {userAgencies.map((agency: Agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="px-3"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Tags des filtres actifs */}
        {(searchTerm || selectedAgency !== 'all') && (
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <Badge variant="secondary" className="text-xs">
                Recherche: {searchTerm}
                <button onClick={clearSearch} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {selectedAgency !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Agence: {userAgencies.find(a => a.id === selectedAgency)?.name}
                <button onClick={clearAgencyFilter} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Contenu principal */}
      <main className="p-4">
        {/* État de chargement initial */}
        {isLoading && preparations.length === 0 && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">Chargement de l'historique...</p>
          </div>
        )}

        {/* État vide */}
        {isEmpty && !isLoading && (
          <Card>
            <CardContent className="text-center py-8">
              <Car className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="font-medium text-gray-900 mb-1">
                Aucune préparation trouvée
              </h3>
              <p className="text-gray-600 text-sm">
                {searchTerm || selectedAgency !== 'all' 
                  ? 'Aucun résultat pour vos critères de recherche.'
                  : 'Vous n\'avez pas encore effectué de préparations.'
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* Liste des préparations */}
        {!isEmpty && (
          <div className="space-y-3">
            {preparations.map((preparation) => (
              <PreparationCard 
                key={preparation.id} 
                preparation={preparation} 
              />
            ))}

            {/* Bouton charger plus */}
            {hasMore && (
              <div className="text-center pt-4">
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    'Charger plus'
                  )}
                </Button>
              </div>
            )}

            {/* Info pagination */}
            {!hasMore && preparations.length > 0 && (
              <p className="text-center text-gray-500 text-sm py-4">
                Toutes les préparations ont été chargées
              </p>
            )}
          </div>
        )}

        {/* Gestion des erreurs */}
        {error && (
          <Card className="mt-4 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <div>
                  <h4 className="font-medium text-red-800">Erreur</h4>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* ✅ Navigation Bottom */}
      <BottomNavigation />
    </div>
  );
};

export default PreparationHistoryPage;