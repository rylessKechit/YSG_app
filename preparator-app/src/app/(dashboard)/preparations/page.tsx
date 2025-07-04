// app/(dashboard)/preparations/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Car, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePreparationStore } from '@/lib/stores/preparation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PreparationsPage = () => {
  const router = useRouter();
  const {
    currentPreparation,
    history,
    userAgencies,
    isLoading,
    error,
    getCurrentPreparation,
    getHistory,
    getUserAgencies,
    clearError
  } = usePreparationStore();

  // États locaux pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('all');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Charger les données initiales
    const loadData = async () => {
      try {
        await Promise.all([
          getCurrentPreparation(),
          getHistory(),
          getUserAgencies()
        ]);
      } catch (error) {
        console.error('Erreur chargement préparations:', error);
      }
    };

    loadData();
  }, []);

  // Filtrer les préparations
  const filteredPreparations = history.filter(prep => {
    const matchesSearch = prep.vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prep.vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgency = selectedAgency === 'all' || prep.agency.id === selectedAgency;
    return matchesSearch && matchesAgency;
  });

  // Calculer les statistiques rapides
  const quickStats = {
    totalToday: history.filter(p => {
      const today = new Date().toDateString();
      return new Date(p.startTime).toDateString() === today;
    }).length,
    currentInProgress: currentPreparation ? 1 : 0,
    averageTime: history.length > 0 ? 
      Math.round(history.reduce((sum, p) => sum + (p.totalMinutes || 0), 0) / history.length) : 0,
    onTimeRate: history.length > 0 ? 
      Math.round((history.filter(p => p.isOnTime).length / history.length) * 100) : 0
  };

  const getStatusBadge = (status: string, isOnTime?: boolean) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant={isOnTime ? 'default' : 'secondary'} className="gap-1">
            <CheckCircle className="w-3 h-3" />
            {isOnTime ? 'Terminé' : 'Terminé (retard)'}
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            En cours
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Annulé
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800">Erreur: {error}</p>
            <Button onClick={clearError} className="mt-2">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header avec action principale */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Préparations</h1>
        <Button 
          onClick={() => router.push('/preparations/new')}
          disabled={!!currentPreparation}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Préparation
        </Button>
      </div>

      {/* Préparation en cours */}
      {currentPreparation && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
              <Car className="w-5 h-5" />
              Préparation en cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-blue-900">
                    {currentPreparation.vehicle.licensePlate}
                  </p>
                  <p className="text-sm text-blue-700">
                    {currentPreparation.vehicle.brand} {currentPreparation.vehicle.model}
                  </p>
                  <p className="text-xs text-blue-600">
                    {currentPreparation.agency.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-900">
                    {Math.round(currentPreparation.progress)}%
                  </p>
                  <p className="text-sm text-blue-700">
                    {formatDuration(currentPreparation.currentDuration)}
                  </p>
                </div>
              </div>
              
              {/* Barre de progression */}
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${currentPreparation.progress}%` }}
                />
              </div>
              
              <Button 
                onClick={() => router.push(`/preparations/${currentPreparation.id}`)}
                className="w-full"
              >
                Continuer la préparation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{quickStats.totalToday}</div>
            <p className="text-sm text-gray-600">Aujourd'hui</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{quickStats.currentInProgress}</div>
            <p className="text-sm text-gray-600">En cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{quickStats.averageTime}m</div>
            <p className="text-sm text-gray-600">Temps moyen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{quickStats.onTimeRate}%</div>
            <p className="text-sm text-gray-600">Ponctualité</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher par plaque ou marque..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger>
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des préparations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Historique ({filteredPreparations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : filteredPreparations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Car className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune préparation trouvée</p>
              {!currentPreparation && (
                <Button 
                  onClick={() => router.push('/preparations/new')}
                  className="mt-4"
                  variant="outline"
                >
                  Démarrer votre première préparation
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {filteredPreparations.map((preparation) => (
                  <div
                    key={preparation.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/preparations/${preparation.id}`)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Car className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {preparation.vehicle.licensePlate}
                        </p>
                        <p className="text-sm text-gray-600">
                          {preparation.vehicle.brand} {preparation.vehicle.model}
                        </p>
                        <p className="text-xs text-gray-500">
                          {preparation.agency.name} • {new Date(preparation.startTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      {getStatusBadge(preparation.status, preparation.isOnTime)}
                      <p className="text-sm text-gray-600">
                        {formatDuration(preparation.totalMinutes ?? 0)}
                      </p>
                      {preparation.issuesCount > 0 && (
                        <p className="text-xs text-red-600">
                          {preparation.issuesCount} incident{preparation.issuesCount > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PreparationsPage;