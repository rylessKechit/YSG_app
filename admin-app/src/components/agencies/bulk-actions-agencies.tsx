// admin-app/src/components/agencies/bulk-actions-agencies.tsx - ACTIONS EN MASSE AGENCES
'use client&apos;;

import { useState } from 'react';
import { 
  Download, 
  Trash2, 
  RotateCcw, 
  CheckCircle, 
  XCircle,
  Loader2
} from &apos;lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from &apos;@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from &apos;@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from &apos;@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { useBulkActionsAgencies, useExportAgencies } from '@/hooks/api/useAgencies';

interface BulkActionsAgenciesProps {
  selectedIds: string[];
  onSuccess?: () => void;
}

type BulkAction = &apos;activate' | &apos;deactivate' | &apos;export';

export function BulkActionsAgencies({ selectedIds, onSuccess }: BulkActionsAgenciesProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');

  // Hooks API
  const bulkActions = useBulkActionsAgencies();
  const exportAgencies = useExportAgencies();

  // Handlers
  const handleActionClick = (action: BulkAction) => {
    setSelectedAction(action);
    setShowConfirmDialog(true);
  };

  const handleConfirm = async () => {
    if (!selectedAction) return;

    try {
      if (selectedAction === &apos;export') {
        // Export spécifique aux IDs sélectionnés
        await exportAgencies.mutateAsync({
          format: exportFormat,
          filters: { ids: selectedIds } // Assumant que le backend supporte ce filtre
        });
      } else {
        // Actions en masse
        await bulkActions.mutateAsync({
          action: selectedAction,
          agencyIds: selectedIds,
        });
      }

      setShowConfirmDialog(false);
      setSelectedAction(null);
      onSuccess?.();
    } catch (error) {
      // Erreur gérée par les hooks
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setSelectedAction(null);
  };

  // Configuration des actions
  const getActionConfig = (action: BulkAction) => {
    switch (action) {
      case &apos;activate':
        return {
          title: &apos;Activer les agences&apos;,
          description: `Êtes-vous sûr de vouloir activer ${selectedIds.length} agence${selectedIds.length > 1 ? &apos;s&apos; : ''} sélectionnée${selectedIds.length > 1 ? &apos;s&apos; : ''} ?`,
          confirmText: &apos;Activer',
          icon: CheckCircle,
          variant: &apos;default' as const,
        };
      case &apos;deactivate':
        return {
          title: &apos;Désactiver les agences&apos;,
          description: `Êtes-vous sûr de vouloir désactiver ${selectedIds.length} agence${selectedIds.length > 1 ? &apos;s&apos; : ''} sélectionnée${selectedIds.length > 1 ? &apos;s&apos; : ''} ? Elles ne seront plus accessibles aux utilisateurs.`,
          confirmText: &apos;Désactiver',
          icon: XCircle,
          variant: &apos;destructive' as const,
        };
      case &apos;export':
        return {
          title: &apos;Exporter les agences&apos;,
          description: `Exporter ${selectedIds.length} agence${selectedIds.length > 1 ? &apos;s&apos; : ''} sélectionnée${selectedIds.length > 1 ? &apos;s&apos; : ''} au format ${exportFormat.toUpperCase()}.`,
          confirmText: &apos;Exporter',
          icon: Download,
          variant: &apos;default' as const,
        };
      default:
        return null;
    }
  };

  const actionConfig = selectedAction ? getActionConfig(selectedAction) : null;
  const isLoading = bulkActions.isPending || exportAgencies.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={selectedIds.length === 0}>
            Actions ({selectedIds.length})
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            Actions en masse
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleActionClick(&apos;activate')}>
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Activer les agences
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleActionClick(&apos;deactivate')}>
            <XCircle className="h-4 w-4 mr-2 text-red-600" />
            Désactiver les agences
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleActionClick(&apos;export')}>
            <Download className="h-4 w-4 mr-2" />
            Exporter la sélection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de confirmation */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionConfig?.icon && <actionConfig.icon className="h-5 w-5" />}
              {actionConfig?.title}
            </DialogTitle>
            <DialogDescription>
              {actionConfig?.description}
            </DialogDescription>
          </DialogHeader>

          {/* Options pour l'export */}'
          {selectedAction === &apos;export' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Format d&apos;export</label>
                <Select value={exportFormat} onValueChange={(value: &apos;excel' | &apos;csv') => setExportFormat(value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Résumé de la sélection */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Agences sélectionnées</span>
              <Badge variant="outline">{selectedIds.length}</Badge>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              variant={actionConfig?.variant}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionConfig?.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}