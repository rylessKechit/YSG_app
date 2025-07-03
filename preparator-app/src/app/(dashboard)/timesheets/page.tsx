'use client';

import { useEffect, useState } from 'react';
import { Clock, Play, Square, Coffee, RotateCcw, Calendar, Home, FileText, User } from 'lucide-react';
import { useTimesheetStore } from '@/lib/stores/timesheet';
import { useAuthStore } from '@/lib/stores/auth';
import { useAppStore } from '@/lib/stores/app';
import { TimesheetStatus } from '@/lib/types/timesheet';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export default function TimesheetsPage() {
  const { user } = useAuthStore();
  const { 
    todayStatus, 
    history, 
    isLoading, 
    error,
    getTodayStatus,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    getHistory,
    clearError
  } = useTimesheetStore();
  const { addNotification } = useAppStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const router = useRouter();

  // Fonction pour obtenir l'agence par défaut
  const getDefaultAgencyId = (): string => {
    const defaultAgency = user?.agencies?.find((a: any) => a.isDefault) || user?.agencies?.[0];
    return defaultAgency?.id || '';
  };

  useEffect(() => {
    if (user) {
      const agencyId = getDefaultAgencyId();
      if (agencyId) {
        console.log('🔄 Chargement timesheet avec agencyId:', agencyId);
        getTodayStatus(agencyId);
        getHistory();
      }
    }
  }, [user, getTodayStatus, getHistory]);

  const handleAction = async (action: string, handler: () => Promise<void>) => {
    setActionLoading(action);
    try {
      await handler();
      
      const messages: Record<string, string> = {
        'clock-in': 'Arrivée pointée avec succès',
        'clock-out': 'Départ pointé avec succès',
        'break-start': 'Pause commencée',
        'break-end': 'Pause terminée'
      };

      addNotification({
        type: 'success',
        title: 'Succès',
        message: messages[action] || 'Action réalisée avec succès',
        duration: 3000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Une erreur est survenue',
        duration: 5000
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (minutes: number) => {
    if (!minutes || minutes === 0) return '0min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h${mins}min` : `${mins}min`;
  };

  // CORRIGÉ: Logique de statut basée sur la vraie structure du backend
  const getStatusInfo = () => {
    if (!todayStatus) {
      return {
        label: 'Chargement...',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100'
      };
    }

    if (todayStatus.isNotStarted) {
      return {
        label: 'Pas encore pointé',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100'
      };
    }

    if (todayStatus.isOnBreak) {
      return {
        label: 'En pause',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      };
    }

    if (todayStatus.isClockedOut) {
      return {
        label: 'Service terminé',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      };
    }

    if (todayStatus.isClockedIn) {
      return {
        label: 'En service',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      };
    }

    return {
      label: 'Statut inconnu',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    };
  };

  // CORRIGÉ: Conditions d'activation des boutons basées sur les vrais flags du backend
  const canClockIn = todayStatus?.isNotStarted || false;
  const canClockOut = todayStatus?.isClockedIn || todayStatus?.isOnBreak || false;
  const canStartBreak = todayStatus?.isClockedIn && !todayStatus?.isOnBreak || false;
  const canEndBreak = todayStatus?.isOnBreak || false;

  console.log('🔍 Debug statut:', {
    todayStatus,
    canClockIn,
    canClockOut,
    canStartBreak,
    canEndBreak
  });

  if (isLoading && !todayStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center space-y-4 p-6">
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
              const agencyId = getDefaultAgencyId();
              if (agencyId) getTodayStatus(agencyId);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* En-tête */}
      <div className="bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pointages</h1>
            <p className="text-gray-600 mt-1">
              {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
          </div>
          <button
            onClick={() => {
              const agencyId = getDefaultAgencyId();
              if (agencyId) getTodayStatus(agencyId);
            }}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm font-medium">Actualiser</span>
          </button>
        </div>
      </div>

      {/* Statut actuel */}
      <div className="bg-white mx-4 mt-4 p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Clock className="w-6 h-6 mr-3 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Statut actuel</h2>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color} ${statusInfo.bgColor}`}>
            {statusInfo.label}
          </div>
        </div>

        {/* Métriques de temps */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {todayStatus?.currentWorkedTime || formatTime(todayStatus?.currentWorkedMinutes || 0)}
            </div>
            <div className="text-xs text-gray-600">Temps travaillé</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {todayStatus?.timesheet?.breakStart && todayStatus?.timesheet?.breakEnd ? 
                formatTime(Math.floor((new Date(todayStatus.timesheet.breakEnd).getTime() - new Date(todayStatus.timesheet.breakStart).getTime()) / (1000 * 60))) :
                '0min'
              }
            </div>
            <div className="text-xs text-gray-600">Temps de pause</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {todayStatus?.timesheet?.startTime ? 
                format(new Date(todayStatus.timesheet.startTime), 'HH:mm') : 
                '--:--'
              }
            </div>
            <div className="text-xs text-gray-600">Arrivée</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {todayStatus?.timesheet?.endTime ? 
                format(new Date(todayStatus.timesheet.endTime), 'HH:mm') : 
                '--:--'
              }
            </div>
            <div className="text-xs text-gray-600">Départ</div>
          </div>
        </div>

        {/* Boutons d'actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => handleAction('clock-in', () => clockIn(getDefaultAgencyId()))}
            disabled={!canClockIn || actionLoading === 'clock-in'}
            className={`flex items-center justify-center p-4 rounded-lg font-medium transition-colors ${
              canClockIn && actionLoading !== 'clock-in' 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5 mr-2" />
            {actionLoading === 'clock-in' ? 'En cours...' : 'Arrivée'}
          </button>

          <button
            onClick={() => handleAction('clock-out', () => clockOut(getDefaultAgencyId()))}
            disabled={!canClockOut || actionLoading === 'clock-out'}
            className={`flex items-center justify-center p-4 rounded-lg font-medium transition-colors ${
              canClockOut && actionLoading !== 'clock-out' 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Square className="w-5 h-5 mr-2" />
            {actionLoading === 'clock-out' ? 'En cours...' : 'Départ'}
          </button>

          <button
            onClick={() => handleAction('break-start', () => startBreak(getDefaultAgencyId()))}
            disabled={!canStartBreak || actionLoading === 'break-start'}
            className={`flex items-center justify-center p-4 rounded-lg font-medium transition-colors ${
              canStartBreak && actionLoading !== 'break-start' 
                ? 'bg-orange-600 text-white hover:bg-orange-700' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Coffee className="w-5 h-5 mr-2" />
            {actionLoading === 'break-start' ? 'En cours...' : 'Pause'}
          </button>

          <button
            onClick={() => handleAction('break-end', () => endBreak(getDefaultAgencyId()))}
            disabled={!canEndBreak || actionLoading === 'break-end'}
            className={`flex items-center justify-center p-4 rounded-lg font-medium transition-colors ${
              canEndBreak && actionLoading !== 'break-end' 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5 mr-2" />
            {actionLoading === 'break-end' ? 'En cours...' : 'Reprendre'}
          </button>
        </div>
      </div>

      {/* Historique toggle */}
      <div className="mx-4 mt-4">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-center p-4 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Calendar className="w-5 h-5 mr-2 text-gray-600" />
          <span className="font-medium text-gray-700">
            {showHistory ? 'Masquer l\'historique' : 'Voir l\'historique'}
          </span>
        </button>
      </div>

      {/* Historique */}
      {showHistory && (
        <div className="bg-white mx-4 mt-4 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique des pointages</h3>
          {history && history.length > 0 ? (
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {format(new Date(entry.date), 'dd/MM/yyyy', { locale: fr })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {entry.agency?.name || 'Agence non spécifiée'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatTime(entry.totalWorkedMinutes)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entry.startTime ? format(new Date(entry.startTime), 'HH:mm') : '--:--'} - 
                      {entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : '--:--'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Aucun historique disponible</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="grid grid-cols-4 h-16">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex flex-col items-center justify-center space-y-1 text-xs"
          >
            <Home className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">Accueil</span>
          </button>
          
          <button 
            onClick={() => router.push('/timesheets')}
            className="flex flex-col items-center justify-center space-y-1 text-xs bg-blue-50"
          >
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-blue-600 font-medium">Pointages</span>
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