// admin-app/src/lib/utils/timesheet-utils.ts - UTILITAIRES POUR TIMESHEETS
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Timesheet, 
  TimesheetComparison, 
  ComparisonAnalysis
} from '@/types/timesheet';
import { 
  PUNCTUALITY_THRESHOLDS,
  STATUS_COLORS,
  STATUS_LABELS 
} from '@/lib/utils/constants';

// ===== FORMATAGE DES DATES ET HEURES =====

/**
 * Formater une date pour l'affichage
 */
export function formatDate(date: string | Date, pattern: string = 'dd/MM/yyyy'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '—';
    return format(dateObj, pattern, { locale: fr });
  } catch {
    return '—';
  }
}

/**
 * Formater une heure pour l'affichage
 */
export function formatTime(time: string | Date, pattern: string = 'HH:mm'): string {
  try {
    const timeObj = typeof time === 'string' ? parseISO(time) : time;
    if (!isValid(timeObj)) return '—';
    return format(timeObj, pattern, { locale: fr });
  } catch {
    return '—';
  }
}

/**
 * Formater une durée en minutes en format lisible
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes === 0) return '0h00';
  
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? '-' : '';
  
  return `${sign}${hours}h${mins.toString().padStart(2, '0')}`;
}

/**
 * Formater une variance pour l'affichage
 */
export function formatVariance(variance: number | null): {
  text: string;
  status: 'positive' | 'negative' | 'neutral';
} {
  if (variance === null) {
    return { text: '—', status: 'neutral' };
  }
  
  if (variance === 0) {
    return { text: 'Ponctuel', status: 'positive' };
  }
  
  if (variance > 0) {
    return { 
      text: `+${variance}min`, 
      status: variance > PUNCTUALITY_THRESHOLDS.SLIGHT_DELAY_MAX ? 'negative' : 'neutral'
    };
  }
  
  return { 
    text: `${variance}min`, 
    status: 'positive' 
  };
}

// ===== CALCULS ET ANALYSE =====

/**
 * Calculer le statut de ponctualité basé sur la variance
 */
export function calculatePunctualityStatus(variance: number | null): ComparisonAnalysis['status'] {
  if (variance === null) return 'missing';
  
  if (variance > PUNCTUALITY_THRESHOLDS.SLIGHT_DELAY_MAX) return 'late';
  if (variance > PUNCTUALITY_THRESHOLDS.ON_TIME_MAX) return 'slight_delay';
  if (variance < -PUNCTUALITY_THRESHOLDS.ON_TIME_MAX) return 'early_leave';
  
  return 'on_time';
}

/**
 * Calculer la sévérité d'un écart
 */
export function calculateSeverity(variance: number | null): 'low' | 'medium' | 'high' | 'critical' {
  if (variance === null) return 'critical';
  
  const absVariance = Math.abs(variance);
  
  if (absVariance > PUNCTUALITY_THRESHOLDS.LATE_CRITICAL) return 'critical';
  if (absVariance > PUNCTUALITY_THRESHOLDS.SLIGHT_DELAY_MAX) return 'high';
  if (absVariance > PUNCTUALITY_THRESHOLDS.ON_TIME_MAX) return 'medium';
  
  return 'low';
}

/**
 * Vérifier si un timesheet est en retard
 */
export function isTimesheetLate(timesheet: Timesheet): boolean {
  return timesheet.delays.startDelay > PUNCTUALITY_THRESHOLDS.ON_TIME_MAX;
}

/**
 * Vérifier si un timesheet est complet
 */
export function isTimesheetComplete(timesheet: Timesheet): boolean {
  return timesheet.status === 'complete' || timesheet.status === 'validated';
}

/**
 * Calculer le temps total travaillé formaté
 */
export function calculateWorkedTime(timesheet: Timesheet): string {
  return formatDuration(timesheet.totalWorkedMinutes);
}

// ===== HELPERS POUR L'UI =====

/**
 * Obtenir les classes CSS pour un statut de timesheet
 */
export function getTimesheetStatusClasses(status: Timesheet['status']): {
  badge: string;
  text: string;
  background: string;
} {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.incomplete;
  
  return {
    badge: `${colors.bg} ${colors.text} ${colors.border}`,
    text: colors.text,
    background: colors.bg
  };
}

/**
 * Obtenir les classes CSS pour un statut de comparaison
 */
export function getComparisonStatusClasses(status: ComparisonAnalysis['status']): {
  badge: string;
  text: string;
  background: string;
} {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.missing;
  
  return {
    badge: `${colors.bg} ${colors.text} ${colors.border}`,
    text: colors.text,
    background: colors.bg
  };
}

/**
 * Obtenir le label d'un statut
 */
export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
}

/**
 * Obtenir la couleur de priorité pour une variance
 */
export function getVarianceColor(variance: number | null): 'green' | 'yellow' | 'red' | 'gray' {
  if (variance === null) return 'gray';
  
  const absVariance = Math.abs(variance);
  
  if (absVariance <= PUNCTUALITY_THRESHOLDS.ON_TIME_MAX) return 'green';
  if (absVariance <= PUNCTUALITY_THRESHOLDS.SLIGHT_DELAY_MAX) return 'yellow';
  return 'red';
}

// ===== VALIDATION ET PERMISSIONS =====

/**
 * Vérifier si un timesheet peut être modifié
 */
export function canEditTimesheet(timesheet: Timesheet): boolean {
  // Les timesheets validés ne peuvent généralement pas être modifiés
  return timesheet.status !== 'validated';
}

/**
 * Vérifier si un timesheet peut être supprimé
 */
export function canDeleteTimesheet(timesheet: Timesheet): boolean {
  // Généralement, on ne supprime pas les timesheets validés
  return timesheet.status !== 'validated';
}

/**
 * Vérifier si un timesheet peut être validé
 */
export function canValidateTimesheet(timesheet: Timesheet): boolean {
  return timesheet.status === 'complete' || timesheet.status === 'disputed';
}

// ===== ANALYSE ET STATISTIQUES =====

/**
 * Analyser une liste de timesheets pour des statistiques rapides
 */
export function analyzeTimesheets(timesheets: Timesheet[]): {
  total: number;
  onTime: number;
  late: number;
  missing: number;
  validated: number;
  disputed: number;
  punctualityRate: number;
  averageDelay: number;
} {
  const total = timesheets.length;
  const onTime = timesheets.filter(t => t.delays.startDelay <= PUNCTUALITY_THRESHOLDS.ON_TIME_MAX).length;
  const late = timesheets.filter(t => t.delays.startDelay > PUNCTUALITY_THRESHOLDS.ON_TIME_MAX).length;
  const missing = timesheets.filter(t => !t.startTime).length;
  const validated = timesheets.filter(t => t.status === 'validated').length;
  const disputed = timesheets.filter(t => t.status === 'disputed').length;
  
  const punctualityRate = total > 0 ? Math.round((onTime / total) * 100) : 0;
  
  const lateTimesheets = timesheets.filter(t => t.delays.startDelay > 0);
  const averageDelay = lateTimesheets.length > 0 
    ? Math.round(lateTimesheets.reduce((sum, t) => sum + t.delays.startDelay, 0) / lateTimesheets.length)
    : 0;
  
  return {
    total,
    onTime,
    late,
    missing,
    validated,
    disputed,
    punctualityRate,
    averageDelay
  };
}

/**
 * Analyser une liste de comparaisons
 */
export function analyzeComparisons(comparisons: TimesheetComparison[]): {
  total: number;
  byStatus: Record<ComparisonAnalysis['status'], number>;
  punctualityRate: number;
  averageDelay: number;
} {
  const total = comparisons.length;
  const byStatus: Record<ComparisonAnalysis['status'], number> = {
    on_time: 0,
    late: 0,
    slight_delay: 0,
    missing: 0,
    disputed: 0,
    early_leave: 0,
    no_schedule: 0
  };
  
  comparisons.forEach(comp => {
    byStatus[comp.analysis.status]++;
  });
  
  const punctualityRate = total > 0 
    ? Math.round((byStatus.on_time / total) * 100) 
    : 0;
  
  const delayedComparisons = comparisons.filter(c => 
    ['late', 'slight_delay'].includes(c.analysis.status) && 
    c.analysis.startVariance !== null
  );
  
  const averageDelay = delayedComparisons.length > 0
    ? Math.round(delayedComparisons.reduce((sum, c) => sum + (c.analysis.startVariance || 0), 0) / delayedComparisons.length)
    : 0;
  
  return {
    total,
    byStatus,
    punctualityRate,
    averageDelay
  };
}

// ===== FILTRES ET TRI =====

/**
 * Créer des filtres de date pour aujourd'hui
 */
export function getTodayFilters(): { startDate: string; endDate: string } {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  
  return {
    startDate: dateStr,
    endDate: dateStr
  };
}

/**
 * Créer des filtres de date pour cette semaine
 */
export function getWeekFilters(): { startDate: string; endDate: string } {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0]
  };
}

/**
 * Créer des filtres de date pour ce mois
 */
export function getMonthFilters(): { startDate: string; endDate: string } {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    startDate: firstDay.toISOString().split('T')[0],
    endDate: lastDay.toISOString().split('T')[0]
  };
}

// ===== EXPORT =====

/**
 * Préparer les données pour l'export
 */
export function prepareTimesheetsForExport(timesheets: Timesheet[]): Array<Record<string, any>> {
  return timesheets.map(timesheet => ({
    'Date': formatDate(timesheet.date),
    'Employé': typeof timesheet.user === 'object' 
      ? `${timesheet.user.firstName} ${timesheet.user.lastName}`
      : 'N/A',
    'Agence': typeof timesheet.agency === 'object' 
      ? timesheet.agency.name 
      : 'N/A',
    'Heure d\'arrivée': timesheet.startTime ? formatTime(timesheet.startTime) : 'Non pointé',
    'Heure de départ': timesheet.endTime ? formatTime(timesheet.endTime) : 'Non pointé',
    'Pause début': timesheet.breakStart ? formatTime(timesheet.breakStart) : '—',
    'Pause fin': timesheet.breakEnd ? formatTime(timesheet.breakEnd) : '—',
    'Temps travaillé': formatDuration(timesheet.totalWorkedMinutes),
    'Retard (min)': timesheet.delays.startDelay || 0,
    'Statut': getStatusLabel(timesheet.status),
    'Notes': timesheet.notes || '—',
    'Notes admin': timesheet.adminNotes || '—'
  }));
}