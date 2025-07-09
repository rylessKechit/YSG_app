// admin-app/src/app/(dashboard)/preparations/[id]/page.tsx - MISE À JOUR AVEC SUPPRESSION
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Download, 
  RefreshCw,
  Camera,
  Clock,
  User,
  Building2,
  Car,
  MoreHorizontal
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/common/loading-spinner';

import { usePreparation } from '@/hooks/api/usePreparations';
import { DeletePreparationDialog } from '@/components/preparations/delete-preparation-dialog';

import type { Preparation } from '@/types/preparation';
import { 
  PREPARATION_STATUS_LABELS,
  PREPARATION_STEP_LABELS, 
  getStatusColor,
  formatDuration 
} from '@/types/preparation';

interface PreparationDetailPageProps {
  params: {
    id: string;
  };
}

export default function PreparationDetailPage({ params }: PreparationDetailPageProps) {
  const router = useRouter();
  const { id } = params;

  const [activeTab, setActiveTab] = useState<'details' | 'steps' | 'photos' | 'history'>('details');

  // Hooks API
  const { 
    data: preparationData, 
    isLoading, 
    error,
    refetch 
  } = usePreparation(id);

  const preparation = preparationData?.data?.preparation;

  // Handlers
  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    router.push(`/preparations/${id}/edit`);
  };

  const handleDeleteSuccess = () => {
    router.push('/preparations');
  };

  const handleRefresh = () => {
    refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !preparation) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {error ? 'Erreur de chargement' : 'Préparation non trouvée'}
            </h3>
            <p className="text-gray-600 mb-4">
              {error ? 'Impossible de charger les détails de la préparation' : 'Cette préparation n\'existe pas ou a été supprimée'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              {error && (
                <Button onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Préparation #{preparation.id.slice(-6)}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Car className="h-4 w-4" />
                {preparation.vehicle?.brand} {preparation.vehicle?.model}
              </div>
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {preparation.agency?.name}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {preparation.user?.name}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge de statut */}
          <Badge className={`${getStatusColor(preparation.status)} px-3 py-1`}>
            {PREPARATION_STATUS_LABELS[preparation.status]}
          </Badge>

          {/* Actions rapides */}
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>

          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>

          {/* Menu actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => window.print()}>
                <Download className="h-4 w-4 mr-2" />
                Exporter en PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(window.location.href)}>
                <Camera className="h-4 w-4 mr-2" />
                Copier le lien
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DeletePreparationDialog
                preparation={preparation}
                onSuccess={handleDeleteSuccess}
              >
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DeletePreparationDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'details', label: 'Détails', icon: Car },
            { id: 'steps', label: 'Étapes', icon: Clock },
            { id: 'photos', label: 'Photos', icon: Camera },
            { id: 'history', label: 'Historique', icon: RefreshCw }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="space-y-6">
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informations du véhicule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Véhicule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Modèle</p>
                  <p className="text-lg font-semibold">
                    {preparation.vehicle?.model}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Plaque d'immatriculation</p>
                  <p className="font-mono text-lg">{preparation.vehicle?.licensePlate}</p>
                </div>
              </CardContent>
            </Card>

            {/* Informations de la préparation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Préparation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Statut</p>
                  <Badge className={getStatusColor(preparation.status)}>
                    {PREPARATION_STATUS_LABELS[preparation.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Progression</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${preparation.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{preparation.progress}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Durée totale</p>
                  <p>{formatDuration((preparation.totalTime) || 0)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Heure de début</p>
                  <p>{preparation.startTime ? new Date(preparation.startTime).toLocaleString('fr-FR') : 'Non démarré'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Heure de fin</p>
                  <p>{preparation.endTime ? new Date(preparation.endTime).toLocaleString('fr-FR') : 'En cours'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Respect des délais</p>
                  <Badge className={preparation.isOnTime ? "success" : "destructive"}>
                    {preparation.isOnTime ? 'Dans les temps' : 'En retard'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Informations utilisateur et agence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Assignation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Préparateur</p>
                  <p className="font-semibold">{preparation.user?.name}</p>
                  <p className="text-sm text-gray-600">{preparation.user?.email}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-500">Agence</p>
                  <p className="font-semibold">{preparation.agency?.name}</p>
                  <p className="text-sm text-gray-600">
                    {preparation.agency?.code} - {preparation.agency?.client}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Adresse</p>
                  <p className="text-sm">{preparation.agency?.address}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'steps' && (
          <Card>
            <CardHeader>
              <CardTitle>Étapes de préparation</CardTitle>
              <CardDescription>
                Détail de chaque étape et progression
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {preparation.steps?.map((step, index) => (
                  <div key={step.step} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {step.completed ? '✓' : index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{PREPARATION_STEP_LABELS[step.step]}</h4>
                      {step.notes && (
                        <p className="text-sm text-gray-600 mt-1">{step.notes}</p>
                      )}
                      {step.completedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Terminé le {new Date(step.completedAt).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                    <Badge className={step.completed ? "success" : "secondary"}>
                      {step.completed ? 'Terminé' : 'En attente'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'photos' && (
          <Card>
            <CardHeader>
              <CardTitle>Photos de la préparation</CardTitle>
              <CardDescription>
                Photos prises pendant la préparation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {preparation.steps?.map(step => 
                  step.photos?.map((photo, index) => (
                    <div key={`${step.step}-${index}`} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={photo} 
                        alt={`Photo ${PREPARATION_STEP_LABELS[step.step]}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    </div>
                  ))
                )}
                {!preparation.steps?.some(step => (step.photos?.length || 0) > 0) && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune photo disponible</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'history' && (
          <Card>
            <CardHeader>
              <CardTitle>Historique des modifications</CardTitle>
              <CardDescription>
                Chronologie des changements apportés à cette préparation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {preparation.agencyHistory?.map((change, index) => (
                  <div key={index} className="flex gap-4 p-4 border-l-2 border-blue-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <h4 className="font-medium">Changement d'agence</h4>
                      <p className="text-sm text-gray-600">
                        De {change.fromAgency?.name} vers {change.toAgency?.name}
                      </p>
                      {change.reason && (
                        <p className="text-sm text-gray-500 mt-1">Raison: {change.reason}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(change.changedAt).toLocaleString('fr-FR')} par {change.changedBy?.name}
                      </p>
                    </div>
                  </div>
                ))}
                
                <div className="flex gap-4 p-4 border-l-2 border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <h4 className="font-medium">Préparation créée</h4>
                    <p className="text-sm text-gray-600">
                      Préparation assignée à {preparation.user?.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(preparation.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes */}
      {preparation.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{preparation.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Problèmes signalés */}
      {preparation.issues && preparation.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Problèmes signalés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {preparation.issues.map((issue, index) => (
                <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-red-800">{issue.type}</h4>
                      <p className="text-red-700 mt-1">{issue.description}</p>
                    </div>
                    <Badge variant="destructive">{issue.severity}</Badge>
                  </div>
                  {issue.photos && issue.photos.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {issue.photos.map((photo, photoIndex) => (
                        <img
                          key={photoIndex}
                          src={photo}
                          alt={`Problème ${issue.type}`}
                          className="w-16 h-16 object-cover rounded cursor-pointer"
                          onClick={() => window.open(photo, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}