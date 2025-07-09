// admin-app/src/components/preparations/delete-preparation-dialog.tsx
'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { PREPARATION_STATUS_LABELS, getStatusColor } from '@/types/preparation';

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

  // Hooks
  const { mutate: deleteSingle, isPending: isDeletingSingle } = useDeletePreparation();
  const { mutate: deleteMultiple, isPending: isDeletingMultiple } = useDeleteMultiplePreparations();

  const isDeleting = isDeletingSingle || isDeletingMultiple;

  // Validation
  const canDelete = () => {
    if (isMultiple) {
      return confirmText.toLowerCase() === 'supprimer' && reason.trim().length > 0;
    }
    return reason.trim().length > 0;
  };

  // Handlers
  const handleDelete = () => {
    if (!canDelete()) return;

    const deleteData = {
      reason: reason.trim(),
      preserveData
    };

    if (isMultiple) {
      deleteMultiple(
        preparations.map(p => p.id),
        {
          onSuccess: () => {
            setOpen(false);
            resetForm();
            onSuccess?.();
          }
        }
      );
    } else if (singlePrep) {
      deleteSingle(singlePrep.id, {
        onSuccess: () => {
          setOpen(false);
          resetForm();
          onSuccess?.();
        }
      });
    }
  };

  const resetForm = () => {
    setReason('');
    setConfirmText('');
    setPreserveData(false);
  };

  // Check if any preparation is in progress
  const hasActivePreparations = preparations.some(
    p => p.status === 'in_progress' || p.status === 'pending'
  );

  const completedPreparations = preparations.filter(p => p.status === 'completed');
  const activePreparations = preparations.filter(
    p => p.status === 'in_progress' || p.status === 'pending'
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>

      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {isMultiple ? 'Supprimer les préparations' : 'Supprimer la préparation'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isMultiple ? (
                <div>
                  <p>Vous êtes sur le point de supprimer <strong>{preparations.length}</strong> préparations.</p>
                  
                  {hasActivePreparations && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-orange-800 text-sm font-medium">
                        ⚠️ Attention : {activePreparations.length} préparation(s) en cours seront interrompue(s)
                      </p>
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Terminées :</span>
                      <Badge variant="outline">{completedPreparations.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>En cours/En attente :</span>
                      <Badge variant="destructive">{activePreparations.length}</Badge>
                    </div>
                  </div>
                </div>
              ) : singlePrep ? (
                <div>
                  <p>Vous êtes sur le point de supprimer la préparation :</p>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {singlePrep.vehicle?.brand} {singlePrep.vehicle?.model}
                        </p>
                        <p className="text-sm text-gray-600">
                          {singlePrep.vehicle?.licensePlate}
                        </p>
                      </div>
                      <Badge className={getStatusColor(singlePrep.status)}>
                        {PREPARATION_STATUS_LABELS[singlePrep.status]}
                      </Badge>
                    </div>
                  </div>

                  {(singlePrep.status === 'in_progress' || singlePrep.status === 'pending') && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-orange-800 text-sm">
                        ⚠️ Cette préparation est en cours et sera interrompue
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              <p className="text-red-600 font-medium">
                Cette action est irréversible !
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Raison obligatoire */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Raison de la suppression <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Expliquez pourquoi vous supprimez cette/ces préparation(s)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Confirmation textuelle pour suppression multiple */}
          {isMultiple && (
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Tapez "supprimer" pour confirmer <span className="text-red-500">*</span>
              </Label>
              <input
                id="confirm"
                type="text"
                placeholder="supprimer"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {/* Option conservation des données */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="preserveData"
              checked={preserveData}
              onCheckedChange={(checked) => setPreserveData(!!checked)}
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