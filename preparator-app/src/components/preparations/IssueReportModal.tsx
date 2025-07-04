// components/preparation/IssueReportModal.tsx
'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Camera, 
  AlertTriangle, 
  FileText,
  Image as ImageIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface IssueReportModalProps {
  onSubmit: (data: {
    type: string;
    description: string;
    photo?: File;
    severity?: 'low' | 'medium' | 'high';
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// Types d'incidents avec leurs labels
const ISSUE_TYPES = [
  {
    value: 'damage',
    label: 'Dommage',
    description: 'Rayure, bosselure, casse',
    severity: 'high' as const
  },
  {
    value: 'missing_key',
    label: 'Clé manquante',
    description: 'Clé principale ou de secours absente',
    severity: 'high' as const
  },
  {
    value: 'fuel_problem',
    label: 'Problème carburant',
    description: 'Réservoir vide, mauvais carburant',
    severity: 'medium' as const
  },
  {
    value: 'cleanliness',
    label: 'Propreté',
    description: 'Véhicule sale, taches persistantes',
    severity: 'low' as const
  },
  {
    value: 'mechanical',
    label: 'Problème mécanique',
    description: 'Panne, voyant allumé, bruit anormal',
    severity: 'high' as const
  },
  {
    value: 'other',
    label: 'Autre',
    description: 'Autre type d\'incident',
    severity: 'medium' as const
  }
] as const;

const SEVERITY_CONFIG = {
  low: { label: 'Faible', color: 'bg-yellow-100 text-yellow-800' },
  medium: { label: 'Moyen', color: 'bg-orange-100 text-orange-800' },
  high: { label: 'Élevé', color: 'bg-red-100 text-red-800' }
} as const;

export const IssueReportModal: React.FC<IssueReportModalProps> = ({
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [issueType, setIssueType] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');

  // Gérer la sélection de type
  const handleTypeChange = (value: string) => {
    setIssueType(value);
    
    // Définir la gravité par défaut selon le type
    const issueConfig = ISSUE_TYPES.find(type => type.value === value);
    if (issueConfig) {
      setSeverity(issueConfig.severity);
    }
  };

  // Gérer la sélection de photo
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image est trop volumineuse (max 5MB)');
      return;
    }

    setPhoto(file);
    
    // Créer un aperçu
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Supprimer la photo
  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Valider le formulaire
  const isFormValid = () => {
    return issueType && description.trim().length >= 10;
  };

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) return;

    try {
      await onSubmit({
        type: issueType,
        description: description.trim(),
        photo: photo || undefined,
        severity
      });
    } catch (error) {
      console.error('❌ Erreur soumission incident:', error);
    }
  };

  const selectedIssueType = ISSUE_TYPES.find(type => type.value === issueType);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
              Signaler un incident
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type d'incident */}
            <div>
              <Label htmlFor="issue-type">Type d'incident *</Label>
              <Select value={issueType} onValueChange={handleTypeChange} disabled={isLoading}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner le type d'incident" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedIssueType && (
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Gravité:</span>
                  <Badge className={SEVERITY_CONFIG[severity].color}>
                    {SEVERITY_CONFIG[severity].label}
                  </Badge>
                </div>
              )}
            </div>

            {/* Gravité (modifiable) */}
            {issueType && (
              <div>
                <Label htmlFor="severity">Gravité</Label>
                <Select value={severity} onValueChange={(value: 'low' | 'medium' | 'high') => setSeverity(value)} disabled={isLoading}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <Badge className={SEVERITY_CONFIG.low.color}>
                        {SEVERITY_CONFIG.low.label}
                      </Badge>
                    </SelectItem>
                    <SelectItem value="medium">
                      <Badge className={SEVERITY_CONFIG.medium.color}>
                        {SEVERITY_CONFIG.medium.label}
                      </Badge>
                    </SelectItem>
                    <SelectItem value="high">
                      <Badge className={SEVERITY_CONFIG.high.color}>
                        {SEVERITY_CONFIG.high.label}
                      </Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Description */}
            <div>
              <Label htmlFor="description">
                Description détaillée *
                <span className="text-sm text-gray-500 ml-1">
                  ({description.length}/500 - min. 10)
                </span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder="Décrivez l'incident en détail..."
                className="mt-1"
                rows={4}
                disabled={isLoading}
              />
              {description.length < 10 && description.length > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  Description trop courte (minimum 10 caractères)
                </p>
              )}
            </div>

            {/* Photo */}
            <div>
              <Label>Photo (optionnel)</Label>
              <div className="mt-1">
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Aperçu"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removePhoto}
                      disabled={isLoading}
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      disabled={isLoading}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="w-full h-20 border-dashed"
                    >
                      <div className="text-center">
                        <ImageIcon className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Ajouter une photo
                        </span>
                      </div>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Annuler
              </Button>
              
              <Button
                type="submit"
                disabled={!isFormValid() || isLoading}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Envoi...
                  </div>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Signaler
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};