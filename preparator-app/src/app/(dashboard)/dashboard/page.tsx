'use client';

import { useEffect } from 'react';
import { Clock, Car, Calendar, Plus, Home, FileText, User } from 'lucide-react';
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

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user, loadDashboard]);

  const formatTime = (minutes: number) => {
    if (!minutes || minutes === 0) return '0min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : `${mins}min`;
  };

  const todayData = dashboardData?.today;
  const todaySchedule = todayData?.schedule;
  const todayTimesheet = todayData?.timesheet;
  
  // ✅ CORRECTION - Utiliser les vraies données du backend
  const currentStatus = todayData?.currentStatus || calculateCurrentStatus(todayTimesheet);
  
  // ✅ CORRECTION - Utiliser les stats du user direct depuis l'API
  const userStats = dashboardData?.user?.stats || {
    totalPreparations: 0,
    averageTime: 0,
    onTimeRate: 0
  };

  console.log('🔍 Debug dashboard:', {
    dashboardData,
    todayTimesheet,
    currentStatus,
    userStats
  });

  function calculateCurrentStatus(timesheet: any) {
    if (!timesheet) {
      return {
        status: 'not_started' as const,
        workedTime: 0,
        breakTime: 0,
        startTime: null,
        endTime: null
      };
    }

    let status: 'not_started' | 'working' | 'on_break' | 'finished';
    
    if (!timesheet.startTime) {
      status = 'not_started';
    } else if (timesheet.endTime) {
      status = 'finished';
    } else if (timesheet.breakStart && !timesheet.breakEnd) {
      status = 'on_break';
    } else {
      status = 'working';
    }

    let breakTime = 0;
    if (timesheet.breakStart && timesheet.breakEnd) {
      breakTime = Math.floor(
        (new Date(timesheet.breakEnd).getTime() - new Date(timesheet.breakStart).getTime()) / (1000 * 60)
      );
    }

    return {
      status,
      workedTime: timesheet.totalWorkedMinutes || 0,
      breakTime,
      startTime: timesheet.startTime,
      endTime: timesheet.endTime
    };
  }

  const getStatusText = () => {
    switch (currentStatus.status) {
      case 'not_started': return 'Pas encore pointé';
      case 'working': return 'En service';
      case 'on_break': return 'En pause';
      case 'finished': return 'Service terminé';
      default: return 'Statut inconnu';
    }
  };

  const getStatusColor = () => {
    switch (currentStatus.status) {
      case 'not_started': return 'bg-gray-100 text-gray-700';
      case 'working': return 'bg-green-100 text-green-800';
      case 'on_break': return 'bg-orange-100 text-orange-800';
      case 'finished': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (authLoading || (isLoading && !dashboardData)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-lg p-6 shadow-sm max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
          <h3 className="font-medium text-gray-900 mb-2">Erreur de chargement</h3>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => {
              clearError();
              loadDashboard();
            }}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header compact */}
      <div className="bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Bonjour, <span className="text-blue-600">{user?.firstName || 'Préparateur'}</span> 👋
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </div>
        </div>
      </div>

      {/* Stats principales - 2x2 grid mobile */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-lg p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {formatTime(currentStatus.workedTime)}
            </div>
            <div className="text-xs text-gray-600">Temps travaillé</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {formatTime(currentStatus.breakTime)}
            </div>
            <div className="text-xs text-gray-600">Temps de pause</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm text-center">
            <div className="text-lg font-bold text-green-600 mb-1">
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
          
          <div className="bg-white rounded-lg p-4 shadow-sm text-center">
            <div className="text-lg font-bold text-red-600 mb-1">
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

        {/* Planning du jour - compact */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-blue-600" />
            Planning d'aujourd'hui
          </h3>
          
          {todaySchedule ? (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {todaySchedule.startTime} - {todaySchedule.endTime}
                  </p>
                  <p className="text-sm text-gray-600">
                    {todaySchedule.agency.name}
                  </p>
                  {todaySchedule.breakStart && todaySchedule.breakEnd && (
                    <p className="text-xs text-gray-500 mt-1">
                      Pause: {todaySchedule.breakStart} - {todaySchedule.breakEnd}
                    </p>
                  )}
                </div>
                <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Programmé
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun planning aujourd'hui</p>
            </div>
          )}
        </div>

        {/* Actions principales - Stack mobile */}
        <div className="space-y-3 mb-4">
          <button
            onClick={() => router.push('/timesheets')}
            className="w-full flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Clock className="w-5 h-5 mr-3" />
            <span className="font-medium">Gérer les pointages</span>
          </button>
          
          <button
            onClick={() => router.push('/preparations/new')}
            className="w-full flex items-center justify-center p-4 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-3" />
            <span className="font-medium">Créer préparation</span>
          </button>
        </div>

        {/* Performances - compact */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Vos performances</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-blue-600">
                {userStats.totalPreparations}
              </div>
              <div className="text-xs text-gray-600">Préparations</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-600">
                {userStats.onTimeRate}%
              </div>
              <div className="text-xs text-gray-600">Ponctualité</div>
            </div>
            <div>
              <div className="text-xl font-bold text-orange-600">
                {userStats.averageTime}min
              </div>
              <div className="text-xs text-gray-600">Temps moyen</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="grid grid-cols-4 h-16">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex flex-col items-center justify-center space-y-1 bg-blue-50"
          >
            <Home className="w-5 h-5 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">Accueil</span>
          </button>
          
          <button 
            onClick={() => router.push('/timesheets')}
            className="flex flex-col items-center justify-center space-y-1"
          >
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-600">Pointages</span>
          </button>
          
          <button 
            onClick={() => router.push('/preparations')}
            className="flex flex-col items-center justify-center space-y-1"
          >
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-600">Préparations</span>
          </button>
          
          <button 
            onClick={() => router.push('/profile')}
            className="flex flex-col items-center justify-center space-y-1"
          >
            <User className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-600">Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
}