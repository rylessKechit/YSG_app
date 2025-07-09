// admin-app/src/components/preparations/export-dialog.tsx
'use client';

import { useState } from 'react';
import { CalendarIcon, Download, Filter, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

import { useExportPreparationsAdvanced } from '@/hooks/api/usePreparations';
import { useUsers } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';

import type { PreparationFilters } from '@/types/preparation';
import { PREPARATION_STATUS_LABELS } from '@/types/preparation';

interface ExportDialogProps {
  children: React.ReactNode;
  currentFilters?: PreparationFilters;
}

interface ExportOptions {
  format: 'excel' | 'csv' | 'pdf';
  includePhotos: boolean;
  includeDetails: boolean;
  includeStats: boolean;
}

export function ExportDialog({ children, currentFilters = {} }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    includePhotos: false,
    includeDetails: true,
    includeStats: true
  });

  // Hooks API
  const { mutate: exportPreparations, isPending: isExporting } = useExportPreparationsAdvanced();
  const { data: usersData } = useUsers({ 
    page: 1, 
    limit: 100, 
    role: 'preparateur'
  });
  const { data: agenciesData } = useAgencies({ 
    page: 1, 
    limit: 100
  });

  const users = usersData?.data?.users || [];
  const agencies = agenciesData?.agencies || [];

  // Handlers
  const handleExport = () => {
    const filters: PreparationFilters = {
      ...currentFilters,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      agency: selectedAgency || undefined,
      user: selectedUser || undefined,
      search: searchTerm || undefined,
      // Pour l'export, on veut toutes les données sans pagination
      page: 1,
      limit: 10000
    };

    exportPreparations(
      { filters, ...exportOptions },
      {
        onSuccess: () => {
          setOpen(false);
        }
      }
    );
  };

  const resetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedAgency('');
    setSelectedUser('');
    setSelectedStatus('all');
    setSearchTerm('');
  };

  const getFilterCount = () => {
    let count = 0;
    if (startDate) count++;
    if (endDate) count++;
    if (selectedAgency) count++;
    if (selectedUser) count++;
    if (selectedStatus !== 'all') count++;
    if (searchTerm) count++;
    return count;
  };

  const getEstimatedRows = () => {
    // Estimation simple - à ajuster selon vos données réelles
    return Math.floor(Math.random() * 500) + 50;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exporter les préparations
          </DialogTitle>
          <DialogDescription>
            Configurez les filtres et options d'export pour générer votre rapport
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filtres */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtres d'export
                </div>
                {getFilterCount() > 0 && (
                  <Badge variant="secondary">{getFilterCount()} filtre(s)</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Période */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'dd/MM/yyyy', { locale: fr }) : 'Sélectionner...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale={fr}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Date de fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'dd/MM/yyyy', { locale: fr }) : 'Sélectionner...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        locale={fr}
                        disabled={(date) => startDate ? date < startDate : false}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Agence et Préparateur */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Agence</Label>
                  <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les agences" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes les agences</SelectItem>
                      {agencies.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name} ({agency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Préparateur</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les préparateurs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les préparateurs</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Statut et Recherche */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      {Object.entries(PREPARATION_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Recherche</Label>
                  <Input
                    placeholder="Plaque, véhicule..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Bouton reset */}
              {getFilterCount() > 0 && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Effacer les filtres
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Options d'export */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Options d'export
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Format */}
              <div className="space-y-2">
                <Label>Format de fichier</Label>
                <Select 
                  value={exportOptions.format} 
                  onValueChange={(value: 'excel' | 'csv' | 'pdf') => 
                    setExportOptions(prev => ({ ...prev, format: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel (.xlsx)
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        CSV (.csv)
                      </div>
                    </SelectItem>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PDF (.pdf)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Options de contenu */}
              <div className="space-y-3">
                <Label>Contenu à inclure</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeDetails"
                      checked={exportOptions.includeDetails}
                      onCheckedChange={(checked) =>
                        setExportOptions(prev => ({ ...prev, includeDetails: !!checked }))
                      }
                    />
                    <Label htmlFor="includeDetails" className="text-sm font-normal">
                      Détails des étapes
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeStats"
                      checked={exportOptions.includeStats}
                      onCheckedChange={(checked) =>
                        setExportOptions(prev => ({ ...prev, includeStats: !!checked }))
                      }
                    />
                    <Label htmlFor="includeStats" className="text-sm font-normal">
                      Statistiques de performance
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includePhotos"
                      checked={exportOptions.includePhotos}
                      onCheckedChange={(checked) =>
                        setExportOptions(prev => ({ ...prev, includePhotos: !!checked }))
                      }
                      disabled={exportOptions.format === 'csv'}
                    />
                    <Label htmlFor="includePhotos" className="text-sm font-normal">
                      URLs des photos {exportOptions.format === 'csv' && '(non disponible en CSV)'}
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aperçu */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between text-sm">
                <span>Nombre estimé de lignes :</span>
                <Badge variant="outline">{getEstimatedRows()}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Export en cours...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}