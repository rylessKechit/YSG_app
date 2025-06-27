'use client';

import { useEffect, useState } from 'react';
import { Activity, Clock, Car, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePreparationStore } from '@/lib/stores';
import { formatTime, formatWorkTime } from '@/lib/utils';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';

export function RecentActivity() {
  const { getHistory, history, isLoading } = usePreparationStore();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Charger l'historique récent (5 dernières préparations)
  useEffect(() => {
    getHistory({ limit: 5 });
  }, [getHistory]);

  // Mise à jour automatique toutes les 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      getHistory({ limit: 5 });
      setLastUpdate(new Date());
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [getHistory]);

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
            {history.map((preparation) => (
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

                {/* Informations */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">
                      {preparation.vehicle.licensePlate}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatTime(preparation.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      {preparation.vehicle.brand} {preparation.vehicle.model}
                    </span>
                    {preparation.totalMinutes && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatWorkTime(preparation.totalMinutes)}</span>
                        {preparation.isOnTime && (
                          <span className="text-green-600">✓</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Lien vers l'historique complet */}
            <div className="text-center pt-2">
              <button className="text-blue-600 text-sm hover:underline">
                Voir tout l'historique →
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}