// components/preparation/CameraCapture.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  X, 
  RotateCcw, 
  Check,
  AlertCircle 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CameraCaptureProps {
  onCapture: (file: File) => Promise<void>;
  onCancel: () => void;
  stepLabel: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  isLoading?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onCancel,
  stepLabel,
  notes,
  onNotesChange,
  isLoading = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // Initialiser la caméra
  const initializeCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Stopper le stream précédent s'il existe
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsInitialized(true);
      }
    } catch (error: any) {
      console.error('❌ Erreur accès caméra:', error);
      setError(
        error.name === 'NotAllowedError' 
          ? 'Accès à la caméra refusé. Veuillez autoriser l\'accès.'
          : error.name === 'NotFoundError'
          ? 'Aucune caméra trouvée sur cet appareil.'
          : 'Erreur d\'accès à la caméra.'
      );
    }
  }, [facingMode]);

  // Initialiser au montage
  useEffect(() => {
    initializeCamera();
    
    // Cleanup
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [initializeCamera]);

  // Capturer une photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Définir la taille du canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dessiner l'image
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Obtenir l'image en base64
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
  }, []);

  // Recommencer la capture
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
  }, []);

  // Changer de caméra
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setCapturedImage(null);
  }, []);

  // Convertir base64 en File
  const dataURLtoFile = useCallback((dataURL: string, filename: string): File => {
    const arr = dataURL.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  }, []);

  // Confirmer la capture
  const handleConfirm = useCallback(async () => {
    if (!capturedImage) return;

    try {
      const file = dataURLtoFile(
        capturedImage, 
        `step_${stepLabel.toLowerCase()}_${Date.now()}.jpg`
      );
      
      await onCapture(file);
    } catch (error) {
      console.error('❌ Erreur envoi photo:', error);
      setError('Erreur lors de l\'envoi de la photo');
    }
  }, [capturedImage, stepLabel, dataURLtoFile, onCapture]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black/80 text-white p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
        
        <h2 className="font-semibold text-center flex-1">
          Photo - {stepLabel}
        </h2>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={switchCamera}
          disabled={isLoading || !!capturedImage}
          className="text-white hover:bg-white/20"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 relative flex flex-col">
        {error ? (
          // Erreur
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">
                  Erreur d'accès caméra
                </h3>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
                <Button onClick={initializeCamera} variant="outline">
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : capturedImage ? (
          // Image capturée
          <div className="flex-1 relative">
            <img
              src={capturedImage}
              alt="Photo capturée"
              className="w-full h-full object-cover"
            />
            
            {/* Notes */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4">
              <Label htmlFor="notes" className="text-white text-sm">
                Notes (optionnel)
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Ajouter des notes sur cette étape..."
                className="mt-2 bg-white/90 border-white/20"
                rows={2}
                disabled={isLoading}
              />
            </div>
          </div>
        ) : (
          // Prévisualisation caméra
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {!isInitialized && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Initialisation de la caméra...</p>
                </div>
              </div>
            )}
            
            {/* Guides de cadrage */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full border-2 border-white/30 m-4">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-white/20"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Canvas caché pour la capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="bg-black/80 p-4">
        {capturedImage ? (
          // Controls pour image capturée
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="ghost"
              onClick={retakePhoto}
              disabled={isLoading}
              className="text-white hover:bg-white/20"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Reprendre
            </Button>
            
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Envoi...
                </div>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Valider
                </>
              )}
            </Button>
          </div>
        ) : (
          // Controls pour capture
          <div className="flex items-center justify-center">
            <Button
              onClick={capturePhoto}
              disabled={!isInitialized || isLoading}
              className="w-16 h-16 rounded-full bg-white hover:bg-gray-100 p-0 border-4 border-white/50"
            >
              <Camera className="h-8 w-8 text-black" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};