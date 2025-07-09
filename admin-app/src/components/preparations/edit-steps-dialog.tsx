// admin-app/src/app/(dashboard)/preparations/components/edit-steps-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Edit3, AlertTriangle, Camera } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/common/loading-spinner';

import type { Preparation, PreparationStepData, PreparationStep } from '@/types/preparation';
import { 
  PREPARATION_STEP_LABELS,
  PREPARATION_STEP_ICONS,
  PreparationStep as PreparationStepEnum
} from '@/types/preparation';

interface EditStepsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preparation: Preparation | null;
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

  // Initialiser les étapes quand le dialog s'ouvre
  useEffect(() => {
    if (open && preparation) {
      const initialSteps = preparation.steps.map(step => ({
        step: step.step,
        completed: step.completed,
        notes: step.notes || '',
        hasPhotos: (step.photosCount || 0) > 0,
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

  // Étapes disponibles pour ajout
  const availableSteps = Object.entries(PREPARATION_STEP_LABELS).filter(
    ([stepValue]) => !steps.find(s => s.step === stepValue)
  );

  const hasChanges = preparation ? (
    steps.length !== preparation.steps.length ||
    steps.some((step, index) => {
      const original = preparation.steps[index];
      return !original || 
             step.step !== original.step ||
             step.completed !== original.completed ||
             step.notes !== (original.notes || '');
    })
  ) : false;

  if (!preparation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Modifier les étapes
          </DialogTitle>
          <DialogDescription>
            Modifier les étapes de préparation pour {preparation.vehicle.licensePlate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avertissement */}
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <div className="text-sm">
                <strong>Attention:</strong> Les étapes ajoutées après coup n'auront pas de photos. 
                Seules les étapes effectuées par le préparateur ont des photos.
              </div>
            </div>
          </div>

          {/* Liste des étapes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Étapes ({steps.length})</Label>
              {availableSteps.length > 0 && (
                <Select onValueChange={handleAddStep}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Ajouter une étape" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSteps.map(([stepValue, stepLabel]) => (
                      <SelectItem key={stepValue} value={stepValue}>
                        <div className="flex items-center gap-2">
                          <span>{PREPARATION_STEP_ICONS[stepValue as PreparationStep]}</span>
                          <span>{stepLabel}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {steps.map((step, index) => (
              <div key={step.step} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={step.completed}
                      onCheckedChange={() => handleStepToggle(index)}
                    />
                    <span className="text-lg">{PREPARATION_STEP_ICONS[step.step as PreparationStep]}</span>
                    <span className="font-medium">{PREPARATION_STEP_LABELS[step.step as PreparationStep]}</span>
                    
                    {step.hasPhotos && (
                      <Badge variant="outline" className="text-xs">
                        <Camera className="h-3 w-3 mr-1" />
                        Photos
                      </Badge>
                    )}
                    
                    {!step.isOriginal && (
                      <Badge variant="secondary" className="text-xs">
                        Ajoutée
                      </Badge>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveStep(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Notes</Label>
                  <Textarea
                    value={step.notes}
                    onChange={(e) => handleStepNotesChange(index, e.target.value)}
                    placeholder="Notes pour cette étape..."
                    rows={2}
                    maxLength={200}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {step.notes.length}/200 caractères
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Notes admin */}
          <div className="space-y-2">
            <Label htmlFor="adminNotes">Notes administrateur</Label>
            <Textarea
              id="adminNotes"
              placeholder="Raison de la modification, commentaires..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {adminNotes.length}/500 caractères
            </div>
          </div>

          {/* Résumé des changements */}
          {hasChanges && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-900 mb-1">
                Modifications détectées
              </div>
              <div className="text-sm text-blue-700">
                {steps.filter(s => !s.isOriginal).length > 0 && (
                  <div>• {steps.filter(s => !s.isOriginal).length} étape(s) ajoutée(s)</div>
                )}
                {preparation.steps.length > steps.length && (
                  <div>• {preparation.steps.length - steps.length} étape(s) supprimée(s)</div>
                )}
                {steps.filter((s, i) => {
                  const original = preparation.steps.find(os => os.step === s.step);
                  return original && (original.completed !== s.completed || (original.notes || '') !== s.notes);
                }).length > 0 && (
                  <div>• Statut ou notes modifiés pour certaines étapes</div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || isLoading || steps.length === 0}
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="mr-2" />
                Modification...
              </>
            ) : (
              'Confirmer les modifications'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}