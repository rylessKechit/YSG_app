import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Users, 
  Building,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { useTimesheetComparison, useMissingTimesheets } from '@/hooks/use-timesheets';
import { 
  TimesheetComparison, 
  ComparisonFilters, 
  ComparisonData, 
  MissingTimesheetData,
  ComparisonAnalysis
} from '@/types/timesheet';
import { User } from '@/types/auth';
import { Agency } from '@/types/agency';

// ===== TYPES =====
interface TimesheetsComparisonViewProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  onDateRangeChange: (startDate: string, endDate: string) => void;
}

interface DayData {
  type: 'comparison' | 'missing';
  data: TimesheetComparison | (MissingTimesheetData['missingTimesheets'][0] & { user?: User | string | null; agency?: Agency | string | null; });
}

type ComparisonStatus = ComparisonAnalysis['status'] | 'missing' | 'no_schedule';

// ===== UTILITIES =====
const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) => {
  return new Intl.DateTimeFormat('fr-FR', options).format(date);
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  return result;
};

const isSameDay = (date1: Date, date2: Date) => {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
};

// ===== COMPOSANT PRINCIPAL =====
export function TimesheetsComparisonView({ dateRange, onDateRangeChange }: TimesheetsComparisonViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showOnlyAnomalies, setShowOnlyAnomalies] = useState(false);

  // Filtres API
  const comparisonFilters: ComparisonFilters = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    includeDetails: true,
    anomaliesOnly: showOnlyAnomalies
  };

  // Hooks API
  const { 
    data: comparisonResponse, 
    isLoading: isLoadingComparison,
    error: comparisonError,
    refetch: refetchComparison 
  } = useTimesheetComparison(comparisonFilters);

  const { 
    data: missingResponse, 
    isLoading: isLoadingMissing,
    refetch: refetchMissing 
  } = useMissingTimesheets(comparisonFilters);

  // Extraction des données
  const comparisonData = comparisonResponse as ComparisonData | undefined;
  const missingData = missingResponse as MissingTimesheetData | undefined;
  const comparisons = comparisonData?.comparisons || [];
  const summary = comparisonData?.summary;
  const missingTimesheets = missingData?.missingTimesheets || [];

  // Génération semaine courante
  const weekDays = useMemo(() => {
    const startOfCurrentWeek = startOfWeek(currentWeek);
    
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(startOfCurrentWeek, i);
      return {
        date: day,
        dateString: day.toISOString().split('T')[0],
        dayName: formatDate(day, { weekday: 'long' }),
        dayNumber: day.getDate().toString(),
        isToday: isSameDay(day, new Date())
      };
    });
  }, [currentWeek]);

  // Organisation des données par date
  const dataByDateAndUser = useMemo(() => {
    const organized = new Map<string, DayData>();
    
    comparisons.forEach(comparison => {
      // ✅ FIX: Vérification sécurisée pour comparison.user
      if (!comparison.user || !comparison.date) {
        console.warn('⚠️ Comparison sans user ou date:', comparison.id);
        return;
      }
      
      const userId = typeof comparison.user === 'object' && comparison.user 
        ? (comparison.user.id || comparison.user)
        : comparison.user;
      
      if (!userId) {
        console.warn('⚠️ Impossible d\'extraire userId pour comparison:', comparison.id);
        return;
      }
      
      const key = `${comparison.date}-${userId}`;
      organized.set(key, { type: 'comparison', data: comparison });
    });
    
    missingTimesheets.forEach(missing => {
      // ✅ FIX: Vérification sécurisée pour missing.user
      if (!missing.user || !missing.date) {
        console.warn('⚠️ Missing timesheet sans user ou date:', missing.id);
        return;
      }
      
      const userId = typeof missing.user === 'object' && missing.user
        ? (missing.user.id || missing.user)
        : missing.user;
      
      if (!userId) {
        console.warn('⚠️ Impossible d\'extraire userId pour missing:', missing.id);
        return;
      }
      
      const key = `${missing.date}-${userId}`;
      if (!organized.has(key)) {
        organized.set(key, { type: 'missing', data: missing });
      }
    });
    
    return organized;
  }, [comparisons, missingTimesheets]);

  // Fonctions utilitaires
  const getDataForDate = (dateString: string): DayData[] => {
    const dayData: DayData[] = [];
    for (const [key, value] of dataByDateAndUser.entries()) {
      if (key.startsWith(dateString)) {
        dayData.push(value);
      }
    }
    return dayData;
  };

  const getStatusIcon = (status: ComparisonStatus) => {
    const icons = {
      on_time: <CheckCircle className="h-4 w-4 text-green-600" />,
      late: <AlertTriangle className="h-4 w-4 text-red-600" />,
      slight_delay: <AlertTriangle className="h-4 w-4 text-orange-600" />,
      missing: <XCircle className="h-4 w-4 text-gray-600" />,
      no_schedule: <Calendar className="h-4 w-4 text-blue-600" />,
      disputed: <AlertTriangle className="h-4 w-4 text-orange-600" />,
      early_leave: <Clock className="h-4 w-4 text-blue-600" />
    };
    return icons[status] || <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getStatusBadge = (status: ComparisonStatus) => {
    const badges = {
      on_time: <Badge className="bg-green-100 text-green-800">À l'heure</Badge>,
      late: <Badge variant="destructive">En retard</Badge>,
      slight_delay: <Badge className="bg-orange-100 text-orange-800">Léger retard</Badge>,
      missing: <Badge variant="outline" className="border-gray-400 text-gray-600">Manquant</Badge>,
      no_schedule: <Badge variant="outline" className="border-blue-400 text-blue-600">Sans planning</Badge>,
      disputed: <Badge className="bg-orange-100 text-orange-800">En litige</Badge>,
      early_leave: <Badge variant="outline" className="border-blue-400 text-blue-600">Parti tôt</Badge>
    };
    return badges[status] || <Badge variant="outline">Inconnu</Badge>;
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--:--';
    if (timeString.match(/^\d{2}:\d{2}$/)) return timeString;
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return timeString;
    }
  };

  const getUserName = (user: User | string | null | undefined): string => {
    if (!user) return 'Utilisateur inconnu';
    if (typeof user === 'string') return user;
    if (typeof user === 'object' && user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'Utilisateur inconnu';
  };

  const getAgencyName = (agency: Agency | string | null | undefined): string => {
    if (!agency) return 'Agence inconnue';
    if (typeof agency === 'string') return agency;
    if (typeof agency === 'object' && agency.name) {
      return agency.name;
    }
    return 'Agence inconnue';
  };

  // Handlers
  const handleWeekNavigation = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
    
    const startOfNewWeek = startOfWeek(newWeek);
    const endOfNewWeek = addDays(startOfNewWeek, 6);
    
    onDateRangeChange(
      startOfNewWeek.toISOString().split('T')[0],
      endOfNewWeek.toISOString().split('T')[0]
    );
  };

  const handleRefresh = () => {
    refetchComparison();
    refetchMissing();
  };

  // États de chargement et erreur
  if (isLoadingComparison || isLoadingMissing) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <LoadingSpinner />
            <span className="ml-2">Chargement des comparaisons...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (comparisonError) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
            <p className="text-gray-600 mb-4">Impossible de charger les données de comparaison</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Comparaison Planning vs Pointages
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Navigation semaine */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleWeekNavigation('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                Semaine du {formatDate(weekDays[0]?.date, { day: '2-digit', month: 'short' })} au {formatDate(weekDays[6]?.date, { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleWeekNavigation('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Filtres */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="anomalies"
                checked={showOnlyAnomalies}
                onCheckedChange={(checked) => setShowOnlyAnomalies(!!checked)}
              />
              <label htmlFor="anomalies" className="text-sm">
                Anomalies uniquement
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résumé des données */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{summary.onTimeCount}</div>
              <div className="text-sm text-gray-600">À l'heure</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{summary.lateCount}</div>
              <div className="text-sm text-gray-600">En retard</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{summary.missingCount}</div>
              <div className="text-sm text-gray-600">Manquants</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.orphanCount || 0}</div>
              <div className="text-sm text-gray-600">Sans planning</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(summary.punctualityRate)}%</div>
              <div className="text-sm text-gray-600">Ponctualité</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vue Calendrier unique */}
      <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDays.map((day) => (
                <div key={day.dateString} className="text-center">
                  <div className="font-medium text-sm mb-2">
                    {day.dayName}
                  </div>
                  <div className={`text-lg font-bold ${day.isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {day.dayNumber}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayData = getDataForDate(day.dateString);
                
                return (
                  <div 
                    key={day.dateString} 
                    className={`min-h-[200px] border rounded-lg p-2 ${
                      day.isToday ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    {dayData.length === 0 ? (
                      <div className="text-center text-gray-400 text-sm mt-8">
                        Aucune donnée
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dayData.map((item, index) => {
                          const isComparison = item.type === 'comparison';
                          
                          if (isComparison) {
                            const comparison = item.data as TimesheetComparison;
                            
                            // ✅ FIX: Vérification que les données sont valides
                            if (!comparison.user || !comparison.agency) {
                              console.warn('⚠️ Comparison avec données manquantes:', comparison.id);
                              return null;
                            }
                            
                            return (
                              <div 
                                key={index}
                                className="p-2 rounded border bg-white text-xs space-y-1"
                              >
                                <div className="font-medium text-gray-900 truncate">
                                  {getUserName(comparison.user)}
                                </div>
                                <div className="text-gray-600 truncate">
                                  {getAgencyName(comparison.agency)}
                                </div>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(comparison.analysis.status)}
                                  {getStatusBadge(comparison.analysis.status)}
                                </div>
                                <div className="space-y-1">
                                  {comparison.plannedSchedule ? (
                                    <>
                                      <div className="text-blue-600">
                                        Prévu: {formatTime(comparison.plannedSchedule.startTime)} - {formatTime(comparison.plannedSchedule.endTime)}
                                      </div>
                                      {comparison.actualTimesheet && (
                                        <div className="text-gray-700">
                                          Réel: {formatTime(comparison.actualTimesheet.startTime)} - {formatTime(comparison.actualTimesheet.endTime)}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    comparison.actualTimesheet && (
                                      <div className="text-gray-700">
                                        Pointé: {formatTime(comparison.actualTimesheet.startTime)} - {formatTime(comparison.actualTimesheet.endTime)}
                                      </div>
                                    )
                                  )}
                                  {comparison.analysis.startVariance && comparison.analysis.startVariance !== 0 && (
                                    <div className={`text-xs ${comparison.analysis.startVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {comparison.analysis.startVariance > 0 ? '+' : ''}{comparison.analysis.startVariance} min
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          } else {
                            const missing = item.data as MissingTimesheetData['missingTimesheets'][0];
                            
                            // ✅ FIX: Vérification que les données sont valides
                            if (!missing.user || !missing.agency) {
                              console.warn('⚠️ Missing timesheet avec données manquantes:', missing.id);
                              return null;
                            }
                            
                            return (
                              <div 
                                key={index}
                                className="p-2 rounded border bg-red-50 border-red-200 text-xs space-y-1"
                              >
                                <div className="font-medium text-gray-900 truncate">
                                  {getUserName(missing.user)}
                                </div>
                                <div className="text-gray-600 truncate">
                                  {getAgencyName(missing.agency)}
                                </div>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon('missing')}
                                  {getStatusBadge('missing')}
                                </div>
                                <div className="text-blue-600 text-xs">
                                  Prévu: {formatTime(missing.startTime)} - {formatTime(missing.endTime)}
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}