'use client';

import { useEffect } from 'react';
import { Clock, Car, TrendingUp, Calendar, Plus, Home, FileText, User } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import { useDashboardStore } from '@/lib/stores/dashboard';
import { useRouter } from 'next/navigation';

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

  const formatTime = (minutes: number) => {
    if (!minutes || minutes === 0) return '0min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h${mins}min` : `${mins}min`;
  };

  // CORRIGÉ: Extraction des données selon la vraie structure de l'API
  const todayData = dashboardData?.today;
  const todaySchedule = todayData?.schedule;
  const todayTimesheet = todayData?.timesheet;
  const currentPreparation = todayData?.currentPreparation;

  console.log('🔍 Debug dashboard data:', {
    todayData,
    todaySchedule,
    todayTimesheet,
    currentPreparation
  });

  // Construire le statut actuel basé sur les données du backend
  const currentStatus = todayTimesheet ? {
    status: todayTimesheet.status === 'complete' ? 'finished' : 
            todayTimesheet.breakStart && !todayTimesheet.breakEnd ? 'on_break' :
            todayTimesheet.startTime ? 'working' : 'not_started',
    workedTime: todayTimesheet.totalWorkedMinutes || 0,
    breakTime: todayTimesheet.breakStart && todayTimesheet.breakEnd ? 
              Math.floor((new Date(todayTimesheet.breakEnd).getTime() - new Date(todayTimesheet.breakStart).getTime()) / (1000 * 60)) : 0,
    startTime: todayTimesheet.startTime,
    endTime: todayTimesheet.endTime
  } : {
    status: 'not_started',
    workedTime: 0,
    breakTime: 0,
    startTime: null,
    endTime: null
  };

  // Fonction pour obtenir le texte du statut
  const getStatusText = () => {
    switch (currentStatus.status) {
      case 'not_started':
        return 'Pas encore pointé';
      case 'working':
        return 'En service';
      case 'on_break':
        return 'En pause';
      case 'finished':
        return 'Service terminé';
      default:
        return 'Statut inconnu';
    }
  };

  // Chargement initial
  if (authLoading || (isLoading && !dashboardData)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  // Gestion des erreurs
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <div className="w-8 h-8 text-red-600">⚠️</div>
          </div>
          <div>
            <p className="text-red-600 font-medium">Erreur de chargement</p>
            <p className="text-gray-600 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={() => {
              clearError();
              loadDashboard();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Stats de l'utilisateur
  const stats = {
    totalPreparations: user?.stats?.totalPreparations || 0,
    onTimeRate: user?.stats?.onTimeRate || 0,
    averageTime: user?.stats?.averageTime || 0
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Section Bonjour */}
      <div className="bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Bonjour,
            </h1>
            <h2 className="text-2xl font-bold text-blue-600 mb-1">
              {user?.firstName || 'preparator'} 👋
            </h2>
            <p className="text-gray-600">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
          <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
            {getStatusText()}
          </div>
        </div>
      </div>

      {/* Section Planning du jour */}
      <div className="bg-white mx-4 mt-4 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Planning d'aujourd'hui</h3>
        
        {/* Statut du jour */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatTime(currentStatus.workedTime)}
            </div>
            <div className="text-xs text-gray-600">Temps travaillé</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {formatTime(currentStatus.breakTime)}
            </div>
            <div className="text-xs text-gray-600">Temps de pause</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {currentStatus.startTime ? 
                new Date(currentStatus.startTime).toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : 
                '--:--'
              }
            </div>
            <div className="text-xs text-gray-600">Arrivée</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {currentStatus.endTime ? 
                new Date(currentStatus.endTime).toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : 
                '--:--'
              }
            </div>
            <div className="text-xs text-gray-600">Départ</div>
          </div>
        </div>

        {/* CORRIGÉ: Planning détaillé selon la structure backend */}
        {todaySchedule ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">
                    {todaySchedule.startTime} - {todaySchedule.endTime}
                  </p>
                  <p className="text-sm text-gray-600">
                    {todaySchedule.agency.name} ({todaySchedule.agency.code})
                  </p>
                  {todaySchedule.breakStart && todaySchedule.breakEnd && (
                    <p className="text-xs text-gray-500">
                      Pause: {todaySchedule.breakStart} - {todaySchedule.breakEnd}
                    </p>
                  )}
                </div>
              </div>
              <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Programmé
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Aucun planning pour aujourd'hui</p>
          </div>
        )}
      </div>

      {/* Boutons d'actions sur une ligne */}
      <div className="grid grid-cols-2 gap-4 mx-4 mt-4">
        <button
          onClick={() => router.push('/timesheets')}
          className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Clock className="w-5 h-5 mr-2" />
          <span className="font-medium">Gérer les pointages</span>
        </button>
        
        <button
          onClick={() => router.push('/preparations')}
          className="flex items-center justify-center p-4 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          <span className="font-medium">Créer préparation</span>
        </button>
      </div>

      {/* Section Statistiques */}
      <div className="mx-4 mt-4 space-y-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalPreparations}</div>
              <div className="text-sm text-gray-600">Préparations totales</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.onTimeRate}%</div>
              <div className="text-sm text-gray-600">Ponctualité</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{formatTime(stats.averageTime)}</div>
              <div className="text-sm text-gray-600">Temps moyen</div>
            </div>
          </div>
        </div>
      </div>

      {/* Préparation en cours */}
      {currentPreparation && (
        <div className="mx-4 mt-4">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Préparation en cours</h3>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Car className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-medium text-gray-900">
                    {currentPreparation.vehicle.brand} {currentPreparation.vehicle.model}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {currentPreparation.progress}% terminé
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${currentPreparation.progress}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Immatriculation: {currentPreparation.vehicle.licensePlate}</span>
                <span>Durée: {formatTime(currentPreparation.currentDuration)}</span>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push(`/preparations/${currentPreparation.id}`)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continuer la préparation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="grid grid-cols-4 h-16">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex flex-col items-center justify-center space-y-1 text-xs bg-blue-50"
          >
            <Home className="w-5 h-5 text-blue-600" />
            <span className="text-blue-600 font-medium">Accueil</span>
          </button>
          
          <button 
            onClick={() => router.push('/timesheets')}
            className="flex flex-col items-center justify-center space-y-1 text-xs"
          >
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">Pointages</span>
          </button>
          
          <button 
            onClick={() => router.push('/preparations')}
            className="flex flex-col items-center justify-center space-y-1 text-xs"
          >
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">Préparations</span>
          </button>
          
          <button 
            onClick={() => router.push('/profile')}
            className="flex flex-col items-center justify-center space-y-1 text-xs"
          >
            <User className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
}