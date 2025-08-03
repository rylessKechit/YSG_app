'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Calendar, 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  LogOut,
  Settings,
  TrendingUp,
  Award,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Edit3,
  Car,
  Timer,
  Target,
  Building2,
  Loader2
} from 'lucide-react';

import { useAuthStore } from '@/lib/stores/auth';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
// ✅ AJOUT - Import du nouveau composant
import { WeekSchedule } from '@/components/profile/WeekSchedule';
import { BottomNavigation } from '@/components/layout/BottomNavigation';

// Types pour les données du profil
interface ProfileData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    agencies: Array<{
      id: string;
      name: string;
      code: string;
      client: string;
    }>;
    stats: {
      totalPreparations: number;
      averageTime: number;
      onTimeRate: number;
    };
    createdAt: string;
    lastLogin: string;
  };
  // ✅ MODIFICATION - Type mis à jour pour inclure les pointages
  weekSchedule: Array<{
    date: string;
    dayName: string;
    isToday: boolean;
    schedule: {
      id: string;
      agency: {
        name: string;
        code: string;
      };
      startTime: string;
      endTime: string;
      breakStart?: string;
      breakEnd?: string;
    } | null;
    // ✅ NOUVEAU - Pointages réels
    timesheet: {
      id: string;
      agency: any;
      startTime: string;
      endTime: string;
      breakStart?: string;
      breakEnd?: string;
      totalWorkedMinutes: number;
      status: string;
      delays: any;
      variance: {
        minutes: number;
        status: 'on_time' | 'slight_delay' | 'late';
        label: string;
      } | null;
    } | null;
  }>;
  preparations: {
    total: number;
    completed: number;
    onTime: number;
    averageTime: number;
    bestTime: number;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // States
  const { user, logout, isLoading: authLoading } = useAuthStore();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ✅ NOUVEAU STATE - Pour gérer le chargement du planning séparément
  const [loadingWeekSchedule, setLoadingWeekSchedule] = useState(false);

  // Charger toutes les données du profil
  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Chargement données profil...');

      // Appels API en parallèle - avec gestion d'erreur améliorée
      const [
        dashboardResponse,
        myStatsResponse
      ] = await Promise.allSettled([
        // Dashboard avec infos de base
        apiClient.get('/profile/dashboard'),
        
        // Mes statistiques de préparations
        apiClient.get('/preparations/my-stats?period=30d')
      ]);

      // Traitement des résultats principaux
      const dashboard = dashboardResponse.status === 'fulfilled' ? dashboardResponse.value.data.data : null;
      const myStats = myStatsResponse.status === 'fulfilled' ? myStatsResponse.value.data.data : null;

      console.log('📊 Données principales reçues:', { dashboard, myStats });

      // ✅ MODIFICATION - Récupérer le planning avec pointages séparément
      let weekSchedule = null;
      try {
        setLoadingWeekSchedule(true);
        console.log('🔄 Tentative récupération planning avec pointages...');
        const scheduleResponse = await apiClient.get('/profile/schedule/week');
        weekSchedule = scheduleResponse.data.data;
        console.log('✅ Planning avec pointages récupéré:', weekSchedule);
      } catch (scheduleError) {
        console.warn('⚠️ Erreur planning (non bloquant):', scheduleError);
        // Continuer sans le planning
      } finally {
        setLoadingWeekSchedule(false);
      }

      // Construire l'objet profileData complet
      const data: ProfileData = {
        user: {
          id: dashboard?.user?.id || user?.id,
          firstName: dashboard?.user?.firstName || user?.firstName,
          lastName: dashboard?.user?.lastName || user?.lastName,
          email: dashboard?.user?.email || user?.email,
          phone: dashboard?.user?.phone || user?.phone,
          agencies: dashboard?.user?.agencies || [],
          stats: {
            totalPreparations: myStats?.totalPreparations || dashboard?.user?.stats?.totalPreparations || 0,
            averageTime: myStats?.averageTime || dashboard?.user?.stats?.averageTime || 0,
            onTimeRate: myStats?.onTimeRate || dashboard?.user?.stats?.onTimeRate || 0
          },
          createdAt: dashboard?.user?.createdAt || user?.createdAt,
          lastLogin: dashboard?.user?.lastLogin || user?.lastLogin
        },
        // ✅ MODIFICATION - Utiliser les nouvelles données enrichies
        weekSchedule: weekSchedule?.weekSchedule || [],
        preparations: {
          total: myStats?.totalPreparations || 0,
          completed: myStats?.completedPreparations || 0,
          onTime: myStats?.onTimeCount || 0,
          averageTime: myStats?.averageTime || 0,
          bestTime: myStats?.bestTime || 0
        }
      };

      setProfileData(data);
      console.log('✅ Données profil chargées:', data);

    } catch (error: any) {
      console.error('❌ Erreur chargement profil:', error);
      setError('Impossible de charger les données du profil');
      toast({
        title: "Erreur",
        description: "Impossible de charger vos données",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de déconnexion avec nettoyage complet
  const handleLogout = async () => {
    try {
      // Tentative de logout côté serveur
      try {
        await logout();
      } catch (error) {
        console.warn('Erreur logout serveur (non bloquant):', error);
      }

      // Nettoyage complet du localStorage
      console.log('🧹 Nettoyage localStorage...');
      
      // Supprimer tous les tokens et données d'auth
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      
      // Supprimer les données de session
      localStorage.removeItem('selectedAgency');
      localStorage.removeItem('lastActivity');
      localStorage.removeItem('dashboardData');
      localStorage.removeItem('currentPreparation');
      
      // Optionnel : nettoyer toutes les clés liées à l'app
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('vehicle_prep_') || 
            key.startsWith('auth_') || 
            key.startsWith('user_') ||
            key.startsWith('prep_') ||
            key.startsWith('sixt_')) {
          localStorage.removeItem(key);
        }
      });

      // Nettoyer aussi sessionStorage si utilisé
      sessionStorage.clear();

      console.log('✅ localStorage nettoyé');

      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });

      // Redirection vers login
      router.push('/login');
      
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      
      // Même en cas d'erreur, nettoyer le localStorage
      localStorage.clear();
      sessionStorage.clear();
      
      toast({
        title: "Déconnexion forcée",
        description: "Session fermée localement",
        variant: "destructive"
      });
      
      router.push('/login');
    }
  };

  // Fonctions utilitaires
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    }).format(date);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusColor = (hasSchedule: boolean) => {
    if (!hasSchedule) return 'bg-gray-100 text-gray-600';
    return 'bg-blue-100 text-blue-600';
  };

  // États de chargement et d'erreur
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Impossible de charger votre profil. Veuillez vous reconnecter.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentWeek = new Date().toLocaleDateString('fr-FR', { 
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header avec avatar et actions */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16 border-4 border-white/20">
                <AvatarFallback className="bg-white text-blue-600 text-xl font-bold">
                  {profileData.user.firstName?.[0]}{profileData.user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">
                  {profileData.user.firstName} {profileData.user.lastName}
                </h1>
                <p className="text-blue-100 flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  {profileData.user.email}
                </p>
                {profileData.user.phone && (
                  <p className="text-blue-100 flex items-center mt-1">
                    <Phone className="h-4 w-4 mr-2" />
                    {profileData.user.phone}
                  </p>
                )}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => router.push('/profile/edit')}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Statistiques réelles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{profileData.user.stats.totalPreparations}</div>
              <div className="text-xs text-blue-100">Préparations</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{Math.round(profileData.user.stats.onTimeRate)}%</div>
              <div className="text-xs text-blue-100">Ponctualité</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Performances détaillées */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Mes Performances (30 jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Timer className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="text-xl font-bold text-blue-600">{Math.round(profileData.user.stats.averageTime)}min</div>
                <div className="text-sm text-gray-600">Temps moyen</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Award className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <div className="text-xl font-bold text-green-600">{profileData.preparations.bestTime}min</div>
                <div className="text-sm text-gray-600">Meilleur temps</div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-purple-800">Taux de réussite</span>
                <span className="text-lg font-bold text-purple-600">
                  {profileData.preparations.total > 0 ? 
                    Math.round((profileData.preparations.completed / profileData.preparations.total) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {profileData.preparations.completed} / {profileData.preparations.total} préparations
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agences assignées */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <MapPin className="h-5 w-5 mr-2 text-blue-600" />
              Mes Agences ({profileData.user.agencies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profileData.user.agencies.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucune agence assignée</p>
            ) : (
              profileData.user.agencies.map((agency) => (
                <div key={agency.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{agency.name}</div>
                      <div className="text-sm text-gray-600">{agency.client}</div>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {agency.code}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ✅ REMPLACEMENT - Utiliser le nouveau composant WeekSchedule */}
        <WeekSchedule 
          weekSchedule={profileData.weekSchedule} 
          isLoading={loadingWeekSchedule} 
        />

        {/* Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Settings className="h-5 w-5 mr-2 text-gray-600" />
              Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-between h-12"
              onClick={() => router.push('/profile/edit')}
            >
              <div className="flex items-center">
                <Edit3 className="h-5 w-5 mr-3 text-blue-600" />
                Modifier mes informations
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-between h-12"
              onClick={() => router.push('/profile/settings')}
            >
              <div className="flex items-center">
                <Settings className="h-5 w-5 mr-3 text-gray-600" />
                Paramètres de l'application
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Separator className="my-4" />

            <Button 
              variant="destructive" 
              className="w-full h-12"
              onClick={handleLogout}
              disabled={authLoading}
            >
              {authLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Déconnexion...
                </>
              ) : (
                <>
                  <LogOut className="h-5 w-5 mr-2" />
                  Se déconnecter
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Informations système */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-gray-500 space-y-1">
              <p>Membre depuis {profileData.user.createdAt ? new Intl.DateTimeFormat('fr-FR', { 
                month: 'long', 
                year: 'numeric' 
              }).format(new Date(profileData.user.createdAt)) : 'N/A'}</p>
              <p>Dernière connexion : {profileData.user.lastLogin ? formatDateTime(profileData.user.lastLogin) : 'N/A'}</p>
              <p className="text-xs">Vehicle Prep v1.0.0</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <BottomNavigation />
    </div>
  );
}