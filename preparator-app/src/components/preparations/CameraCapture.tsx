// preparator-app/src/components/preparations/CameraCapture.tsx
// ✅ Composant de capture photo corrigé

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // États
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // ===== GESTION CAMÉRA =====

  // Démarrer la caméra
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Caméra arrière par défaut
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('❌ Erreur accès caméra:', error);
      setCameraError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    }
  }, []);

  // Arrêter la caméra
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // ===== EFFETS =====

  // Démarrer la caméra au montage
  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // ===== FONCTIONS DE CAPTURE =====

  // Capturer une photo
  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    
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

      // Convertir en blob puis en File
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `step-${Date.now()}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          setCapturedFile(file);
          setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8));
          
          // Arrêter la caméra après capture
          stopCamera();
        }
      }, 'image/jpeg', 0.8);
      
    } catch (error) {
      console.error('❌ Erreur capture photo:', error);
      toast({
        title: "Erreur de capture",
        description: "Impossible de capturer la photo",
        variant: "destructive"
      });
    } finally {
      setIsCapturing(false);
    }
  }, [stopCamera, toast]);

  // Reprendre une nouvelle photo
  const handleRetake = useCallback(() => {
    setCapturedPhoto(null);
    setCapturedFile(null);
    startCamera();
  }, [startCamera]);

  // Upload depuis galerie
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Fichier invalide",
        description: "Veuillez sélectionner une image",
        variant: "destructive"
      });
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "L'image doit faire moins de 5MB",
        variant: "destructive"
      });
      return;
    }

    // Créer aperçu
    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedPhoto(e.target?.result as string);
      setCapturedFile(file);
      stopCamera();
    };
    reader.readAsDataURL(file);
  }, [toast, stopCamera]);

  // Valider et envoyer
  const handleValidate = useCallback(async () => {
    if (!capturedFile) return;

    try {
      await onCapture(capturedFile, notes.trim() || undefined);
    } catch (error) {
      console.error('❌ Erreur validation photo:', error);
      // L'erreur sera gérée par le composant parent
    }
  }, [capturedFile, notes, onCapture]);

  // ===== RENDU =====

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black/80 text-white p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Photo - {stepLabel}</h2>
          <p className="text-sm text-gray-300">Prenez une photo claire de l'étape</p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Zone de capture/preview */}
      <div className="flex-1 relative">
        {capturedPhoto ? (
          // Preview de la photo capturée
          <div className="w-full h-full flex items-center justify-center bg-black">
            <img
              src={capturedPhoto}
              alt="Photo capturée"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : cameraError ? (
          // Erreur caméra - Fallback upload
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <Card className="m-4 max-w-sm">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Caméra indisponible</h3>
                <p className="text-sm text-gray-600 mb-4">{cameraError}</p>
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  Choisir une image
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          // Vue caméra
          <div className="w-full h-full relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Overlay de guidage */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-white/50 border-dashed rounded-lg w-80 h-60 flex items-center justify-center">
                <Camera className="h-8 w-8 text-white/70" />
              </div>
            </div>
          </div>
        )}
        
        {/* Canvas caché pour capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="bg-black/80 p-4">
        {capturedPhoto ? (
          // Controls mode preview
          <div className="space-y-4">
            {/* Zone de notes */}
            <Textarea
              placeholder="Notes optionnelles..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              rows={2}
            />
            
            {/* Boutons d'action */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleRetake}
                disabled={isLoading}
                className="flex-1 border-white/30 text-white hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reprendre
              </Button>
              
              <Button
                onClick={handleValidate}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Validation...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Valider
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Controls mode capture
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="border-white/30 text-white hover:bg-white/20"
            >
              Galerie
            </Button>
            
            <Button
              onClick={handleCapture}
              disabled={isCapturing || cameraError !== null}
              size="lg"
              className="w-16 h-16 rounded-full bg-white hover:bg-gray-200 p-0"
            >
              {isCapturing ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
              ) : (
                <Camera className="h-8 w-8 text-gray-900" />
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={onCancel}
              className="border-white/30 text-white hover:bg-white/20"
            >
              Annuler
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
};