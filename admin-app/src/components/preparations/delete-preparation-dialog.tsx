// admin-app/src/components/preparations/delete-preparation-dialog.tsx - CORRIGÉ
'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { useDeletePreparation, useDeleteMultiplePreparations } from '@/hooks/api/usePreparations';

import type { Preparation } from '@/types/preparation';

interface DeletePreparationDialogProps {
  children: React.ReactNode;
  preparation?: Preparation;
  preparations?: Preparation[];
  onSuccess?: () => void;
}

export function DeletePreparationDialog({ 
  children, 
  preparation, 
  preparations = [], 
  onSuccess 
}: DeletePreparationDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [preserveData, setPreserveData] = useState(false);

  const isMultiple = preparations.length > 1;
  const singlePrep = preparation || preparations[0];

  // Hooks avec les nouvelles signatures
  const { mutate: deleteSingle, isPending: isDeletingSingle } = useDeletePreparation();
  const { mutate: deleteMultiple, isPending: isDeletingMultiple } = useDeleteMultiplePreparations();

  const isDeleting = isDeletingSingle || isDeletingMultiple;

  // Validation améliorée
  const canDelete = () => {
    const reasonValid = reason.trim().length >= 10; // Minimum 10 caractères
    
    if (isMultiple) {
      return confirmText.toLowerCase() === 'supprimer' && reasonValid;
    }
    return reasonValid;
  };

  // Reset form
  const resetForm = () => {
    setReason('');
    setConfirmText('');
    setPreserveData(false);
  };

  // Handler de suppression corrigé
  const handleDelete = () => {
    if (!canDelete()) return;

    if (isMultiple) {
      // ✅ CORRECTION : Passer un objet avec les propriétés attendues
      deleteMultiple({
        preparationIds: preparations.map(p => p.id),
        reason: reason.trim(),
        preserveData
      }, {
        onSuccess: () => {
          setOpen(false);
          resetForm();
          onSuccess?.();
        }
      });
    } else if (singlePrep) {
      // ✅ CORRECTION : Passer un objet avec les propriétés attendues
      deleteSingle({
        preparationId: singlePrep.id,
        reason: reason.trim(),
        preserveData
      }, {
        onSuccess: () => {
          setOpen(false);
          resetForm();
          onSuccess?.();
        }
      });
    }
  };

  // Obtenir le statut avec couleur
  const getStatusInfo = (status: string) => {
    const statusLabels = {
      'pending': { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      'in_progress': { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
      'completed': { label: 'Terminée', color: 'bg-green-100 text-green-800' },
      'cancelled': { label: 'Annulée', color: 'bg-red-100 text-red-800' },
      'on_hold': { label: 'En pause', color: 'bg-orange-100 text-orange-800' }
    };
    
    return statusLabels[status as keyof typeof statusLabels] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Supprimer {isMultiple ? `${preparations.length} préparations` : 'la préparation'}
          </AlertDialogTitle>
          
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                {isMultiple 
                  ? `Cette action supprimera définitivement ${preparations.length} préparations.`
                  : 'Cette action supprimera définitivement cette préparation.'
                }
                {' '}Cette action ne peut pas être annulée.
              </p>

              {/* Affichage des préparations concernées */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">
                  {isMultiple ? 'Préparations concernées :' : 'Préparation concernée :'}
                </h4>
                
                {isMultiple ? (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {preparations.slice(0, 5).map((prep) => {
                      const statusInfo = getStatusInfo(prep.status);
                      return (
                        <div key={prep.id} className="flex items-center justify-between p-2 border rounded text-xs">
                          <span className="font-mono">
                            {prep.vehicle?.licensePlate || 'N/A'}
                          </span>
                          <Badge className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      );
                    })}
                    {preparations.length > 5 && (
                      <div className="text-xs text-muted-foreground text-center py-1">
                        ... et {preparations.length - 5} autres
                      </div>
                    )}
                  </div>
                ) : singlePrep && (
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">
                        {singlePrep.vehicle?.licensePlate}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {singlePrep.vehicle?.brand} {singlePrep.vehicle?.model}
                      </div>
                    </div>
                    <Badge className={getStatusInfo(singlePrep.status).color}>
                      {getStatusInfo(singlePrep.status).label}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Formulaire de suppression */}
        <div className="space-y-4">
          {/* Raison obligatoire */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Raison de la suppression <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Veuillez expliquer pourquoi vous supprimez cette/ces préparation(s) (minimum 10 caractères)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isDeleting}
              rows={3}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground">
              {reason.length}/500 caractères {reason.length < 10 && `(minimum 10 requis)`}
            </div>
          </div>

          {/* Confirmation pour suppression multiple */}
          {isMultiple && (
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm font-medium">
                Confirmation <span className="text-red-500">*</span>
              </Label>
              <div className="text-xs text-muted-foreground mb-2">
                Tapez "supprimer" pour confirmer la suppression de {preparations.length} préparations
              </div>
              <input
                id="confirm"
                type="text"
                placeholder="Tapez 'supprimer' pour confirmer"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isDeleting}
                className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          )}

          {/* Option de préservation des données */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="preserveData"
              checked={preserveData}
              onCheckedChange={(checked) => setPreserveData(!!checked)}
              disabled={isDeleting}
            />
            <Label htmlFor="preserveData" className="text-sm">
              Conserver les données pour les statistiques (anonymisées)
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={resetForm} disabled={isDeleting}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!canDelete() || isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer {isMultiple ? `(${preparations.length})` : ''}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}