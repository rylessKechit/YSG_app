// admin-app/src/components/preparations/edit-steps-dialog.tsx - CORRIGÉ

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { Preparation } from '@/types/preparation';
import { PREPARATION_STEP_LABELS } from '@/types/preparation';

const PREPARATION_STEP_ICONS: Record<string, string> = {
  'exterior': '🚗',
  'interior': '🧽',
  'fuel': '⛽',
  'special_wash': '✨',
};

interface EditStepsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preparation?: Preparation;
  onSubmit: (steps: Array<{
    step: string;
    completed: boolean;
    notes?: string;
  }>, adminNotes?: string) => void;
  isLoading?: boolean;
}

export function EditStepsDialog({
  open,
  onOpenChange,
  preparation,
  onSubmit,
  isLoading = false
}: EditStepsDialogProps) {
  const [steps, setSteps] = useState<Array<{
    step: string;
    completed: boolean;
    notes: string;
    hasPhotos: boolean;
    isOriginal: boolean;
  }>>([]);
  const [adminNotes, setAdminNotes] = useState('');

  // ✅ CORRECTION : Initialiser les étapes quand le dialog s'ouvre
  useEffect(() => {
    if (open && preparation) {
      const initialSteps = preparation.steps.map(step => ({
        step: step.step,
        completed: step.completed,
        notes: step.notes || '',
        // ✅ FIX : Vérifier si l'étape a des photos en utilisant step.photos au lieu de photosCount
        hasPhotos: step.photos ? step.photos.length > 0 : false,
        isOriginal: true
      }));
      setSteps(initialSteps);
      setAdminNotes('');
    }
  }, [open, preparation]);

  const handleStepToggle = (index: number) => {
    const newSteps = [...steps];
    newSteps[index].completed = !newSteps[index].completed;
    setSteps(newSteps);
  };

  const handleStepNotesChange = (index: number, notes: string) => {
    const newSteps = [...steps];
    newSteps[index].notes = notes;
    setSteps(newSteps);
  };

  const handleAddStep = (stepType: string) => {
    if (steps.find(s => s.step === stepType)) {
      return; // Étape déjà présente
    }

    const newSteps = [...steps, {
      step: stepType,
      completed: false,
      notes: '',
      hasPhotos: false,
      isOriginal: false
    }];
    setSteps(newSteps);
  };

  const handleRemoveStep = (index: number) => {
    // ✅ SÉCURITÉ : Ne pas supprimer les étapes avec des photos
    if (steps[index].hasPhotos) {
      alert('Impossible de supprimer une étape contenant des photos');
      return;
    }

    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
  };

  const handleSubmit = () => {
    if (!preparation || steps.length === 0) return;

    const stepsData = steps.map(step => ({
      step: step.step,
      completed: step.completed,
      notes: step.notes.trim() || undefined
    }));

    onSubmit(stepsData, adminNotes.trim() || undefined);
  };

  // ✅ AMÉLIORATION : Étapes disponibles pour ajout
  const availableSteps = Object.entries(PREPARATION_STEP_LABELS).filter(
    ([stepValue]) => !steps.find(s => s.step === stepValue)
  );

  // ✅ AMÉLIORATION : Vérifier s'il y a des changements
  const hasChanges = preparation ? 
    JSON.stringify(steps.map(s => ({ step: s.step, completed: s.completed, notes: s.notes }))) !== 
    JSON.stringify(preparation.steps.map(s => ({ step: s.step, completed: s.completed, notes: s.notes || '' }))) ||
    adminNotes.trim() !== '' : false;

  if (!preparation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Modifier les étapes - {preparation.vehicle.licensePlate}
          </DialogTitle>
          <DialogDescription>
            Attention : Cette action modifiera l'historique de la préparation. 
            Utilisez cette fonctionnalité avec précaution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* ✅ LISTE DES ÉTAPES EXISTANTES */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Étapes de la préparation</h3>
              <Badge variant="outline">
                {steps.filter(s => s.completed).length}/{steps.length} complétées
              </Badge>
            </div>

            {steps.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Aucune étape définie
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div
                    key={`${step.step}-${index}`}
                    className={`border rounded-lg p-4 transition-colors ${
                      step.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* ✅ CHECKBOX DE COMPLETION */}
                      <Checkbox
                        checked={step.completed}
                        onCheckedChange={() => handleStepToggle(index)}
                        className="mt-1"
                      />

                      <div className="flex-1 space-y-3">
                        {/* ✅ HEADER DE L'ÉTAPE */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {PREPARATION_STEP_ICONS[step.step as keyof typeof PREPARATION_STEP_ICONS] || '📋'}
                            </span>
                            <span className="font-medium">
                              {PREPARATION_STEP_LABELS[step.step as keyof typeof PREPARATION_STEP_LABELS] || step.step}
                            </span>
                            {step.hasPhotos && (
                              <Badge variant="secondary" className="text-xs">
                                📷 Photos
                              </Badge>
                            )}
                            {!step.isOriginal && (
                              <Badge variant="outline" className="text-xs">
                                Ajoutée
                              </Badge>
                            )}
                          </div>

                          {/* ✅ BOUTON SUPPRIMER (seulement pour les étapes ajoutées sans photos) */}
                          {!step.isOriginal && !step.hasPhotos && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveStep(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* ✅ ZONE DE NOTES */}
                        <div className="space-y-2">
                          <Label htmlFor={`notes-${index}`} className="text-sm">
                            Notes de l'étape
                          </Label>
                          <Textarea
                            id={`notes-${index}`}
                            value={step.notes}
                            onChange={(e) => handleStepNotesChange(index, e.target.value)}
                            placeholder="Notes pour cette étape..."
                            className="min-h-[60px] text-sm"
                          />
                        </div>

                        {/* ✅ AVERTISSEMENT POUR LES ÉTAPES AVEC PHOTOS */}
                        {step.hasPhotos && (
                          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                            ⚠️ Cette étape contient des photos et ne peut pas être supprimée
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ✅ AJOUTER UNE NOUVELLE ÉTAPE */}
          {availableSteps.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Ajouter une étape</h3>
              <Select onValueChange={handleAddStep}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une étape à ajouter..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSteps.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {/* ✅ FIX : Utiliser seulement du texte, pas de div avec flex */}
                      {`${PREPARATION_STEP_ICONS[value as keyof typeof PREPARATION_STEP_ICONS] || '📋'} ${label}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ✅ NOTES ADMINISTRATEUR */}
          <div className="space-y-3">
            <Label htmlFor="admin-notes">Notes administrateur (obligatoire)</Label>
            <Textarea
              id="admin-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Expliquez pourquoi vous modifiez ces étapes..."
              className="min-h-[80px]"
              required
            />
            <div className="text-xs text-muted-foreground">
              Ces notes seront enregistrées dans l'historique de modifications
            </div>
          </div>

          {/* ✅ ACTIONS */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !hasChanges || !adminNotes.trim()}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </div>

          {/* ✅ AVERTISSEMENT FINAL */}
          {hasChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Attention :</strong> Cette modification sera enregistrée dans l'historique 
                  et sera visible par tous les administrateurs.
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}