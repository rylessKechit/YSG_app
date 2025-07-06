// app/(dashboard)/preparations/history/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Car,
  Building,
  Calendar,
  Filter,
  Eye,
  MoreVertical,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';

// Types
interface HistoryPreparation {
  id: string;
  vehicle: {
    licensePlate: string;
    brand: string;
    model: string;
    color?: string;
  };
  agency: {
    name: string;
    code: string;
  };
  startTime: string;
  endTime?: string;
  totalTime?: number;
  status: 'completed' | 'cancelled';
  completedSteps: number;
  totalSteps: number;
  isOnTime: boolean;
}
import { Alert, AlertDescription } from '@/components/ui/alert';

// Hooks personnalisés
import { usePreparationHistory } from '@/hooks/usePreparationHistory';

const PreparationsHistoryPage: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  
  // État local pour les filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');

  // Hook pour les données d'historique
  const {
    preparations,
    pagination,
    isLoading,
    error,
    refresh,
    loadMore,
    hasMore
  } = usePreparationHistory({
    search: searchQuery,
    status: statusFilter,
    agencyId: agencyFilter,
    limit: 20
  });

  // Obtenir les agences uniques pour le filtre
  const uniqueAgencies = useMemo(() => {
    const agencies = new Map();
    preparations.forEach(prep => {
      if (prep.agency && !agencies.has(prep.agency.code)) {
        agencies.set(prep.agency.code, prep.agency);
      }
    });
    return Array.from(agencies.values());
  }, [preparations]);

  // Utilitaires
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string, isOnTime?: boolean) => {
    if (status === 'completed') {
      return (
        <Badge variant={isOnTime ? "default" : "secondary"} className={isOnTime ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
          <CheckCircle className="h-3 w-3 mr-1" />
          {isOnTime ? 'Terminé à temps' : 'Terminé en retard'}
        </Badge>
      );
    } else if (status === 'cancelled') {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          Annulé
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800">
          <Clock className="h-3 w-3 mr-1" />
          En cours
        </Badge>
      );
    }
  };

  const handleViewDetails = (preparationId: string) => {
    router.push(`/preparations/${preparationId}`);
  };

  const handleExportData = () => {
    toast({
      title: "Export en cours",
      description: "Vos données vont être téléchargées...",
    });
  };

  const handleRefresh = () => {
    refresh();
    toast({
      title: "Actualisation",
      description: "Données mises à jour",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Historique</h1>
            <p className="text-sm text-gray-600">
              {pagination ? `${pagination.total} préparation(s)` : 'Préparations terminées'}
            </p>
          </div>
        </div>
        
        {/* Bouton refresh */}
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Erreur */}
      {error && (
        <div className="px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button variant="link" onClick={handleRefresh} className="ml-2 p-0 h-auto">
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="p-4 space-y-4">
        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par plaque, marque, modèle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtres */}
        <div className="flex space-x-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as 'all' | 'completed' | 'cancelled')}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="completed">Terminées</SelectItem>
              <SelectItem value="cancelled">Annulées</SelectItem>
            </SelectContent>
          </Select>

          <Select value={agencyFilter} onValueChange={setAgencyFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Agence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les agences</SelectItem>
              {uniqueAgencies.map(agency => (
                <SelectItem key={agency.code} value={agency.code}>
                  {agency.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExportData} className="px-3">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Liste des préparations */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          // État de chargement
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : preparations.length === 0 ? (
          // Aucun résultat
          <Card className="text-center py-8">
            <CardContent>
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">Aucune préparation trouvée</h3>
              <p className="text-sm text-gray-600">
                {searchQuery || statusFilter !== 'all' || agencyFilter !== 'all'
                  ? 'Aucune préparation ne correspond à vos critères de recherche.'
                  : "Vous n'avez pas encore effectué de préparations."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          // Liste des préparations (VRAIES DONNÉES DU BACKEND)
          preparations.map((preparation) => (
            <Card key={preparation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {preparation.vehicle.licensePlate}
                      </h3>
                      {getStatusBadge(preparation.status, preparation.isOnTime)}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center space-x-1">
                        <Car className="h-3 w-3" />
                        <span>{preparation.vehicle.brand} {preparation.vehicle.model}</span>
                        {preparation.vehicle.color && (
                          <span className="text-gray-400">• {preparation.vehicle.color}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Building className="h-3 w-3" />
                        <span>{preparation.agency.name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(preparation.startTime)} à {formatTime(preparation.startTime)}</span>
                        {preparation.endTime && (
                          <span className="text-gray-400">
                            → {formatTime(preparation.endTime)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-1">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleViewDetails(preparation.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Voir détails
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Métadonnées */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                  <div className="flex items-center space-x-3">
                    <span>{preparation.steps?.filter(s => s.completed).length || 0}/{preparation.steps?.length || 6} étapes</span>
                    {preparation.totalTime && (
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(preparation.totalTime)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination ou chargement de plus */}
      {!isLoading && preparations.length > 0 && hasMore && (
        <div className="p-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Chargement...' : 'Charger plus'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PreparationsHistoryPage;