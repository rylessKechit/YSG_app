// preparator-app/src/app/(dashboard)/preparations/page.tsx
// ✅ Page préparations avec lien vers l'historique et navigation bottom

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Clock, 
  Car,
  ArrowRight,
  History,
  AlertTriangle
} from 'lucide-react';

import { usePreparationStore } from '@/lib/stores/preparation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { BottomNavigation } from '@/components/layout/BottomNavigation';

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

  // ✅ Redirection vers l'historique corrigée
  const handleViewHistory = () => {
    router.push('/preparations/history');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Préparations</h1>
          <p className="text-gray-600 mt-1">Gérez vos préparations de véhicules</p>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="p-4 space-y-6">
        {/* Affichage des erreurs */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions principales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Car className="h-6 w-6 mr-2 text-blue-600" />
              Nouvelle préparation
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Commencez une nouvelle préparation de véhicule
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
          
          {/* ✅ Voir l'historique - lien fonctionnel */}
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

          {/* Statistiques rapides - placeholder */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Performance</h3>
                  <p className="text-sm text-gray-600">Vos statistiques détaillées</p>
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

      {/* ✅ Navigation Bottom */}
      <BottomNavigation />
    </div>
  );
};

export default PreparationsPage;