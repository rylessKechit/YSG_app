'use client';

import { useEffect, useState } from 'react';
import { Clock, Play, Square, Coffee, RotateCcw, Calendar, FileText, Home, User } from 'lucide-react';
import { useTimesheetStore } from '@/lib/stores/timesheet';
import { useAuthStore } from '@/lib/stores/auth';
import { useAppStore } from '@/lib/stores/app';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
  isDefault?: boolean;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  agencies: Agency[];
}

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
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const router = useRouter();

  // Fonction pour obtenir l'agence par défaut
  const getDefaultAgencyId = (): string => {
    if (!user?.agencies || user.agencies.length === 0) {
      console.warn('⚠️ Aucune agence trouvée pour l\'utilisateur');
      return '';
    }

    // Chercher l'agence par défaut
    const defaultAgency = user.agencies.find((a: Agency) => a.isDefault === true);
    if (defaultAgency?.id) {
      console.log('✅ Agence par défaut trouvée:', defaultAgency);
      return defaultAgency.id;
    }

    // Fallback sur la première agence
    const firstAgency = user.agencies[0];
    if (firstAgency?.id) {
      console.log('⚠️ Utilisation première agence:', firstAgency);
      return firstAgency.id;
    }

    console.error('❌ Aucune agence valide trouvée');
    return '';
  };

  // Initialisation
  useEffect(() => {
    if (user) {
      const agencyId = getDefaultAgencyId();
      
      if (!agencyId) {
        addNotification({
          type: 'error',
          title: 'Configuration manquante',
          message: 'Aucune agence assignée. Contactez votre administrateur.',
          duration: 8000
        });
        return;
      }

      setSelectedAgencyId(agencyId);
      console.log('🔄 Chargement timesheet avec agencyId:', agencyId);
      
      // Charger les données
      getTodayStatus(agencyId);
      getHistory();
    }
  }, [user, getTodayStatus, getHistory, addNotification]);

  // Gestion des actions de pointage
  const handleAction = async (action: string, handler: () => Promise<void>) => {
    if (!selectedAgencyId) {
      addNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Aucune agence sélectionnée. Impossible de pointer.',
        duration: 5000
      });
      return;
    }

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

      // Rafraîchir le statut après action
      setTimeout(() => {
        getTodayStatus(selectedAgencyId);
      }, 500);

    } catch (error) {
      console.error(`❌ Erreur ${action}:`, error);
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

  // Formater le temps en minutes
  const formatTime = (minutes: number): string => {
    if (!minutes || minutes === 0) return '0min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h${mins}min` : `${mins}min`;
  };

  // Obtenir les informations de statut
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

  // Conditions d'activation des boutons
  const canClockIn = todayStatus?.isNotStarted || false;
  const canClockOut = (todayStatus?.isClockedIn || todayStatus?.isOnBreak) && !todayStatus?.isClockedOut || false;
  const canStartBreak = todayStatus?.isClockedIn && !todayStatus?.isOnBreak || false;
  const canEndBreak = todayStatus?.isOnBreak || false;

  // Message d'aide
  const getHelpMessage = (): string => {
    if (!todayStatus) return 'Chargement du statut...';
    
    if (todayStatus.isNotStarted) return 'Vous pouvez pointer votre arrivée';
    if (todayStatus.isClockedIn && !todayStatus.isOnBreak) return 'Vous êtes en service - Vous pouvez prendre une pause ou pointer votre départ';
    if (todayStatus.isOnBreak) return 'Vous êtes en pause - Vous pouvez reprendre le travail';
    if (todayStatus.isClockedOut) return 'Votre service est terminé pour aujourd\'hui';
    
    return 'Statut en cours de synchronisation...';
  };

  // Debug logs
  console.log('🔍 Debug timesheets page:', {
    user: user ? 'Chargé' : 'Non chargé',
    userAgencies: user?.agencies?.length || 0,
    selectedAgencyId,
    todayStatus,
    canClockIn,
    canClockOut,
    canStartBreak,
    canEndBreak,
    actionLoading,
    isLoading
  });

  // Écran de chargement
  if (isLoading && !todayStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Chargement des données de pointage...</p>
        </div>
      </div>
    );
  }

  // Écran d'erreur
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
              if (agencyId) {
                getTodayStatus(agencyId);
                setSelectedAgencyId(agencyId);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Écran de configuration manquante
  if (!selectedAgencyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center space-y-4 p-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <div className="w-8 h-8 text-yellow-600">⚠️</div>
          </div>
          <div>
            <p className="text-yellow-600 font-medium">Configuration requise</p>
            <p className="text-gray-600 text-sm mt-1">
              Aucune agence assignée à votre compte. 
              <br />Contactez votre administrateur.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();
  const currentAgency = user?.agencies?.find((a: Agency) => a.id === selectedAgencyId);

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
            {currentAgency && (
              <p className="text-sm text-blue-600 mt-1">
                📍 {currentAgency.name}
              </p>
            )}
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
            {statusInfo.label}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-6">
        {/* Résumé du jour */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Aujourd'hui</h2>
          
          {/* Temps travaillé */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-gray-700">Temps travaillé</span>
            </div>
            <span className="text-xl font-bold text-blue-600">
              {todayStatus?.currentWorkedTime || '0min'}
            </span>
          </div>

          {/* Horaires */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {todayStatus?.timesheet?.startTime ? 
                  format(new Date(todayStatus.timesheet.startTime), 'HH:mm') : 
                  '--:--'
                }
              </div>
              <div className="text-xs text-gray-600">Arrivée</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">
                {todayStatus?.timesheet?.endTime ? 
                  format(new Date(todayStatus.timesheet.endTime), 'HH:mm') : 
                  '--:--'
                }
              </div>
              <div className="text-xs text-gray-600">Départ</div>
            </div>
          </div>
        </div>

        {/* Boutons d'actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Bouton Arrivée */}
          <button
            onClick={() => handleAction('clock-in', () => clockIn(selectedAgencyId))}
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

          {/* Bouton Départ */}
          <button
            onClick={() => handleAction('clock-out', () => clockOut(selectedAgencyId))}
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

          {/* Bouton Pause */}
          <button
            onClick={() => handleAction('break-start', () => startBreak(selectedAgencyId))}
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

          {/* Bouton Reprendre */}
          <button
            onClick={() => handleAction('break-end', () => endBreak(selectedAgencyId))}
            disabled={!canEndBreak || actionLoading === 'break-end'}
            className={`flex items-center justify-center p-4 rounded-lg font-medium transition-colors ${
              canEndBreak && actionLoading !== 'break-end' 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            {actionLoading === 'break-end' ? 'En cours...' : 'Reprendre'}
          </button>
        </div>

        {/* Message d'aide */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 {getHelpMessage()}
          </p>
        </div>

        {/* Historique */}
        <div className="mt-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <FileText className="w-4 h-4" />
            <span>{showHistory ? 'Masquer' : 'Voir'} l'historique</span>
          </button>

          {showHistory && history && (
            <div className="mt-4 space-y-2">
              {history.slice(0, 5).map((entry: any) => (
                <div key={entry.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{entry.agency?.name}</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(entry.date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {entry.startTime && format(new Date(entry.startTime), 'HH:mm')} - {' '}
                        {entry.endTime && format(new Date(entry.endTime), 'HH:mm')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(entry.totalWorkedMinutes || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
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
    </div>
  );
}