// app/(dashboard)/preparations/[id]/view/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { PreparationViewer } from '@/components/preparations/PreparationViewer';
import { apiClient } from '@/lib/api/client';
import type { Preparation } from '@/lib/types';

export default function PreparationViewPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [preparation, setPreparation] = useState<Preparation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const preparationId = params.id as string;

  // Charger les détails de la préparation
  useEffect(() => {
    const fetchPreparation = async () => {
      if (!preparationId) return;

      try {
        setIsLoading(true);
        setError(null);

        // Utiliser l'API existante pour récupérer les détails
        const response = await apiClient.get(`/preparations/${preparationId}`);

        if (response.data.success) {
          setPreparation(response.data.data);
        } else {
          throw new Error(response.data.message || 'Erreur lors du chargement');
        }
      } catch (err: any) {
        console.error('Erreur chargement préparation:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement des détails';
        setError(errorMessage);
        toast({
          title: "Erreur",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreparation();
  }, [preparationId, toast]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Chargement des détails...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !preparation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-semibold text-gray-900">
            Préparation introuvable
          </h2>
          <p className="text-gray-600">
            {error || 'Cette préparation n\'existe pas ou n\'est plus accessible.'}
          </p>
          <Button 
            onClick={() => router.push('/preparations')}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux préparations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header mobile */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 px-4 py-3 flex items-center justify-between" style={{
        paddingTop: `max(0.75rem, env(safe-area-inset-top))`,
        height: `calc(4rem + env(safe-area-inset-top))`
      }}>
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="p-2 -ml-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-gray-900 truncate">
          Détails préparation
        </h1>
        <div></div> {/* Spacer pour le flex */}
      </div>

      {/* Contenu principal */}
      <div className="px-4 space-y-6" style={{ 
        marginTop: 'calc(4rem + env(safe-area-inset-top))',
        paddingTop: '1.5rem',
        paddingBottom: '1.5rem'
      }}>
        <PreparationViewer preparation={preparation} />
      </div>
    </div>
  );
}