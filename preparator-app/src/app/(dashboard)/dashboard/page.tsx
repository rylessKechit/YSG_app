'use client';

import { useEffect } from 'react';
import { Clock, Car, TrendingUp, Calendar, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import { useDashboardStore } from '@/lib/stores/dashboard';
import { useRouter } from 'next/navigation';
import { TodaySchedule } from '@/components/dashboard/TodaySchedule';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const { 
    dashboardData, 
    isLoading, 
    error,
    loadDashboard,
    clearError 
  } = useDashboardStore();
  const router = useRouter();

  // Charger les données au montage du composant
  useEffect(() => {
    if (user) {
      console.log('🔄 Chargement dashboard depuis API...');
      loadDashboard();
    }
  }, [user, loadDashboard]);

  // Fonction helper pour récupérer les stats de façon sécurisée
  const getSafeStats = () => {
    return {
      totalPreparations: user?.stats?.totalPreparations || 0,
      onTimeRate: user?.stats?.onTimeRate || 0,
      averageTime: user?.stats?.averageTime || 0,
      lastCalculated: user?.stats?.lastCalculated || null
    };
  };

  const formatTime = (minutes: number) => {
    if (!minutes || minutes === 0) return '0min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h${mins}min` : `${mins}min`;
  };

  // Extraire les données du dashboard
  const todayData = dashboardData?.today;
  const todaySchedule = todayData?.schedule;
  const todayTimesheet = todayData?.timesheet;
  const currentPreparation = todayData?.currentPreparation;

  // Construire le statut actuel basé sur les données du backend
  const currentStatus = todayTimesheet ? {
    status: todayTimesheet.status === 'completed' ? 'finished' : 
            todayTimesheet.breakStart && !todayTimesheet.breakEnd ? 'on_break' :
            todayTimesheet.startTime ? 'working' : 'not_started',
    workedTime: todayTimesheet.totalWorkedMinutes ? 
      `${Math.floor(todayTimesheet.totalWorkedMinutes / 60)}h${todayTimesheet.totalWorkedMinutes % 60}` : 
      null
  } : null;

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-gray-600">Utilisateur non trouvé</p>
        </div>
      </div>
    );
  }

  const stats = getSafeStats();

  return (
    <div className="space-y-6">
      {/* En-tête de bienvenue */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Bonjour {user.firstName} ! 👋
        </h1>
        <p className="opacity-90">
          {new Date().toLocaleDateString('fr-FR', { 
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          })}
        </p>
      </div>

      {/* Affichage d'erreur générale */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Erreur de chargement</p>
          <p className="text-red-700 text-sm">{error}</p>
          <button 
            onClick={() => {
              clearError();
              loadDashboard();
            }}
            className="mt-2 text-red-600 underline text-sm"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Planning du jour - Données réelles du backend */}
      <TodaySchedule 
        schedule={todaySchedule}
        currentStatus={currentStatus}
        isLoading={isLoading}
      />

      {/* Préparation en cours */}
      {currentPreparation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-green-800">Préparation en cours</p>
              <p className="text-green-700 text-sm">
                {currentPreparation.vehicle?.licensePlate} - {currentPreparation.vehicle?.brand}
              </p>
            </div>
            <div className="text-right">
              <p className="text-green-800 font-bold">{currentPreparation.progress}%</p>
              <p className="text-green-700 text-sm">{currentPreparation.currentDuration}min</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => router.push('/timesheets')}
            className="bg-blue-600 text-white rounded-lg py-3 px-4 font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Clock className="w-5 h-5" />
            <span>Pointage</span>
          </button>
          <button 
            onClick={() => router.push('/preparations/new')}
            className="bg-green-600 text-white rounded-lg py-3 px-4 font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nouvelle préparation</span>
          </button>
        </div>
      </div>

      {/* Statistiques rapides - Données réelles de l'utilisateur */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Préparations</p>
              <p className="text-xl font-bold">{stats.totalPreparations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Ponctualité</p>
              <p className="text-xl font-bold">{stats.onTimeRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Temps moyen</p>
              <p className="text-xl font-bold">{formatTime(stats.averageTime)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Dernière activité</p>
              <p className="text-sm font-medium">
                {user.lastLogin 
                  ? new Date(user.lastLogin).toLocaleDateString('fr-FR')
                  : 'Jamais'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conseil du jour */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-medium text-amber-800 mb-2">💡 Conseil du jour</h3>
        <p className="text-sm text-amber-700">
          Pensez à pointer votre arrivée dès votre entrée sur site. Un bon pointage aide à suivre vos performances !
        </p>
      </div>

      {/* Debug info - Données réelles */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 rounded-lg p-4 text-xs">
          <h3 className="font-medium mb-2">Debug Info (Données réelles):</h3>
          <pre className="whitespace-pre-wrap text-gray-700">
            {JSON.stringify({ 
              user: user ? 'Présent' : 'Absent', 
              stats,
              hasSchedule: !!todaySchedule,
              hasTimesheet: !!todayTimesheet,
              hasPreparation: !!currentPreparation,
              loading: isLoading
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}