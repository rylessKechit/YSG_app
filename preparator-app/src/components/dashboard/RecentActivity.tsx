'use client';

import { useEffect, useState } from 'react';
import { Activity, Clock, Car, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePreparationStore } from '@/lib/stores';
import { formatTime, formatWorkTime } from '@/lib/utils';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { Preparation } from '@/lib/types';

export function RecentActivity() {
  // ✅ CORRECTION: Utilisez les propriétés existantes du store
  const { 
    // currentPreparation, // Pas besoin pour l'historique
    isLoading,
    error
  } = usePreparationStore();
  
  // ✅ État local pour l'historique récent
  const [history, setHistory] = useState<Preparation[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // ✅ CORRECTION: Fonction simulée en attendant l'API d'historique
  const loadRecentHistory = async () => {
    try {
      // TODO: Remplacer par l'appel API réel quand disponible
      // const historyData = await preparationApi.getHistory({ limit: 5 });
      
      // ✅ Simulation temporaire de données d'historique
      const mockHistory: Preparation[] = [
        // Vous pouvez remplacer par de vraies données ou vider le tableau
      ];
      
      setHistory(mockHistory);
      setLastUpdate(new Date());
      console.log('✅ Historique récent chargé (simulation)');
    } catch (error) {
      console.error('❌ Erreur chargement historique:', error);
      setHistory([]);
    }
  };

  // Charger l'historique récent au montage
  useEffect(() => {
    loadRecentHistory();
  }, []);

  // Mise à jour automatique toutes les 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadRecentHistory();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Activité récente</span>
          </div>
          <span className="text-xs text-gray-500">
            Mise à jour: {formatTime(lastUpdate)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner text="Chargement de l'activité..." />
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucune activité récente</p>
            <p className="text-sm">Commencez une préparation pour voir l'historique</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((preparation: Preparation) => (
              <div 
                key={preparation.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                {/* Icône de statut */}
                <div className={`p-2 rounded-full ${
                  preparation.status === 'completed' 
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {preparation.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                </div>

                {/* Informations véhicule */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {preparation.vehicle.licensePlate}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {preparation.vehicle.brand} {preparation.vehicle.model}
                  </p>
                  <p className="text-xs text-gray-500">
                    {preparation.agency.name}
                  </p>
                </div>

                {/* Temps et durée */}
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {preparation.totalTime ? formatWorkTime(preparation.totalTime) : 'En cours'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {preparation.endTime ? 
                      formatTime(preparation.endTime) : 
                      formatTime(preparation.startTime)
                    }
                  </p>
                  {preparation.isOnTime !== undefined && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      preparation.isOnTime 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {preparation.isOnTime ? '⏰ À temps' : '⚠️ Retard'}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Lien vers l'historique complet */}
            <div className="text-center pt-2">
              <button 
                onClick={() => {/* TODO: Navigation vers historique complet */}}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Voir tout l'historique →
              </button>
            </div>
          </div>
        )}

        {/* Gestion des erreurs */}
        {error && (
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-2">
              Erreur de chargement: {error}
            </p>
            <button 
              onClick={loadRecentHistory}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Réessayer
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}