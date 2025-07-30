// admin-app/src/app/(dashboard)/preparations/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  RefreshCw, 
  Edit, 
  MoreHorizontal, 
  Download, 
  Camera, 
  Trash2, 
  Car, 
  Building2, 
  User, 
  Clock,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/common/loading-spinner';

import { usePreparation } from '@/hooks/api/usePreparations';

interface DeleteDialogProps {
  preparation: any;
  onSuccess: () => void;
  children: React.ReactNode;
}

// Types pour les constantes
const PREPARATION_STATUS_LABELS: Record<string, string> = {
  'pending': 'En attente',
  'in_progress': 'En cours',
  'completed': 'Terminée',
  'cancelled': 'Annulée',
  'on_hold': 'En pause'
};

const PREPARATION_STEP_LABELS: Record<string, string> = {
  'exterior': 'Extérieur',
  'interior': 'Intérieur',
  'fuel': 'Carburant',
  'special_wash': 'Lavage Spécial',
};

const PREPARATION_STEP_ICONS: Record<string, string> = {
  'exterior': '🚗',
  'interior': '🧽',
  'fuel': '⛽',
  'special_wash': '✨',
};

// Composant DeletePreparationDialog simplifié pour éviter les erreurs d'import
function DeletePreparationDialog({ preparation, onSuccess, children }: DeleteDialogProps) {
  const handleDelete = () => {
    // TODO: Implémenter la logique de suppression
    console.log('Suppression de la préparation:', preparation?.id);
    onSuccess();
  };

  return (
    <div onClick={handleDelete}>
      {children}
    </div>
  );
}

interface PageProps {
  params: {
    id: string;
  };
}

type TabType = 'details' | 'steps' | 'photos' | 'history';

export default function PreparationDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  
  // États pour le modal de photos
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [allPhotos, setAllPhotos] = useState<any[]>([]);

  const { data: response, isLoading, error, refetch } = usePreparation(params.id);
  
  // Extraction sécurisée des données
  const preparation: any = response?.data?.preparation || null;

  // Collecter toutes les photos pour la navigation
  const collectAllPhotos = () => {
    if (!preparation?.steps) return [];
    
    const photos: any[] = [];
    preparation.steps.forEach((step: any) => {
      if (step.photos && step.photos.length > 0) {
        step.photos.forEach((photo: any, photoIndex: number) => {
          photos.push({
            ...photo,
            stepType: step.step,
            stepLabel: PREPARATION_STEP_LABELS[step.step] || step.step,
            stepIcon: PREPARATION_STEP_ICONS[step.step] || '📋',
            photoIndex,
            originalStepIndex: photoIndex
          });
        });
      }
    });
    return photos;
  };

  // Fonctions utilitaires
  const formatDuration = (minutes?: number): string => {
    if (!minutes || minutes === 0) return '0min';
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Non définie';
    try {
      return new Date(dateString).toLocaleString('fr-FR');
    } catch {
      return 'Date invalide';
    }
  };

  // Gestionnaires d'événements
  const handleBack = (): void => {
    router.push('/preparations');
  };

  const handleRefresh = (): void => {
    refetch();
  };

  const handleEdit = (): void => {
    router.push(`/preparations/${params.id}/edit`);
  };

  const handleDeleteSuccess = (): void => {
    router.push('/preparations');
  };

  const handleCopyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  const handlePrint = (): void => {
    window.print();
  };

  // Gestionnaires pour le modal de photos
  const handlePhotoClick = (photo: any, step: any, photoIndex: number): void => {
    const photos = collectAllPhotos();
    setAllPhotos(photos);
    
    // Trouver l'index global de cette photo
    const globalIndex = photos.findIndex(p => 
      p.stepType === step.step && p.originalStepIndex === photoIndex
    );
    
    setCurrentPhotoIndex(globalIndex >= 0 ? globalIndex : 0);
    setSelectedPhoto({
      ...photo,
      stepType: step.step,
      stepLabel: PREPARATION_STEP_LABELS[step.step] || step.step,
      stepIcon: PREPARATION_STEP_ICONS[step.step] || '📋'
    });
    setIsPhotoModalOpen(true);
  };

  const handleNextPhoto = (): void => {
    if (currentPhotoIndex < allPhotos.length - 1) {
      const nextIndex = currentPhotoIndex + 1;
      setCurrentPhotoIndex(nextIndex);
      setSelectedPhoto(allPhotos[nextIndex]);
    }
  };

  const handlePrevPhoto = (): void => {
    if (currentPhotoIndex > 0) {
      const prevIndex = currentPhotoIndex - 1;
      setCurrentPhotoIndex(prevIndex);
      setSelectedPhoto(allPhotos[prevIndex]);
    }
  };

  const handleDownloadPhoto = (photoUrl: string, fileName: string): void => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // États de chargement et d'erreur
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !preparation) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
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
                {preparation.vehicle?.brand || ''} {preparation.vehicle?.model || ''}
              </div>
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {preparation.agency?.name || ''}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {preparation.user?.name || ''}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge de statut */}
          <Badge className={`${getStatusColor(preparation.status)} px-3 py-1`}>
            {PREPARATION_STATUS_LABELS[preparation.status] || preparation.status}
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
              <DropdownMenuItem onClick={handlePrint}>
                <Download className="h-4 w-4 mr-2" />
                Exporter en PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
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
                onClick={() => setActiveTab(tab.id as TabType)}
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
                    {preparation.vehicle?.model || 'Non spécifié'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Plaque d'immatriculation</p>
                  <p className="font-mono text-lg">{preparation.vehicle?.licensePlate || 'Non spécifiée'}</p>
                </div>
                {preparation.vehicle?.brand && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Marque</p>
                    <p>{preparation.vehicle.brand}</p>
                  </div>
                )}
                {preparation.vehicle?.year && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Année</p>
                    <p>{preparation.vehicle.year}</p>
                  </div>
                )}
                {preparation.vehicle?.fuelType && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Carburant</p>
                    <p className="capitalize">{preparation.vehicle.fuelType}</p>
                  </div>
                )}
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
                    {PREPARATION_STATUS_LABELS[preparation.status] || preparation.status}
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
                  <p>{formatDuration(preparation.totalTime)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Heure de début</p>
                  <p>{formatDate(preparation.startTime)}</p>
                </div>
                {preparation.endTime && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Heure de fin</p>
                    <p>{formatDate(preparation.endTime)}</p>
                  </div>
                )}
                {preparation.isOnTime !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Respect des délais</p>
                    <Badge className={preparation.isOnTime ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {preparation.isOnTime ? 'Dans les temps' : 'En retard'}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informations de l'agence et du préparateur */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Assignation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Préparateur</p>
                  <p className="font-semibold">{preparation.user?.name || 'Non assigné'}</p>
                  <p className="text-sm text-gray-600">{preparation.user?.email || ''}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Agence</p>
                  <p className="font-semibold">{preparation.agency?.name || 'Non spécifiée'}</p>
                  <p className="text-sm text-gray-600">
                    {preparation.agency?.code || ''} - {preparation.agency?.client || ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Adresse</p>
                  <p className="text-sm text-gray-600">194 avenue maréchal leclerc, 91300 Massy</p>
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
                Progression détaillée des étapes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {preparation.steps?.map((step: any, index: any) => (
                  <div key={step.step} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.completed 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {step.completed ? '✓' : index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium flex items-center gap-2">
                        <span>{PREPARATION_STEP_ICONS[step.step] || '📋'}</span>
                        {PREPARATION_STEP_LABELS[step.step] || step.step}
                      </h4>
                      {step.notes && (
                        <p className="text-sm text-gray-600 mt-1">{step.notes}</p>
                      )}
                      {step.completedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Terminé le {formatDate(step.completedAt)}
                        </p>
                      )}
                      {step.photos && step.photos.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          {step.photos.length} photo(s) disponible(s)
                        </p>
                      )}
                    </div>
                    <Badge className={step.completed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                      {step.completed ? 'Terminé' : 'En attente'}
                    </Badge>
                  </div>
                )) || (
                  <p className="text-center text-gray-500 py-8">Aucune étape définie</p>
                )}
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
                {preparation.steps?.map((step: any) => 
                  step.photos?.map((photo: any, index: any) => (
                    <div 
                      key={`${step.step}-${index}`} 
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden group relative cursor-pointer"
                      onClick={() => handlePhotoClick(photo, step, index)}
                    >
                      <img 
                        src={photo.url}
                        alt={`Photo ${PREPARATION_STEP_LABELS[step.step] || step.step} - ${photo.description || ''}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                        onError={(e) => {
                          console.error('Erreur chargement image:', photo.url);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {/* Badge de l'étape */}
                      <div className="absolute top-2 left-2">
                        <Badge className="text-xs bg-white/90 text-gray-800">
                          {PREPARATION_STEP_ICONS[step.step] || '📋'} {PREPARATION_STEP_LABELS[step.step] || step.step}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
                {(!preparation.steps || !preparation.steps.some((step: any) => step.photos && step.photos.length > 0)) && (
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
                {/* Création */}
                <div className="flex items-start gap-3 p-3 border-l-2 border-blue-200 bg-blue-50/50">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium">Préparation créée</p>
                    <p className="text-sm text-gray-600">
                      Créée le {formatDate(preparation.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Étapes complétées */}
                {preparation.steps?.filter((step: any) => step.completed).map((step: any) => (
                  <div key={`history-${step.step}`} className="flex items-start gap-3 p-3 border-l-2 border-green-200 bg-green-50/50">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="font-medium">
                        Étape "{PREPARATION_STEP_LABELS[step.step] || step.step}" terminée
                      </p>
                      {step.completedAt && (
                        <p className="text-sm text-gray-600">
                          Terminée le {formatDate(step.completedAt)}
                        </p>
                      )}
                      {step.notes && (
                        <p className="text-sm text-gray-700 mt-1 italic">"{step.notes}"</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Finalisation */}
                {preparation.status === 'completed' && preparation.endTime && (
                  <div className="flex items-start gap-3 p-3 border-l-2 border-purple-200 bg-purple-50/50">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="font-medium">Préparation terminée</p>
                      <p className="text-sm text-gray-600">
                        Finalisée le {formatDate(preparation.endTime)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Durée totale: {formatDuration(preparation.totalTime)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Dernière modification */}
                <div className="flex items-start gap-3 p-3 border-l-2 border-gray-200 bg-gray-50/50">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium">Dernière modification</p>
                    <p className="text-sm text-gray-600">
                      Modifiée le {formatDate(preparation.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes générales si présentes */}
      {preparation.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes de préparation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{preparation.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Incidents si présents */}
      {preparation.issues && preparation.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Incidents signalés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {preparation.issues.map((issue: any, index: any) => (
                <div key={index} className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-orange-800">
                        {issue.type} - {issue.severity}
                      </p>
                      <p className="text-sm text-orange-700 mt-1">{issue.description}</p>
                      <p className="text-xs text-orange-600 mt-2">
                        Signalé le {formatDate(issue.reportedAt)}
                      </p>
                    </div>
                    <Badge className={issue.resolved ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                      {issue.resolved ? 'Résolu' : 'En cours'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de visualisation des photos */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedPhoto?.stepIcon}</span>
                <span>{selectedPhoto?.stepLabel}</span>
                <Badge variant="outline" className="text-xs">
                  {currentPhotoIndex + 1} sur {allPhotos.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPhotoModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="relative px-6">
            {selectedPhoto && (
              <div className="relative">
                <img
                  src={selectedPhoto.url}
                  alt={`${selectedPhoto.stepLabel} - ${selectedPhoto.description || ''}`}
                  className="w-full max-h-[60vh] object-contain rounded-lg"
                  onError={(e) => {
                    console.error('Erreur chargement image modal:', selectedPhoto.url);
                  }}
                />

                {/* Boutons de navigation */}
                {allPhotos.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                      onClick={handlePrevPhoto}
                      disabled={currentPhotoIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                      onClick={handleNextPhoto}
                      disabled={currentPhotoIndex === allPhotos.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="p-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {selectedPhoto?.description && (
                  <p className="text-sm text-gray-600 mb-2">
                    {selectedPhoto.description}
                  </p>
                )}
                {selectedPhoto?.uploadedAt && (
                  <p className="text-xs text-gray-500">
                    Prise le {formatDate(selectedPhoto.uploadedAt)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPhoto(
                    selectedPhoto?.url || '',
                    `photo-${selectedPhoto?.stepType}-${Date.now()}.jpg`
                  )}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedPhoto?.url, '_blank')}
                >
                  <ZoomIn className="h-4 w-4 mr-2" />
                  Ouvrir dans un nouvel onglet
                </Button>
              </div>
            </div>

            {/* Miniatures de navigation */}
            {allPhotos.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {allPhotos.map((photo, index) => (
                    <div
                      key={`thumb-${photo.stepType}-${photo.photoIndex}`}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        index === currentPhotoIndex 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setCurrentPhotoIndex(index);
                        setSelectedPhoto(photo);
                      }}
                    >
                      <img
                        src={photo.url}
                        alt={`${photo.stepLabel} miniature`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}