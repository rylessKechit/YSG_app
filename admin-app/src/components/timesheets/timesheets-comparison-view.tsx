// admin-app/src/components/timesheets/timesheets-comparison-view-fixed.tsx
'use client';

import { useState } from 'react';
import { 
  BarChart3, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  Building,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useTimesheetComparison, useMissingTimesheets } from '@/hooks/use-timesheets';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// ===== TYPES COMPATIBLES AVEC LE BACKEND =====
interface BackendUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface BackendAgency {
  _id: string;
  name: string;
  code?: string;
}

interface BackendPlannedSchedule {
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
  totalMinutes: number;
}

interface BackendActualTimesheet {
  _id: string;
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
  totalWorkedMinutes: number;
  status: string;
}

interface BackendComparisonAnalysis {
  status: 'on_time' | 'late' | 'slight_delay' | 'missing' | 'disputed' | 'early_leave' | 'no_schedule';
  variance?: number;
  notes?: string;
}

interface BackendTimesheetComparison {
  _id: string;
  date: string;
  user: BackendUser;
  agency: BackendAgency;
  plannedSchedule: BackendPlannedSchedule;
  actualTimesheet?: BackendActualTimesheet;
  analysis: BackendComparisonAnalysis;
}

interface BackendComparisonSummary {
  total: number;
  onTimeCount: number;
  lateCount: number;
  missingCount: number;
  disputedCount: number;
  earlyLeaveCount: number;
  punctualityRate: number;
  averageDelay?: number;
  breakdown?: {
    on_time: { count: number; percentage: number };
    late: { count: number; percentage: number };
    missing: { count: number; percentage: number };
    disputed: { count: number; percentage: number };
    early_leave: { count: number; percentage: number };
  };
}

interface BackendComparisonData {
  comparisons: BackendTimesheetComparison[];
  summary: BackendComparisonSummary;
  filters?: any;
}

interface BackendMissingTimesheet {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  user: BackendUser;
  agency: BackendAgency;
  urgency?: 'high' | 'medium' | 'low';
}

interface BackendMissingData {
  missingTimesheets: BackendMissingTimesheet[];
  count: number;
  filters?: any;
}

interface ComparisonFilters {
  startDate: string;
  endDate: string;
  includeDetails?: boolean;
  anomaliesOnly?: boolean;
  userId?: string;
  agencyId?: string;
}

interface TimesheetsComparisonViewProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  onDateRangeChange: (startDate: string, endDate: string) => void;
}

export function TimesheetsComparisonView({ dateRange, onDateRangeChange }: TimesheetsComparisonViewProps) {
  // ===== ÉTAT LOCAL =====
  const [comparisonFilters, setComparisonFilters] = useState<ComparisonFilters>({
    ...dateRange,
    includeDetails: true,
    anomaliesOnly: false
  });

  const [showOnlyAnomalies, setShowOnlyAnomalies] = useState(false);

  // ===== HOOKS DE DONNÉES =====
  const { 
    data: comparisonResponse, 
    isLoading: isLoadingComparison,
    error: comparisonError 
  } = useTimesheetComparison(comparisonFilters);

  const { 
    data: missingResponse, 
    isLoading: isLoadingMissing 
  } = useMissingTimesheets(comparisonFilters);

  // ===== EXTRACTION DES DONNÉES DU BACKEND =====
  const comparisonData = comparisonResponse as BackendComparisonData | undefined;
  const missingData = missingResponse as BackendMissingData | undefined;

  // ===== HANDLERS =====
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newDateRange = {
      ...dateRange,
      [field]: value
    };
    onDateRangeChange(newDateRange.startDate, newDateRange.endDate);
    setComparisonFilters(prev => ({ ...prev, ...newDateRange }));
  };

  const handleAnomaliesToggle = (checked: boolean) => {
    setShowOnlyAnomalies(checked);
    setComparisonFilters(prev => ({ ...prev, anomaliesOnly: checked }));
  };

  // ===== FONCTIONS UTILITAIRES =====
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_time': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'late': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'slight_delay': return <Clock className="h-4 w-4 text-orange-600" />;
      case 'missing': return <Minus className="h-4 w-4 text-gray-600" />;
      case 'early_leave': return <TrendingDown className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on_time': return 'Ponctuel';
      case 'late': return 'En retard';
      case 'slight_delay': return 'Léger retard';
      case 'missing': return 'Manquant';
      case 'early_leave': return 'Parti tôt';
      case 'disputed': return 'En litige';
      case 'no_schedule': return 'Sans planning';
      default: return 'Statut inconnu';
    }
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (status) {
      case 'on_time': return 'default';
      case 'late': return 'destructive';
      case 'slight_delay': return 'secondary';
      case 'missing': return 'outline';
      case 'early_leave': return 'secondary';
      case 'disputed': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes && minutes !== 0) return 'N/A';
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    const sign = minutes < 0 ? '-' : '';
    return `${sign}${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'N/A';
    try {
      return format(parseISO(timeString), 'HH:mm');
    } catch {
      return 'Format invalide';
    }
  };

  const getUserFullName = (user: BackendUser) => {
    return `${user.firstName} ${user.lastName}`;
  };

  // ===== RENDU =====
  if (isLoadingComparison) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
              <span className="ml-2">Chargement de la comparaison...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (comparisonError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement de la comparaison: {(comparisonError as any)?.message || 'Erreur inconnue'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contrôles de la vue comparative */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Configuration de la comparaison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Période */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Date début</label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Date fin</label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="anomalies-only"
              checked={showOnlyAnomalies}
              onCheckedChange={(checked) => handleAnomaliesToggle(!!checked)}
            />
            <label htmlFor="anomalies-only" className="text-sm font-medium">
              Afficher uniquement les anomalies
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Résumé de la comparaison */}
      {comparisonData?.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Résumé de la période</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {comparisonData.summary.onTimeCount || 0}
                </div>
                <div className="text-sm text-gray-600">Ponctuels</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {comparisonData.summary.lateCount || 0}
                </div>
                <div className="text-sm text-gray-600">En retard</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {comparisonData.summary.missingCount || 0}
                </div>
                <div className="text-sm text-gray-600">Manquants</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {comparisonData.summary.disputedCount || 0}
                </div>
                <div className="text-sm text-gray-600">En litige</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(comparisonData.summary.punctualityRate || 0)}%
                </div>
                <div className="text-sm text-gray-600">Ponctualité</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {comparisonData.summary.total || 0}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des comparaisons */}
      <Card>
        <CardHeader>
          <CardTitle>
            Comparaison planning vs pointages 
            ({comparisonData?.comparisons?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!comparisonData?.comparisons || comparisonData.comparisons.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Aucune donnée trouvée pour cette période
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {comparisonData.comparisons.map((comparison: BackendTimesheetComparison) => (
                <div 
                  key={comparison._id} 
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Info employé */}
                      <div className="flex items-center gap-3 mb-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {getUserFullName(comparison.user)}
                        </span>
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {comparison.agency.name}
                        </span>
                        <span className="text-sm text-gray-600">
                          {format(parseISO(comparison.date), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      </div>

                      {/* Comparaison horaires */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Planning prévu */}
                        <div className="bg-blue-50 rounded p-3">
                          <div className="text-sm font-medium text-blue-800 mb-1">
                            Planning prévu
                          </div>
                          <div className="text-sm space-y-1">
                            <div>
                              Début: {formatTime(comparison.plannedSchedule.startTime)}
                            </div>
                            <div>
                              Fin: {formatTime(comparison.plannedSchedule.endTime)}
                            </div>
                            <div>
                              Durée: {formatDuration(comparison.plannedSchedule.totalMinutes)}
                            </div>
                          </div>
                        </div>

                        {/* Pointage réel */}
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-sm font-medium text-gray-800 mb-1">
                            Pointage réel
                          </div>
                          {comparison.actualTimesheet ? (
                            <div className="text-sm space-y-1">
                              <div>
                                Début: {formatTime(comparison.actualTimesheet.startTime)}
                              </div>
                              <div>
                                Fin: {formatTime(comparison.actualTimesheet.endTime)}
                              </div>
                              <div>
                                Durée: {formatDuration(comparison.actualTimesheet.totalWorkedMinutes)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-red-600">
                              Aucun pointage trouvé
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Analyse */}
                      {comparison.analysis && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(comparison.analysis.status)}
                            <Badge variant={getStatusBadgeVariant(comparison.analysis.status)}>
                              {getStatusLabel(comparison.analysis.status)}
                            </Badge>
                          </div>
                          
                          {comparison.analysis.variance && (
                            <div className="text-sm text-gray-600">
                              Écart: {formatDuration(comparison.analysis.variance)}
                            </div>
                          )}
                          
                          {comparison.analysis.notes && (
                            <div className="text-sm text-gray-600">
                              {comparison.analysis.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pointages manquants */}
      {missingData && missingData.missingTimesheets && missingData.missingTimesheets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Pointages manquants ({missingData.count || missingData.missingTimesheets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {missingData.missingTimesheets.map((missing: BackendMissingTimesheet, index: number) => (
                <div key={missing._id || index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-red-600" />
                    <span className="font-medium">
                      {getUserFullName(missing.user)}
                    </span>
                    <Building className="h-4 w-4 text-red-600" />
                    <span>
                      {missing.agency.name}
                    </span>
                    <Calendar className="h-4 w-4 text-red-600" />
                    <span>
                      {format(parseISO(missing.date), 'dd/MM/yyyy', { locale: fr })}
                    </span>
                    {missing.urgency && (
                      <Badge variant={missing.urgency === 'high' ? 'destructive' : 'secondary'}>
                        {missing.urgency === 'high' ? 'Urgent' : 
                         missing.urgency === 'medium' ? 'Moyen' : 'Faible'}
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" variant="outline">
                    Créer pointage
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}