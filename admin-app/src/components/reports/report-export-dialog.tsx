// src/components/reports/report-export-dialog.tsx
'use client';

import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  Mail, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ReportExportOptions, ReportType, ReportFormat } from '@/types/reports';

interface ReportExportDialogProps {
  reportType: ReportType;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onExport?: (options: ReportExportOptions) => void;
  isExporting?: boolean;
  exportProgress?: number;
  children?: React.ReactNode;
}

const FORMAT_OPTIONS = [
  {
    value: 'excel' as ReportFormat,
    label: 'Excel (.xlsx)',
    description: 'Fichier Excel avec tableaux et graphiques',
    icon: '📊',
    size: '~2-5 MB'
  },
  {
    value: 'pdf' as ReportFormat,
    label: 'PDF',
    description: 'Document PDF prêt à imprimer',
    icon: '📄',
    size: '~1-3 MB'
  },
  {
    value: 'csv' as ReportFormat,
    label: 'CSV',
    description: 'Données brutes pour analyse',
    icon: '📈',
    size: '~100-500 KB'
  }
];

const DELIVERY_METHODS = [
  {
    value: 'download',
    label: 'Téléchargement direct',
    description: 'Télécharger immédiatement le fichier',
    icon: Download
  },
  {
    value: 'email',
    label: 'Envoi par email',
    description: 'Recevoir le rapport par email',
    icon: Mail
  }
];

export function ReportExportDialog({
  reportType,
  isOpen,
  onOpenChange,
  onExport,
  isExporting = false,
  exportProgress = 0,
  children
}: ReportExportDialogProps) {
  const [options, setOptions] = useState<ReportExportOptions>({
    type: reportType,
    format: 'excel',
    period: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    filters: {
      includeGraphiques: true,
      includeDetails: false
    },
    delivery: {
      method: 'download'
    }
  });

  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const updateOption = (path: string, value: any) => {
    const keys = path.split('.');
    const newOptions = { ...options };
    let current: any = newOptions;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setOptions(newOptions);
    validateOptions(newOptions);
  };

  const validateOptions = (opts: ReportExportOptions) => {
    const errors: string[] = [];
    
    // Validation des dates
    const startDate = new Date(opts.period.start);
    const endDate = new Date(opts.period.end);
    
    if (startDate >= endDate) {
      errors.push('La date de fin doit être postérieure à la date de début');
    }
    
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      errors.push('La période ne peut pas dépasser 365 jours');
    }
    
    // Validation email
    if (opts.delivery.method === 'email' && !opts.delivery.email) {
      errors.push('Adresse email requise pour l\'envoi par email');
    }
    
    if (opts.delivery.method === 'email' && opts.delivery.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(opts.delivery.email)) {
        errors.push('Format d\'email invalide');
      }
    }
    
    setValidationErrors(errors);
    
    // Estimation du temps
    const complexity = opts.filters.includeDetails ? 2 : 1;
    const formatMultiplier = opts.format === 'pdf' ? 3 : opts.format === 'excel' ? 2 : 1;
    const estimated = Math.ceil(daysDiff * 0.1 * complexity * formatMultiplier);
    setEstimatedTime(Math.max(5, Math.min(120, estimated)));
  };

  const handleExport = () => {
    if (validationErrors.length === 0 && onExport) {
      onExport(options);
    }
  };

  const getFormatIcon = (format: ReportFormat) => {
    return FORMAT_OPTIONS.find(f => f.value === format)?.icon || '📄';
  };

  const getReportTypeLabel = (type: ReportType) => {
    const labels = {
      ponctualite: 'Ponctualité',
      performance: 'Performance',
      activite: 'Activité',
      custom: 'Personnalisé'
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exporter le Rapport {getReportTypeLabel(reportType)}
          </DialogTitle>
          <DialogDescription>
            Configurez les options d'export de votre rapport
          </DialogDescription>
        </DialogHeader>

        {isExporting ? (
          /* État d'export en cours */
          <div className="space-y-4 py-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <h3 className="text-lg font-medium">Génération en cours...</h3>
              <p className="text-muted-foreground">
                Cela peut prendre quelques minutes selon la complexité du rapport
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression</span>
                <span>{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} />
            </div>
            
            <div className="text-sm text-muted-foreground text-center">
              Format: {getFormatIcon(options.format)} {options.format.toUpperCase()} • 
              Période: {options.period.start} à {options.period.end}
            </div>
          </div>
        ) : (
          /* Configuration de l'export */
          <div className="space-y-6 py-4">
            {/* Sélection du format */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Format d'export</Label>
              <div className="grid gap-3">
                {FORMAT_OPTIONS.map((format) => (
                  <Card 
                    key={format.value}
                    className={`cursor-pointer transition-all ${
                      options.format === format.value 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => updateOption('format', format.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{format.icon}</span>
                          <div>
                            <div className="font-medium">{format.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {format.description}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">{format.size}</Badge>
                          {options.format === format.value && (
                            <CheckCircle className="h-5 w-5 text-blue-600 mt-1" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Période */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Période</Label>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Date de début</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={options.period.start}
                    onChange={(e) => updateOption('period.start', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Date de fin</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={options.period.end}
                    onChange={(e) => updateOption('period.end', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Options d'inclusion */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Options d'inclusion</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeGraphiques"
                    checked={options.filters.includeGraphiques || false}
                    onCheckedChange={(checked) => updateOption('filters.includeGraphiques', checked)}
                  />
                  <Label htmlFor="includeGraphiques">
                    Inclure les graphiques et visualisations
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeDetails"
                    checked={options.filters.includeDetails || false}
                    onCheckedChange={(checked) => updateOption('filters.includeDetails', checked)}
                  />
                  <Label htmlFor="includeDetails">
                    Inclure les détails par utilisateur
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Méthode de livraison */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Méthode de livraison</Label>
              <RadioGroup
                value={options.delivery.method}
                onValueChange={(value: any) => updateOption('delivery.method', value)}
              >
                {DELIVERY_METHODS.map((method) => (
                  <div key={method.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={method.value} id={method.value} />
                    <Label htmlFor={method.value} className="flex items-center gap-2 cursor-pointer">
                      <method.icon className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{method.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {method.description}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {/* Email input si méthode email sélectionnée */}
              {options.delivery.method === 'email' && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre.email@exemple.com"
                    value={options.delivery.email || ''}
                    onChange={(e) => updateOption('delivery.email', e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Estimation et validation */}
            <div className="space-y-3">
              {estimatedTime && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Settings className="h-4 w-4" />
                    <span>Temps estimé: {estimatedTime} secondes</span>
                  </div>
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="space-y-1">
                      {validationErrors.map((error, index) => (
                        <div key={index} className="text-sm text-red-700">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {!isExporting && (
            <>
              <Button variant="outline" onClick={() => onOpenChange?.(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleExport}
                disabled={validationErrors.length > 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}