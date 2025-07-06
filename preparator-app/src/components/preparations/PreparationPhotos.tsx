// components/preparations/PreparationPhotos.tsx
'use client';

import { useState } from 'react';
import { Camera, X, Download, ZoomIn } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Preparation } from '@/lib/types';
import { PREPARATION_STEPS } from '@/lib/types';

interface PreparationPhotosProps {
  preparation: Preparation;
}

interface PhotoWithContext {
  url: string;
  description?: string;
  stepType: string;
  stepLabel: string;
  stepIcon: string;
  uploadedAt?: Date;
}

export function PreparationPhotos({ preparation }: PreparationPhotosProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithContext | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Collecter toutes les photos avec leur contexte
  const allPhotos: PhotoWithContext[] = [];
  
  preparation.steps.forEach(step => {
    if (step.photos && step.photos.length > 0) {
      const stepDef = PREPARATION_STEPS.find(s => s.step === step.step);
      if (stepDef) {
        step.photos.forEach(photo => {
          allPhotos.push({
            url: photo.url,
            description: photo.description,
            stepType: step.step,
            stepLabel: stepDef.label,
            stepIcon: stepDef.icon,
            uploadedAt: photo.uploadedAt
          });
        });
      }
    }
  });

  const openPhotoModal = (photo: PhotoWithContext) => {
    setSelectedPhoto(photo);
    setShowModal(true);
  };

  const closePhotoModal = () => {
    setShowModal(false);
    setSelectedPhoto(null);
  };

  const downloadPhoto = (photoUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (allPhotos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5 text-gray-400" />
            <span>Photos de la préparation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Camera className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune photo n'a été prise lors de cette préparation</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5 text-purple-600" />
            <span>Photos de la préparation</span>
            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
              {allPhotos.length} photo{allPhotos.length > 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Galerie de photos */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allPhotos.map((photo, index) => (
              <div key={index} className="relative group">
                {/* Image */}
                <div className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  <img
                    src={photo.url}
                    alt={photo.description || `Photo ${photo.stepLabel}`}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  
                  {/* Overlay au hover */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openPhotoModal(photo)}
                        className="bg-white/90 hover:bg-white text-gray-900"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => downloadPhoto(
                          photo.url, 
                          `${preparation.vehicle.licensePlate}_${photo.stepType}_${index + 1}.jpg`
                        )}
                        className="bg-white/90 hover:bg-white text-gray-900"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Badge de l'étape */}
                <div className="absolute top-2 left-2">
                  <Badge className="bg-white/90 text-gray-800 border-gray-200 text-xs">
                    {photo.stepIcon} {photo.stepLabel}
                  </Badge>
                </div>

                {/* Description si présente */}
                {photo.description && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 truncate" title={photo.description}>
                      {photo.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Répartition par étape */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Répartition par étape</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PREPARATION_STEPS.map(stepDef => {
                const stepPhotos = allPhotos.filter(p => p.stepType === stepDef.step);
                if (stepPhotos.length === 0) return null;
                
                return (
                  <div key={stepDef.step} className="flex items-center justify-between py-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{stepDef.icon}</span>
                      <span className="text-sm text-gray-700">{stepDef.label}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {stepPhotos.length} photo{stepPhotos.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal pour afficher la photo en grand */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center space-x-2">
              <span>{selectedPhoto?.stepIcon}</span>
              <span>{selectedPhoto?.stepLabel}</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedPhoto && (
            <div className="p-6 pt-4">
              {/* Image en grand */}
              <div className="relative">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.description || `Photo ${selectedPhoto.stepLabel}`}
                  className="w-full max-h-[60vh] object-contain rounded-lg"
                />
                
                {/* Bouton fermer */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={closePhotoModal}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Informations de la photo */}
              <div className="mt-4 space-y-2">
                {selectedPhoto.description && (
                  <p className="text-sm text-gray-700">
                    <strong>Description:</strong> {selectedPhoto.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Photo de l'étape: {selectedPhoto.stepLabel}
                  </p>
                  
                  <Button
                    size="sm"
                    onClick={() => downloadPhoto(
                      selectedPhoto.url, 
                      `${preparation.vehicle.licensePlate}_${selectedPhoto.stepType}.jpg`
                    )}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}