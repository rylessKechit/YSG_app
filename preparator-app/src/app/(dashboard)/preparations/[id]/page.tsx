// ========================================
// FICHIER: preparator-app/src/app/(dashboard)/preparations/[id]/page.tsx
// ✅ MODIFICATION : Utiliser le nouveau workflow checkbox
// ========================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckboxWorkflow } from '@/components/preparations/CheckboxWorkflow';
import { apiClient } from '@/lib/api/client';
import type { Preparation } from '@/lib/types';

export default function PreparationPage() {
  const router = useRouter();
  const params = useParams();
  const preparationId = params.id as string;

  const [preparation, setPreparation] = useState<Preparation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les détails de la préparation
  useEffect(() => {
    const loadPreparation = async () => {
      if (!preparationId) return;

      try {
        setIsLoading(true);
        setError(null);

        const response = await apiClient.get<{
          success: boolean;
          data: { preparation: Preparation };
        }>(`/preparations/${preparationId}`);

        if (response.data.success) {
          setPreparation(response.data.data.preparation);
        } else {
          setError('Préparation non trouvée');
        }

      } catch (error: any) {
        console.error('❌ Erreur chargement préparation:', error);
        setError(error.response?.data?.message || 'Erreur lors du chargement');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreparation();
  }, [preparationId]);

  // ✅ Callback lors de la complétion d'une étape
  const handleStepComplete = async (stepType: string) => {
    if (!preparation) return;

    try {
      // Recharger la préparation pour avoir les données à jour
      const response = await apiClient.get<{
        success: boolean;
        data: { preparation: Preparation };
      }>(`/preparations/${preparationId}`);

      if (response.data.success) {
        setPreparation(response.data.data.preparation);
        console.log(`✅ Étape ${stepType} mise à jour`);
      }
    } catch (error) {
      console.error('❌ Erreur rechargement préparation:', error);
    }
  };

  // ✅ Callback lors de la finalisation
  const handleComplete = () => {
    router.push('/preparations?completed=true');
  };

  // Gestion du retour
  const handleBack = () => {
    router.push('/preparations');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-gray-600">Chargement de la préparation...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !preparation) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <Button
              onClick={handleBack}
              variant="ghost"
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux préparations
            </Button>
          </div>

          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Erreur :</strong> {error || 'Préparation non trouvée'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Vérifier le statut de la préparation
  if (preparation.status === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <Button
              onClick={handleBack}
              variant="ghost"
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux préparations
            </Button>
          </div>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <Badge className="bg-green-100 text-green-800 border-green-200 text-lg px-4 py-2">
                  ✅ Préparation terminée
                </Badge>
                
                <h2 className="text-2xl font-semibold text-green-800">
                  {preparation.vehicle.brand} {preparation.vehicle.model}
                </h2>
                <p className="text-green-700">
                  Plaque : {preparation.vehicle.licensePlate}
                </p>
                
                {preparation.endTime && (
                  <p className="text-sm text-green-600">
                    Terminée le {new Date(preparation.endTime).toLocaleDateString('fr-FR')} à{' '}
                    {new Date(preparation.endTime).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}

                <Button
                  onClick={handleBack}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Voir toutes les préparations
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (preparation.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <Button
              onClick={handleBack}
              variant="ghost"
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux préparations
            </Button>
          </div>

          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Préparation annulée</strong>
              <br />
              Cette préparation a été annulée et ne peut plus être modifiée.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // ✅ Rendu principal avec le nouveau workflow
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header avec bouton retour */}
        <div className="mb-6">
          <Button
            onClick={handleBack}
            variant="ghost"
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux préparations
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Préparation en cours
              </h1>
              <p className="text-gray-600 mt-1">
                Agence : {preparation.agency.name} ({preparation.agency.code})
              </p>
            </div>
            
            <Badge 
              className="bg-blue-100 text-blue-800 border-blue-200 text-sm px-3 py-1"
            >
              En cours
            </Badge>
          </div>
        </div>

        {/* ✅ Nouveau workflow avec checkboxes */}
        <CheckboxWorkflow
          preparation={preparation}
          onStepComplete={handleStepComplete}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}