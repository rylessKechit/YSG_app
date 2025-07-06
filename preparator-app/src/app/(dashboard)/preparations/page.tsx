// app/(dashboard)/preparations/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Clock, 
  Car,
  ArrowRight,
  History,
  AlertTriangle,
  BarChart3,
  Home,
  FileText,
  User
} from 'lucide-react';

import { usePreparationStore } from '@/lib/stores/preparation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

const PreparationsPage: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  
  const {
    currentPreparation,
    getCurrentPreparation,
    isLoading,
    error,
    clearError
  } = usePreparationStore();

  // Charger la préparation en cours au montage
  useEffect(() => {
    const loadCurrentPreparation = async () => {
      try {
        await getCurrentPreparation();
      } catch (error) {
        console.error('Erreur chargement préparation:', error);
      }
    };

    loadCurrentPreparation();
  }, [getCurrentPreparation]);

  // Nettoyer les erreurs après 5 secondes
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Rediriger vers la préparation en cours si elle existe
  useEffect(() => {
    if (currentPreparation && currentPreparation.id && !isLoading) {
      console.log('Redirection vers préparation:', currentPreparation.id);
      router.push(`/preparations/${currentPreparation.id}`);
    }
  }, [currentPreparation, router, isLoading]);

  // Gestionnaires d'événements
  const handleStartNewPreparation = () => {
    router.push('/preparations/new');
  };

  const handleViewHistory = () => {
    router.push('/preparations/history');
  };

  const handleViewPerformance = () => {
    toast({
      title: "Fonctionnalité à venir",
      description: "Vos statistiques de performance seront bientôt disponibles.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-16">
        <div className="text-center">
          <Car className="h-8 w-8 mx-auto text-blue-600 animate-spin" />
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Préparations</h1>
          <p className="text-sm text-gray-600">Gestion des préparations véhicules</p>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="p-4 space-y-6">
        {/* Erreur affichage */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900">Erreur</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aucune préparation en cours */}
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="h-8 w-8 text-gray-400" />
            </div>
            <CardTitle className="text-lg">Aucune préparation en cours</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Vous n'avez actuellement aucune préparation de véhicule en cours.
            </p>
          </CardHeader>
          
          <CardContent className="pt-2">
            <Button 
              onClick={handleStartNewPreparation}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle préparation
            </Button>
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Actions rapides</h2>
          
          {/* Voir l'historique */}
          <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardContent 
              className="p-4"
              onClick={handleViewHistory}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <History className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Historique</h3>
                    <p className="text-sm text-gray-600">Voir les préparations passées</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          {/* Statistiques de performance */}
          <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardContent 
              className="p-4"
              onClick={handleViewPerformance}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Performance</h3>
                    <p className="text-sm text-gray-600">Vos statistiques détaillées</p>
                  </div>
                </div>
                <Badge variant="outline">Bientôt</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conseils */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Conseil</h3>
            <p className="text-sm text-blue-700">
              Pour une préparation efficace, assurez-vous d'avoir une bonne connexion 
              internet pour l'upload des photos et de bien vérifier chaque étape avant validation.
            </p>
          </CardContent>
        </Card>
      </main>

      {/* ✅ NAVIGATION BOTTOM */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg safe-area-pb">
        <div className="grid grid-cols-4 h-16">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex flex-col items-center justify-center space-y-1 text-xs transition-colors hover:bg-gray-50"
          >
            <Home className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">Accueil</span>
          </button>
          
          <button 
            onClick={() => router.push('/timesheets')}
            className="flex flex-col items-center justify-center space-y-1 text-xs transition-colors hover:bg-gray-50"
          >
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">Pointages</span>
          </button>
          
          <button 
            onClick={() => router.push('/preparations')}
            className="flex flex-col items-center justify-center space-y-1 text-xs bg-blue-50"
          >
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-blue-600 font-medium">Préparations</span>
          </button>
          
          <button 
            onClick={() => router.push('/profile')}
            className="flex flex-col items-center justify-center space-y-1 text-xs transition-colors hover:bg-gray-50"
          >
            <User className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreparationsPage;