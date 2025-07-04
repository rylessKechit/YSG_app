// lib/hooks/useCamera.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCameraOptions {
  facingMode?: 'user' | 'environment';
  autoStart?: boolean;
}

interface UseCameraReturn {
  stream: MediaStream | null;
  videoRef: any;
  isInitialized: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  switchCamera: () => void;
  capturePhoto: () => string | null;
  hasPermission: boolean | null;
}

export const useCamera = (options: UseCameraOptions = {}): UseCameraReturn => {
  const {
    facingMode: initialFacingMode = 'environment',
    autoStart = false
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(initialFacingMode);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Vérifier les permissions (avec fallback)
  const checkPermissions = useCallback(async () => {
    try {
      // Vérifier si navigator.permissions existe
      if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions) {
        const permissionStatus = await navigator.permissions.query({ 
          name: 'camera' as PermissionName 
        });
        setHasPermission(permissionStatus.state === 'granted');
        
        permissionStatus.addEventListener('change', () => {
          setHasPermission(permissionStatus.state === 'granted');
        });
      } else {
        // Fallback: on ne peut pas vérifier, on assume null
        setHasPermission(null);
      }
    } catch (error) {
      // Les permissions ne sont pas supportées ou erreur
      setHasPermission(null);
    }
  }, []);

  // Démarrer la caméra
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsInitialized(false);

      // Vérifier si on est dans un environnement browser
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        throw new Error('API MediaDevices non supportée');
      }

      // Stopper le stream précédent
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
        await videoRef.current.play();
        setIsInitialized(true);
        setHasPermission(true);
      }
    } catch (error: any) {
      console.error('❌ Erreur caméra:', error);
      
      let errorMessage = 'Erreur d\'accès à la caméra';
      
      if (error && typeof error === 'object' && 'name' in error) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'Accès à la caméra refusé. Veuillez autoriser l\'accès.';
            setHasPermission(false);
            break;
          case 'NotFoundError':
            errorMessage = 'Aucune caméra trouvée sur cet appareil.';
            break;
          case 'NotReadableError':
            errorMessage = 'Caméra en cours d\'utilisation par une autre application.';
            break;
          case 'OverconstrainedError':
            errorMessage = 'Paramètres de caméra non supportés.';
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      }
      
      setError(errorMessage);
      setIsInitialized(false);
    }
  }, [facingMode]);

  // Arrêter la caméra
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsInitialized(false);
  }, []);

  // Changer de caméra
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Capturer une photo
  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !isInitialized) return null;

    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) return null;

      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error('❌ Erreur capture photo:', error);
      return null;
    }
  }, [isInitialized]);

  // Vérifier les permissions au montage (côté client uniquement)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      checkPermissions();
    }
  }, [checkPermissions]);

  // Démarrage automatique (côté client uniquement)
  useEffect(() => {
    if (typeof window !== 'undefined' && autoStart) {
      startCamera();
    }
  }, [autoStart, startCamera]);

  // Redémarrer quand le mode change
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      startCamera();
    }
  }, [facingMode, startCamera, isInitialized]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    stream: streamRef.current,
    videoRef,
    isInitialized,
    error,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    hasPermission
  };
};