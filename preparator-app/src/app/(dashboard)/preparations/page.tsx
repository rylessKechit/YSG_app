// preparator-app/src/app/(dashboard)/preparations/page.tsx
// ✅ Page préparations avec lien vers les stats

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
  BarChart3  // ✅ AJOUTÉ pour l'icône des stats
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
    if (currentPreparation && !isLoading) {
      console.log('📋 Préparation en cours détectée, redirection...');
      router.push(`/preparations/${currentPreparation.id}`);
    }
  }, [currentPreparation, isLoading, router]);

  // Gestionnaires d'événements
  const handleStartNewPreparation = () => {
    router.push('/preparations/new');
  };

  const handleViewHistory = () => {
    router.push('/preparations/history');
  };

  // Rendu en cas de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des préparations en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Préparations</h1>
          <p className="text-gray-600">Gérez vos préparations de véhicules</p>
        </div>

        {/* Affichage des erreurs */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center text-red-600">
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

          {/* ✅ MODIFIÉ: Lien vers les statistiques au lieu de "Bientôt" */}
          <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardContent 
              className="p-4"
              onClick={() => router.push('/stats')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Mes statistiques</h3>
                    <p className="text-sm text-gray-600">Performance et analyses détaillées</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
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