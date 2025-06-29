'use client';

import { useEffect } from 'react';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EditUserError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erreur page édition utilisateur:', error);
  }, [error]);

  const handleBackToList = () => {
    window.location.href = '/users';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleBackToList}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-red-600">
            Erreur de chargement
          </h1>
          <p className="text-gray-600 mt-1">
            Une erreur est survenue lors du chargement de la page d'édition
          </p>
        </div>
      </div>

      {/* Error card */}
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erreur:</strong> {error.message || 'Une erreur inattendue est survenue'}
              {error.digest && (
                <div className="mt-2 text-xs text-gray-500">
                  ID: {error.digest}
                </div>
              )}
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-4 mt-6">
            <Button onClick={reset} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
            <Button variant="outline" onClick={handleBackToList}>
              Retour à la liste
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                Détails de l'erreur (dev)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}