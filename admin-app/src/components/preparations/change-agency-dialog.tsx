// admin-app/src/app/(dashboard)/preparations/components/change-agency-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/loading-spinner';

import type { Preparation } from '@/types/preparation';

import type { Agency } from '@/types/agency';

interface ChangeAgencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preparation: Preparation | null;
  agencies: Agency[];
  onSubmit: (agencyId: string, reason?: string) => void;
  isLoading?: boolean;
}

export function ChangeAgencyDialog({
  open,
  onOpenChange,
  preparation,
  agencies,
  onSubmit,
  isLoading = false
}: ChangeAgencyDialogProps) {
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // Reset form when dialog opens/closes or preparation changes
  useEffect(() => {
    if (open && preparation) {
      setSelectedAgencyId('');
      setReason('');
    }
  }, [open, preparation]);

  const handleSubmit = () => {
    if (!selectedAgencyId || !preparation) return;
    
    onSubmit(selectedAgencyId, reason.trim() || undefined);
  };

  const selectedAgency = agencies.find(agency => agency.id === selectedAgencyId);
  const currentAgency = preparation?.agency;

  // Filtrer les agences (exclure l'agence actuelle)
  const availableAgencies = agencies.filter(agency => 
    agency.id !== currentAgency?.id
  );

  const canSubmit = selectedAgencyId && selectedAgencyId !== currentAgency?.id && !isLoading;

  if (!preparation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Changer d'agence
          </DialogTitle>
          <DialogDescription>
            Modifier l'agence assignée à cette préparation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations de la préparation */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="font-medium">
              {preparation.vehicle.licensePlate} - {preparation.vehicle.brand} {preparation.vehicle.model}
            </div>
            <div className="text-sm text-muted-foreground">
              Préparateur: {preparation.user.name}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Agence actuelle:</span>
              <Badge variant="outline">
                {currentAgency?.name} ({currentAgency?.code})
              </Badge>
            </div>
          </div>

          {/* Sélection nouvelle agence */}
          <div className="space-y-2">
            <Label htmlFor="agency">Nouvelle agence</Label>
            <Select
              value={selectedAgencyId}
              onValueChange={setSelectedAgencyId}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une agence" />
              </SelectTrigger>
              <SelectContent>
                {availableAgencies.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    Aucune autre agence disponible
                  </div>
                ) : (
                  availableAgencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      <div className="flex flex-col">
                        <span>{agency.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {agency.code} - {agency.client}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Aperçu du changement */}
          {selectedAgency && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-900 mb-1">
                Changement d'agence
              </div>
              <div className="text-sm text-blue-700">
                <div className="flex items-center gap-2">
                  <span>De:</span>
                  <Badge variant="outline">
                    {currentAgency?.name} ({currentAgency?.code})
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span>Vers:</span>
                  <Badge variant="default">
                    {selectedAgency.name} ({selectedAgency.code})
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Raison du changement */}
          <div className="space-y-2">
            <Label htmlFor="reason">Raison du changement (optionnel)</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Réassignation suite à demande client, optimisation planning..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {reason.length}/500 caractères
            </div>
          </div>

          {/* Avertissement */}
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="text-sm text-yellow-800">
              <strong>Attention:</strong> Ce changement sera enregistré dans l'historique 
              de la préparation et ne pourra pas être annulé.
            </div>
          </div>
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
            disabled={!canSubmit}
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="mr-2" />
                Modification...
              </>
            ) : (
              'Confirmer le changement'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}