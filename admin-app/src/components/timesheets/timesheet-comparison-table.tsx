'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Check,
  Flag,
  Trash2,
  Download,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';

import { BulkActionData } from '@/lib/api/timesheets';

interface BulkActionsTimesheetsProps {
  selectedIds: string[];
  onAction: (action: BulkActionData) => void;
  disabled?: boolean;
}

export function BulkActionsTimesheets({
  selectedIds,
  onAction,
  disabled = false,
}: BulkActionsTimesheetsProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [currentAction, setCurrentAction] = useState<BulkActionData['action'] | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const selectedCount = selectedIds.length;

  const handleActionClick = (action: BulkActionData['action']) => {
    setCurrentAction(action);
    
    // Actions qui nécessitent des notes
    if (action === 'dispute') {
      setShowNotesDialog(true);
    } 
    // Actions qui nécessitent confirmation
    else if (action === 'delete') {
      setShowConfirmDialog(true);
    } 
    // Actions directes
    else {
      executeAction(action);
    }
  };

  const executeAction = (action: BulkActionData['action'], notes?: string) => {
    const actionData: BulkActionData = {
      action,
      timesheetIds: selectedIds,
      params: notes ? { adminNotes: notes } : undefined,
    };

    onAction(actionData);
    
    // Reset states
    setCurrentAction(null);
    setAdminNotes('');
    setShowConfirmDialog(false);
    setShowNotesDialog(false);
  };

  const getActionLabel = (action: BulkActionData['action']) => {
    switch (action) {
      case 'validate':
        return 'Valider';
      case 'dispute':
        return 'Marquer en litige';
      case 'delete':
        return 'Supprimer';
      case 'export':
        return 'Exporter';
      default:
        return action;
    }
  };

  const getActionDescription = (action: BulkActionData['action']) => {
    switch (action) {
      case 'validate':
        return `Valider ${selectedCount} pointage(s) sélectionné(s). Cette action marquera les pointages comme validés.`;
      case 'dispute':
        return `Marquer ${selectedCount} pointage(s) en litige. Vous devez fournir une raison.`;
      case 'delete':
        return `Supprimer définitivement ${selectedCount} pointage(s). Cette action est irréversible.`;
      case 'export':
        return `Exporter ${selectedCount} pointage(s) vers un fichier Excel.`;
      default:
        return `Exécuter l'action sur ${selectedCount} pointage(s).`;
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {selectedCount} pointage(s) sélectionné(s)
        </span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled}>
              Actions
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleActionClick('validate')}>
              <Check className="mr-2 h-4 w-4 text-green-600" />
              Valider la sélection
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => handleActionClick('dispute')}>
              <Flag className="mr-2 h-4 w-4 text-orange-600" />
              Marquer en litige
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => handleActionClick('export')}>
              <Download className="mr-2 h-4 w-4 text-blue-600" />
              Exporter sélection
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => handleActionClick('delete')}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer sélection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialog de confirmation pour suppressions */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              {currentAction && getActionDescription(currentAction)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Attention</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Cette action est irréversible. Les pointages supprimés ne pourront pas être récupérés.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => currentAction && executeAction(currentAction)}
            >
              Supprimer {selectedCount} pointage(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour les notes (litiges) */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentAction && getActionLabel(currentAction)}
            </DialogTitle>
            <DialogDescription>
              {currentAction && getActionDescription(currentAction)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-notes">
                Raison {currentAction === 'dispute' ? '(obligatoire)' : '(optionnelle)'}
              </Label>
              <Textarea
                id="admin-notes"
                placeholder={
                  currentAction === 'dispute' 
                    ? "Expliquez pourquoi ces pointages sont marqués en litige..."
                    : "Notes administrateur optionnelles..."
                }
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-1"
              />
            </div>
            
            {currentAction === 'dispute' && !adminNotes.trim() && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Raison requise</span>
                </div>
                <p className="text-sm text-amber-700">
                  Vous devez fournir une raison pour marquer les pointages en litige.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={() => currentAction && executeAction(currentAction, adminNotes)}
              disabled={currentAction === 'dispute' && !adminNotes.trim()}
            >
              {currentAction && getActionLabel(currentAction)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}