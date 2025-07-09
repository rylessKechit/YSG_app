// admin-app/src/app/(dashboard)/preparations/components/photos-viewer.tsx
'use client';

import { useState } from 'react';
import { Camera, X, ChevronLeft, ChevronRight, Download, ZoomIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/loading-spinner';

import { usePreparationPhotos } from '@/hooks/api/usePreparations';
import type { Preparation, PreparationStep } from '@/types/preparation';
import { PREPARATION_STEP_LABELS, PREPARATION_STEP_ICONS } from '@/types/preparation';

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
  completedAt: string;
  notes?: string;
}

export function PhotosViewer({
  open,
  onOpenChange,
  preparation
}: PhotosViewerProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const { data: photosData, isLoading } = usePreparationPhotos(
    preparation?.id || ''
  );

  const photos = photosData?.data.photos || [];

  const handlePhotoClick = (photo: PhotoData, index: number) => {
    setSelectedPhoto(photo);
    setCurrentPhotoIndex(index);
  };

  const handleNextPhoto = () => {
    if (currentPhotoIndex < photos.length - 1) {
      const nextIndex = currentPhotoIndex + 1;
      setCurrentPhotoIndex(nextIndex);
      setSelectedPhoto(photos[nextIndex]);
    }
  };

  const handlePrevPhoto = () => {
    if (currentPhotoIndex > 0) {
      const prevIndex = currentPhotoIndex - 1;
      setCurrentPhotoIndex(prevIndex);
      setSelectedPhoto(photos[prevIndex]);
    }
  };

  const handleDownload = (photoUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-8">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <div className="text-muted-foreground">
                Aucune photo disponible pour cette préparation
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Statistiques */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{photos.length}</div>
                  <div className="text-sm text-muted-foreground">Total photos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {Object.keys(photosData?.data.preparation.photosByStep || {}).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Étapes avec photos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {preparation.steps.filter(s => s.completed).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Étapes terminées</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{preparation.progress}%</div>
                  <div className="text-sm text-muted-foreground">Progression</div>
                </div>
              </div>

              {/* Galerie par étapes */}
              <div className="space-y-4">
                {Object.entries(
                  photos.reduce((acc, photo) => {
                    if (!acc[photo.stepType]) acc[photo.stepType] = [];
                    acc[photo.stepType].push(photo);
                    return acc;
                  }, {} as Record<string, PhotoData[]>)
                ).map(([stepType, stepPhotos]) => (
                  <div key={stepType} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{PREPARATION_STEP_ICONS[stepType as PreparationStep]}</span>
                      <span className="font-medium">{PREPARATION_STEP_LABELS[stepType as PreparationStep]}</span>
                      <Badge variant="outline" className="text-xs">
                        {stepPhotos.length} photo(s)
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {stepPhotos.map((photo, index) => (
                        <div
                          key={`${photo.stepType}-${photo.photoIndex}`}
                          className="relative group cursor-pointer"
                          onClick={() => handlePhotoClick(photo, photos.findIndex(p => p === photo))}
                        >
                          <img
                            src={photo.photoUrl}
                            alt={`${photo.stepLabel} - Photo ${photo.photoIndex + 1}`}
                            className="w-full h-24 object-cover rounded-lg border hover:border-primary transition-colors"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {photo.photoIndex + 1}
                          </div>
                        </div>
                      ))}
                    </div>

                    {stepPhotos[0]?.notes && (
                      <div className="mt-2 text-sm text-muted-foreground">
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

      {/* Dialog photo en grand */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="sm:max-w-4xl p-0">
          {selectedPhoto && (
            <div className="relative">
              {/* Header */}
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
                  <span>{selectedPhoto.stepIcon}</span>
                  <span className="font-medium">{selectedPhoto.stepLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(
                      selectedPhoto.photoUrl,
                      `${preparation.vehicle.licensePlate}_${selectedPhoto.stepType}_${selectedPhoto.photoIndex + 1}.jpg`
                    )}
                    className="bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPhoto(null)}
                    className="bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Photo */}
              <div className="relative bg-black">
                <img
                  src={selectedPhoto.photoUrl}
                  alt={`${selectedPhoto.stepLabel} - Photo ${selectedPhoto.photoIndex + 1}`}
                  className="w-full max-h-[70vh] object-contain mx-auto"
                />

                {/* Navigation */}
                {photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrevPhoto}
                      disabled={currentPhotoIndex === 0}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextPhoto}
                      disabled={currentPhotoIndex === photos.length - 1}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="absolute bottom-4 left-4 right-4 z-10">
                <div className="bg-black bg-opacity-50 text-white p-3 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Photo {currentPhotoIndex + 1} sur {photos.length}
                    </span>
                    <span className="text-xs">
                      {new Date(selectedPhoto.completedAt).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  {selectedPhoto.notes && (
                    <div className="text-sm">
                      <strong>Notes:</strong> {selectedPhoto.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}