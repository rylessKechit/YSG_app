// admin-app/src/components/preparations/photos-viewer.tsx - FICHIER COMPLET CORRIGÉ
'use client';

import { useState, useEffect } from 'react';
import { Camera, X, ChevronLeft, ChevronRight, Download, ZoomIn, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/common/loading-spinner';

import { usePreparationPhotos } from '@/hooks/api/usePreparations';
import type { Preparation, PreparationStep } from '@/types/preparation';
import { PREPARATION_STEP_LABELS } from '@/types/preparation';

const PREPARATION_STEP_ICONS: Record<string, string> = {
  'exterior': '🚗',
  'interior': '🧽',
  'fuel': '⛽',
  'special_wash': '✨',
};

interface PhotosViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preparation: Preparation | null;
}

interface PhotoData {
  stepType: string;
  stepLabel: string;
  stepIcon: string;
  photoUrl: string;
  photoIndex: number;
  completedAt?: string;
  notes?: string;
  description?: string;
}

export function PhotosViewer({
  open,
  onOpenChange,
  preparation
}: PhotosViewerProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const { data: photosData, isLoading, error } = usePreparationPhotos(
    preparation?.id || ''
  );

  const photos: PhotoData[] = photosData?.data?.photos || [];

  // ✅ Debug des données reçues
  useEffect(() => {
    if (photosData && !isLoading) {
      console.log('📸 Données photos reçues:', {
        totalPhotos: photos.length,
        stats: photosData.data?.stats,
        firstPhoto: photos[0]
      });
      
      // Debug des URLs de photos
      photos.forEach((photo: PhotoData, index: number) => {
        console.log(`Photo ${index + 1}:`, {
          stepType: photo.stepType,
          photoUrl: photo.photoUrl,
          urlLength: photo.photoUrl?.length,
          isValidUrl: photo.photoUrl?.startsWith('http')
        });
      });
    }
  }, [photosData, isLoading, photos]);

  // ✅ Gestionnaire de clic photo avec vérification
  const handlePhotoClick = (photo: PhotoData, index: number) => {
    console.log('🖱️ Clic sur photo:', { photo, index });
    setSelectedPhoto(photo);
    setCurrentPhotoIndex(index);
  };

  // ✅ Navigation photo suivante avec vérifications
  const handleNextPhoto = () => {
    if (currentPhotoIndex < photos.length - 1) {
      const nextIndex = currentPhotoIndex + 1;
      const nextPhoto = photos[nextIndex];
      if (nextPhoto) {
        setCurrentPhotoIndex(nextIndex);
        setSelectedPhoto(nextPhoto);
      }
    }
  };

  // ✅ Navigation photo précédente avec vérifications
  const handlePrevPhoto = () => {
    if (currentPhotoIndex > 0) {
      const prevIndex = currentPhotoIndex - 1;
      const prevPhoto = photos[prevIndex];
      if (prevPhoto) {
        setCurrentPhotoIndex(prevIndex);
        setSelectedPhoto(prevPhoto);
      }
    }
  };

  // ✅ Gestionnaire de téléchargement
  const handleDownload = (photoUrl: string, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = photoUrl;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error);
    }
  };

  // ✅ Gestion des erreurs d'image
  const handleImageError = (photoUrl: string) => {
    console.error('❌ Erreur de chargement image:', photoUrl);
    setImageErrors(prev => new Set([...prev, photoUrl]));
  };

  const handleImageLoad = (photoUrl: string) => {
    console.log('✅ Image chargée avec succès:', photoUrl);
    setImageErrors(prev => {
      const newErrors = new Set(prev);
      newErrors.delete(photoUrl);
      return newErrors;
    });
  };

  // ✅ Réinitialiser l'état quand la dialog se ferme
  useEffect(() => {
    if (!open) {
      setSelectedPhoto(null);
      setCurrentPhotoIndex(0);
      setImageErrors(new Set());
    }
  }, [open]);

  if (!preparation) return null;

  return (
    <>
      {/* Dialog principal - Galerie */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photos de préparation - {preparation.vehicle.licensePlate}
            </DialogTitle>
            <DialogDescription>
              {photos.length} photo(s) prise(s) lors de la préparation
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Erreur lors du chargement des photos : {error.message}
              </AlertDescription>
            </Alert>
          ) : photos.length === 0 ? (
            <div className="text-center py-8">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune photo disponible pour cette préparation</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ✅ Résumé statistiques */}
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{photos.length}</div>
                  <div className="text-sm text-muted-foreground">Total photos</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {photosData?.data?.stepsWithPhotos || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Étapes avec photos</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {photosData?.data?.completedSteps || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Étapes terminées</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {photosData?.data?.totalSteps && photosData?.data?.completedSteps 
                      ? Math.round((photosData.data.completedSteps / photosData.data.totalSteps) * 100)
                      : preparation?.progress || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Progression</div>
                </div>
              </div>

              {/* ✅ Alerte si des images n'ont pas pu charger */}
              {imageErrors.size > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {imageErrors.size} image(s) n'ont pas pu être chargées. Vérifiez les URLs Cloudinary.
                  </AlertDescription>
                </Alert>
              )}

              {/* ✅ Galerie par étapes */}
              <div className="space-y-4">
                {Object.entries(
                  photos.reduce<Record<string, PhotoData[]>>((acc, photo: PhotoData) => {
                    const stepType = photo.stepType || 'unknown';
                    if (!acc[stepType]) acc[stepType] = [];
                    acc[stepType].push(photo);
                    return acc;
                  }, {} as Record<string, PhotoData[]>)
                ).map(([stepType, stepPhotos]: [string, PhotoData[]]) => (
                  <div key={stepType} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">
                        {PREPARATION_STEP_ICONS[stepType] || '📋'}
                      </span>
                      <span className="font-medium">
                        {PREPARATION_STEP_LABELS[stepType as keyof typeof PREPARATION_STEP_LABELS] || stepType}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {stepPhotos.length} photo(s)
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {stepPhotos.map((photo: PhotoData, index: number) => {
                        const globalPhotoIndex = photos.findIndex((p: PhotoData) => 
                          p.stepType === photo.stepType && p.photoIndex === photo.photoIndex
                        );
                        
                        return (
                          <div
                            key={`${photo.stepType}-${photo.photoIndex}-${index}`}
                            className="relative group cursor-pointer"
                            onClick={() => {
                              const photoIndex = globalPhotoIndex !== -1 ? globalPhotoIndex : index;
                              handlePhotoClick(photo, photoIndex);
                            }}
                          >
                            {imageErrors.has(photo.photoUrl) ? (
                              // ✅ Placeholder pour les images en erreur
                              <div className="w-full h-24 bg-gray-100 border border-red-300 rounded-lg flex items-center justify-center">
                                <div className="text-center">
                                  <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-1" />
                                  <div className="text-xs text-red-500">Erreur</div>
                                </div>
                              </div>
                            ) : (
                              <img
                                src={photo.photoUrl}
                                alt={`${photo.stepLabel} - Photo ${(photo.photoIndex || 0) + 1}`}
                                className="w-full h-24 object-cover rounded-lg border hover:border-primary transition-colors"
                                onError={() => handleImageError(photo.photoUrl)}
                                onLoad={() => handleImageLoad(photo.photoUrl)}
                                loading="lazy"
                              />
                            )}
                            
                            {/* Overlay hover */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            
                            {/* Numéro de photo */}
                            <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                              {(photo.photoIndex || 0) + 1}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Notes de l'étape */}
                    {stepPhotos[0]?.notes && (
                      <div className="mt-3 p-2 bg-muted rounded text-sm">
                        <strong>Notes:</strong> {stepPhotos[0].notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ✅ Dialog photo en grand */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{selectedPhoto?.stepIcon || '📋'}</span>
              {selectedPhoto?.stepLabel || 'Photo'} - Photo {(currentPhotoIndex + 1)} sur {photos.length}
            </DialogTitle>
            <DialogDescription>
              {selectedPhoto?.description || `Photo prise le ${
                selectedPhoto?.completedAt 
                  ? new Date(selectedPhoto.completedAt).toLocaleDateString('fr-FR')
                  : 'Date inconnue'
              }`}
            </DialogDescription>
          </DialogHeader>

          {selectedPhoto && (
            <div className="relative">
              {imageErrors.has(selectedPhoto.photoUrl) ? (
                <div className="w-full h-96 bg-gray-100 border border-red-300 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                    <div className="text-red-500">Impossible de charger l'image</div>
                    <div className="text-xs text-gray-500 mt-1">{selectedPhoto.photoUrl}</div>
                  </div>
                </div>
              ) : (
                <img
                  src={selectedPhoto.photoUrl}
                  alt={`${selectedPhoto.stepLabel} - Photo ${(selectedPhoto.photoIndex || 0) + 1}`}
                  className="w-full max-h-[60vh] object-contain rounded-lg"
                  onError={() => handleImageError(selectedPhoto.photoUrl)}
                  onLoad={() => handleImageLoad(selectedPhoto.photoUrl)}
                />
              )}

              {/* ✅ Navigation entre photos */}
              {photos.length > 1 && (
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
                    disabled={currentPhotoIndex === photos.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}

          {/* ✅ Actions et métadonnées */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {selectedPhoto?.stepType}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {selectedPhoto?.completedAt 
                  ? new Date(selectedPhoto.completedAt).toLocaleString('fr-FR')
                  : 'Date inconnue'}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedPhoto && handleDownload(
                selectedPhoto.photoUrl,
                `${preparation.vehicle.licensePlate}_${selectedPhoto.stepType}_photo_${(selectedPhoto.photoIndex || 0) + 1}.jpg`
              )}
              disabled={!selectedPhoto || imageErrors.has(selectedPhoto.photoUrl)}
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </div>

          {/* ✅ Notes de la photo */}
          {selectedPhoto?.notes && (
            <div className="bg-muted p-3 rounded-lg">
              <strong>Notes:</strong> {selectedPhoto.notes}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}