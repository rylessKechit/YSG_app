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
  AlertTriangle
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
    toast({
      title: "Fonctionnalité à venir",
      description: "L'historique des préparations sera bientôt disponible.",
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des préparations en cours...</p>
        </div>
      </div>
    );
  }

  // Si une préparation est en cours, on sera redirigé automatiquement
  // Cette page n'apparaît que s'il n'y a pas de préparation en cours

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Préparations</h1>
          <p className="text-sm text-gray-600">Gestion des préparations véhicules</p>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Message d'erreur si applicable */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center text-red-700">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aucune préparation en cours */}
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Car className="h-8 w-8 text-gray-400" />
            </div>
            <CardTitle className="text-lg">Aucune préparation en cours</CardTitle>
            <p className="text-sm text-gray-600">
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
    </div>
  );
};

export default PreparationsPage;