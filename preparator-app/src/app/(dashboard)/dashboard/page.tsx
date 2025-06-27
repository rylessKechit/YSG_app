'use client';

import { useEffect, useState } from 'react';
import { Clock, Car, TrendingUp, Calendar, Play, Square } from 'lucide-react';
import { useAuthStore, useTimesheetStore, usePreparationStore } from '@/lib/stores';
import { TodayStatus } from '@/components/dashboard/TodayStatus';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { CurrentPreparation } from '@/components/dashboard/CurrentPreparation';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { formatWorkTime } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { todayStatus, getTodayStatus, isLoading: timesheetLoading } = useTimesheetStore();
  const { 
    currentPreparation, 
    userAgencies, 
    getUserAgencies, 
    getCurrentPreparation,
    isLoading: preparationLoading 
  } = usePreparationStore();

  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');

  // Chargement initial
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // Charger les agences d'abord
        await getUserAgencies();
        // Charger la préparation en cours
        await getCurrentPreparation();
      } catch (error) {
        console.error('Erreur chargement dashboard:', error);
      }
    };

    loadDashboard();
  }, [getUserAgencies, getCurrentPreparation]);

  // Charger le statut du jour quand une agence est sélectionnée
  useEffect(() => {
    if (selectedAgencyId) {
      getTodayStatus(selectedAgencyId);
    }
  }, [selectedAgencyId, getTodayStatus]);

  // Sélection de l'agence par défaut
  useEffect(() => {
    if (userAgencies.length > 0 && !selectedAgencyId) {
      const defaultAgency = userAgencies.find(a => a.isDefault) || userAgencies[0];
      setSelectedAgencyId(defaultAgency.id);
    }
  }, [userAgencies, selectedAgencyId]);

  const isLoading = timesheetLoading || preparationLoading;

  // Calculer les statistiques rapides
  const currentWorkedTime = todayStatus?.currentStatus.currentWorkedTime || '0h00';
  const totalPreparations = user?.stats.totalPreparations || 0;
  const onTimeRate = user?.stats.onTimeRate || 0;
  const averageTime = user?.stats.averageTime || 0;

  if (isLoading && !todayStatus && !currentPreparation) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Chargement du dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête de bienvenue */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Bonjour {user?.firstName} ! 👋
        </h1>
        <p className="opacity-90">
          {new Date().toLocaleDateString('fr-FR', { 
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          })}
        </p>
      </div>

      {/* Statut du jour */}
      {selectedAgencyId && (
        <TodayStatus 
          status={todayStatus}
          agencies={userAgencies}
          selectedAgencyId={selectedAgencyId}
          onAgencyChange={setSelectedAgencyId}
          isLoading={timesheetLoading}
        />
      )}

      {/* Actions rapides */}
      <QuickActions 
        todayStatus={todayStatus}
        currentPreparation={currentPreparation}
        selectedAgencyId={selectedAgencyId}
        agencies={userAgencies}
      />

      {/* Préparation en cours */}
      {currentPreparation && (
        <CurrentPreparation preparation={currentPreparation} />
      )}

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 gap-4">
        <StatsCard
          title="Temps travaillé"
          value={currentWorkedTime}
          icon={Clock}
          color="blue"
          subtitle="Aujourd'hui"
        />
        <StatsCard
          title="Préparations"
          value={totalPreparations.toString()}
          icon={Car}
          color="green"
          subtitle="Total"
        />
        <StatsCard
          title="Ponctualité"
          value={`${onTimeRate}%`}
          icon={TrendingUp}
          color="purple"
          subtitle="Taux de respect"
        />
        <StatsCard
          title="Temps moyen"
          value={formatWorkTime(averageTime)}
          icon={Calendar}
          color="orange"
          subtitle="Par préparation"
        />
      </div>

      {/* Activité récente */}
      <RecentActivity />

      {/* Conseils du jour */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-medium text-amber-800 mb-2">💡 Conseil du jour</h3>
        <p className="text-sm text-amber-700">
          Pensez à prendre une photo claire de chaque étape pour faciliter la validation. 
          Un bon éclairage améliore la qualité de vos photos !
        </p>
      </div>
    </div>
  );
}