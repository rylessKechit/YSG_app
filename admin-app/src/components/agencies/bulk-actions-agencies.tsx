// admin-app/src/components/agencies/bulk-actions-agencies.tsx - ACTIONS EN MASSE AGENCES
'use client';

import { useState } from 'react';
import { 
  Download, 
  Trash2, 
  RotateCcw, 
  CheckCircle, 
  XCircle,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { useBulkActionsAgencies, useExportAgencies } from '@/hooks/api/useAgencies';

interface BulkActionsAgenciesProps {
  selectedIds: string[];
  onSuccess?: () => void;
}

type BulkAction = 'activate' | 'deactivate' | 'export';

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
      if (selectedAction === 'export') {
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
      case 'activate':
        return {
          title: 'Activer les agences',
          description: `Êtes-vous sûr de vouloir activer ${selectedIds.length} agence${selectedIds.length > 1 ? 's' : ''} sélectionnée${selectedIds.length > 1 ? 's' : ''} ?`,
          confirmText: 'Activer',
          icon: CheckCircle,
          variant: 'default' as const,
        };
      case 'deactivate':
        return {
          title: 'Désactiver les agences',
          description: `Êtes-vous sûr de vouloir désactiver ${selectedIds.length} agence${selectedIds.length > 1 ? 's' : ''} sélectionnée${selectedIds.length > 1 ? 's' : ''} ? Elles ne seront plus accessibles aux utilisateurs.`,
          confirmText: 'Désactiver',
          icon: XCircle,
          variant: 'destructive' as const,
        };
      case 'export':
        return {
          title: 'Exporter les agences',
          description: `Exporter ${selectedIds.length} agence${selectedIds.length > 1 ? 's' : ''} sélectionnée${selectedIds.length > 1 ? 's' : ''} au format ${exportFormat.toUpperCase()}.`,
          confirmText: 'Exporter',
          icon: Download,
          variant: 'default' as const,
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
          
          <DropdownMenuItem onClick={() => handleActionClick('activate')}>
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Activer les agences
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleActionClick('deactivate')}>
            <XCircle className="h-4 w-4 mr-2 text-red-600" />
            Désactiver les agences
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleActionClick('export')}>
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

          {/* Options pour l'export */}
          {selectedAction === 'export' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Format d'export</label>
                <Select value={exportFormat} onValueChange={(value: 'excel' | 'csv') => setExportFormat(value)}>
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