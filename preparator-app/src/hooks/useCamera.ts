import { useState, useRef, useCallback } from 'react';
import { compressImage } from '@/lib/utils';

interface UseCameraOptions {
  quality?: number; // 0.1 à 1.0
  maxWidth?: number;
  maxHeight?: number;
  facingMode?: 'user' | 'environment'; // Front ou arrière
}

interface CameraState {
  isOpen: boolean;
  isCapturing: boolean;
  hasPermission: boolean | null;
  error: string | null;
  stream: MediaStream | null;
}

export function useCamera(options: UseCameraOptions = {}) {
  const {
    quality = 0.8,
    maxWidth = 1920,
    maxHeight = 1080,
    facingMode = 'environment'
  } = options;

  const [state, setState] = useState<CameraState>({
    isOpen: false,
    isCapturing: false,
    hasPermission: null,
    error: null,
    stream: null
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Ouvrir la caméra
  const openCamera = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isCapturing: true, error: null }));

      const constraints = {
        video: {
          facingMode,
          width: { ideal: maxWidth },
          height: { ideal: maxHeight }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState(prev => ({
        ...prev,
        isOpen: true,
        isCapturing: false,
        hasPermission: true,
        stream,
        error: null
      }));

    } catch (error) {
      console.error('Erreur ouverture caméra:', error);
      
      let errorMessage = 'Impossible d\'accéder à la caméra';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Permission caméra refusée. Autorisez l\'accès dans les paramètres.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Aucune caméra trouvée sur cet appareil.';
        }
      }

      setState(prev => ({
        ...prev,
        isOpen: false,
        isCapturing: false,
        hasPermission: false,
        error: errorMessage
      }));
    }
  }, [facingMode, maxWidth, maxHeight]);

  // Prendre une photo
  const capturePhoto = useCallback(async (): Promise<File | null> => {
    if (!videoRef.current || !canvasRef.current || !state.stream) {
      setState(prev => ({ ...prev, error: 'Caméra non initialisée' }));
      return null;
    }

    try {
      setState(prev => ({ ...prev, isCapturing: true }));

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Impossible de créer le contexte canvas');
      }

      // Définir la taille du canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Dessiner la frame video sur le canvas
      context.drawImage(video, 0, 0);

      // Convertir en blob puis en File
      return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `photo-${Date.now()}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            // Compresser l'image si nécessaire
            const compressedFile = await compressImage(file, quality);
            resolve(compressedFile);
          } else {
            resolve(null);
          }
        }, 'image/jpeg', quality);
      });

    } catch (error) {
      console.error('Erreur capture photo:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Erreur lors de la capture de la photo' 
      }));
      return null;
    } finally {
      setState(prev => ({ ...prev, isCapturing: false }));
    }
  }, [state.stream, quality]);

  // Fermer la caméra
  const closeCamera = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState({
      isOpen: false,
      isCapturing: false,
      hasPermission: state.hasPermission,
      error: null,
      stream: null
    });
  }, [state.stream, state.hasPermission]);

  // Changer de caméra (front/back)
  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    closeCamera();
    
    // Réouvrir avec la nouvelle caméra
    setTimeout(() => {
      openCamera();
    }, 100);
  }, [facingMode, closeCamera, openCamera]);

  // Nettoyer les erreurs
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // État
    ...state,
    
    // Refs pour les composants
    videoRef,
    canvasRef,
    
    // Actions
    openCamera,
    closeCamera,
    capturePhoto,
    switchCamera,
    clearError,

    // Utilitaires
    isSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  };
}