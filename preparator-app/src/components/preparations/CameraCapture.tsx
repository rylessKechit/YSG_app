// preparator-app/src/components/preparations/CameraCapture.tsx
// ✅ Composant de capture photo SIMPLE et FONCTIONNEL

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface CameraCaptureProps {
  onCapture: (photo: File, notes?: string) => Promise<void>;
  onCancel: () => void;
  stepLabel: string;
  isLoading?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onCancel,
  stepLabel,
  isLoading = false
}) => {
  const { toast } = useToast();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // États
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // ===== FONCTIONS CAMÉRA =====

  // Démarrer la caméra
  const startCamera = async () => {
    try {
      setCameraError(null);
      
      console.log('🎥 Démarrage de la caméra...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Caméra arrière
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      setIsInitialized(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      console.log('✅ Caméra démarrée avec succès');
      
    } catch (error) {
      console.error('❌ Erreur accès caméra:', error);
      setCameraError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      toast({
        title: "Erreur caméra",
        description: "Impossible d'accéder à la caméra",
        variant: "destructive"
      });
    }
  };

  // Arrêter la caméra
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track caméra arrêté:', track.kind);
      });
      setStream(null);
    }
  };

  // Capturer une photo
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isInitialized) {
      console.error('❌ Caméra non initialisée');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Impossible d\'obtenir le contexte canvas');
      }

      // Définir la taille du canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Dessiner l'image vidéo sur le canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convertir en data URL
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(photoDataUrl);
      
      // Arrêter la caméra après capture
      stopCamera();
      
      console.log('📸 Photo capturée avec succès');
      
    } catch (error) {
      console.error('❌ Erreur capture photo:', error);
      toast({
        title: "Erreur",
        description: "Impossible de capturer la photo",
        variant: "destructive"
      });
    }
  };

  // Reprendre une photo
  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  // Valider et envoyer la photo
  const validatePhoto = async () => {
    if (!capturedPhoto) return;

    try {
      // Convertir data URL en File
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      const file = new File([blob], `step-${stepLabel}-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      console.log('✅ Photo convertie en fichier:', file.name, file.size, 'bytes');
      
      // Envoyer au parent
      await onCapture(file);
      
    } catch (error) {
      console.error('❌ Erreur validation photo:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider la photo",
        variant: "destructive"
      });
    }
  };

  // ===== EFFETS =====

  // Démarrer la caméra au montage
  useEffect(() => {
    startCamera();
    
    // Cleanup au démontage
    return () => {
      stopCamera();
    };
  }, []);

  // ===== RENDU =====

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black/90 text-white p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Photo - {stepLabel}</h2>
          <p className="text-sm text-gray-300">Prenez une photo claire de l'étape</p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Zone principale */}
      <div className="flex-1 relative bg-black">
        {capturedPhoto ? (
          // ✅ PREVIEW DE LA PHOTO CAPTURÉE
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={capturedPhoto}
              alt="Photo capturée"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : cameraError ? (
          // ❌ ERREUR CAMÉRA
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white p-8">
              <div className="text-6xl mb-4">📷</div>
              <h3 className="text-xl font-semibold mb-2">Caméra indisponible</h3>
              <p className="text-gray-300 mb-4">{cameraError}</p>
              <Button
                onClick={startCamera}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Réessayer
              </Button>
            </div>
          </div>
        ) : (
          // ✅ VUE CAMÉRA EN TEMPS RÉEL
          <div className="w-full h-full relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }} // Effet miroir
            />
            
            {/* Overlay de guidage */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white/50 border-dashed rounded-lg w-80 h-60 flex items-center justify-center">
                <Camera className="h-8 w-8 text-white/70" />
              </div>
            </div>

            {/* Indicateur de caméra active */}
            {isInitialized && (
              <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                REC
              </div>
            )}
          </div>
        )}
        
        {/* Canvas caché pour capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Boutons en bas */}
      <div className="bg-black/90 p-6">
        {capturedPhoto ? (
          // ✅ BOUTONS APRÈS CAPTURE : REPRENDRE / VALIDER
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={retakePhoto}
              variant="outline"
              size="lg"
              className="flex-1 max-w-32 bg-gray-600 border-gray-500 text-white hover:bg-gray-700"
            >
              Reprendre
            </Button>
            
            <Button
              onClick={validatePhoto}
              disabled={isLoading}
              size="lg"
              className="flex-1 max-w-32 bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Envoi...</span>
                </div>
              ) : (
                'Valider'
              )}
            </Button>
          </div>
        ) : (
          // ✅ BOUTONS AVANT CAPTURE : ANNULER / PRENDRE PHOTO
          <div className="flex items-center justify-center space-x-6">
            <Button
              onClick={onCancel}
              variant="outline"
              size="lg"
              className="bg-gray-600 border-gray-500 text-white hover:bg-gray-700"
            >
              Annuler
            </Button>
            
            <Button
              onClick={takePhoto}
              disabled={!isInitialized || cameraError !== null}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4"
            >
              <Camera className="h-6 w-6 mr-2" />
              Prendre la photo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};