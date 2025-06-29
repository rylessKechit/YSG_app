// src/types/reports.ts - Types pour la fonctionnalité Rapports
import { ApiResponse } from './api';

// ================================
// TYPES DE BASE
// ================================

export type ReportType = 'ponctualite' | 'performance' | 'activite' | 'custom';
export type ReportFormat = 'json' | 'csv' | 'excel' | 'pdf';
export type ReportPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

// ================================
// FILTRES POUR RAPPORTS
// ================================

export interface ReportFilters {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
  agencies?: string[];
  users?: string[];
  format?: ReportFormat;
  includeDetails?: boolean;
  includeComparison?: boolean;
  includeGraphiques?: boolean;
}

export interface ReportExportOptions {
  type: ReportType;
  format: ReportFormat;
  period: {
    start: string;
    end: string;
  };
  filters: {
    agencies?: string[];
    users?: string[];
    includeGraphiques?: boolean;
    includeDetails?: boolean;
  };
  delivery: {
    method: 'download' | 'email';
    email?: string;
  };
}

// ================================
// RAPPORT PONCTUALITÉ
// ================================

export interface PunctualityReportData {
  periode: {
    debut: string;
    fin: string;
    jours: number;
  };
  global: {
    totalPointages: number;
    ponctuelArrivees: number;
    retards: number;
    tauxPonctualite: number;
    retardMoyen: number;
    evolution: number;
    objectif: number;
  };
  parAgence: AgencyPunctualityStats[];
  tendances: {
    parJourSemaine: WeeklyTrend[];
  };
  topFlop?: {
    meilleursPerformers: UserPerformance[];
    bonnesPerformances: UserPerformance[];
    aAmeliorer: UserPerformance[];
  };
  metadata: {
    genereA: string;
    filtres: ReportFilters;
    includeDetails: boolean;
  };
}

export interface AgencyPunctualityStats {
  agenceId: string;
  nom: string;
  code: string;
  totalPointages: number;
  ponctuelArrivees: number;
  retards: number;
  taux: number;
  retardMoyen: number;
  evolution?: number;
  statut: 'excellent' | 'bon' | 'moyen' | 'faible';
}

export interface UserPerformance {
  userId: string;
  prenom: string;
  nom: string;
  agence: string;
  totalPointages: number;
  retards: number;
  taux: number;
  retardMoyen: number;
  performance: 'excellent' | 'bon' | 'moyen' | 'faible';
}

export interface WeeklyTrend {
  jour: string;
  totalPointages: number;
  retards: number;
  taux: number;
}

// ================================
// RAPPORT PERFORMANCE
// ================================

export interface PerformanceReportData {
  periode: {
    debut: string;
    fin: string;
  };
  global: {
    totalPreparations: number;
    tempsMoyenGlobal: number;
    objectifTemps: number;
    tauxRespectObjectif: number;
  };
  parAgence: AgencyPerformanceStats[];
  parUtilisateur: UserPerformanceStats[];
  tendances: {
    evolution: PerformanceEvolution[];
    picActivite: ActivityPeak[];
  };
  comparaison?: {
    periodePrecedente: {
      tempsMoyen: number;
      evolution: number;
    };
  };
}

export interface AgencyPerformanceStats {
  agenceId: string;
  nom: string;
  totalPreparations: number;
  tempsMoyen: number;
  tempsMoyenObjectif: number;
  tauxReussiteObjectif: number;
  efficacite: 'excellent' | 'bon' | 'moyen' | 'faible';
}

export interface UserPerformanceStats {
  userId: string;
  prenom: string;
  nom: string;
  agence: string;
  totalPreparations: number;
  tempsMoyen: number;
  meilleurePerformance: number;
  pirePerformance: number;
  constance: number;
  classement: number;
}

export interface PerformanceEvolution {
  date: string;
  tempsMoyen: number;
  totalPreparations: number;
}

export interface ActivityPeak {
  heure: number;
  nombrePreparations: number;
  tempsMoyen: number;
}

// ================================
// RAPPORT ACTIVITÉ
// ================================

export interface ActivityReportData {
  periode: {
    debut: string;
    fin: string;
  };
  volumetrie: {
    totalJoursOuvres: number;
    joursAvecActivite: number;
    totalHeures: number;
    moyenneHeuresParJour: number;
  };
  repartition: {
    parAgence: AgencyActivityStats[];
    parUtilisateur: UserActivityStats[];
    parJourSemaine: DayActivityStats[];
    parHeureJour: HourlyActivityStats[];
  };
  tendances: {
    croissance: number;
    saisonnalite: SeasonalityData[];
  };
}

export interface AgencyActivityStats {
  agenceId: string;
  nom: string;
  totalHeures: number;
  pourcentageTotal: number;
  moyenneParJour: number;
  picActivite: string;
}

export interface UserActivityStats {
  userId: string;
  prenom: string;
  nom: string;
  agence: string;
  totalHeures: number;
  moyenneParJour: number;
  joursActifs: number;
  regularite: number;
}

export interface DayActivityStats {
  jour: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
  totalHeures: number;
  pourcentage: number;
  moyenneUtilisateurs: number;
}

export interface HourlyActivityStats {
  heure: number;
  heureLibelle: string;
  totalActivite: number;
  pourcentage: number;
  intensite: 'faible' | 'moyenne' | 'forte' | 'pic';
}

export interface SeasonalityData {
  mois: string;
  activite: number;
  tendance: 'hausse' | 'baisse' | 'stable';
}

// ================================
// RÉPONSES API
// ================================

export interface ReportListResponse {
  reports: ReportSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ReportSummary {
  id: string;
  type: ReportType;
  titre: string;
  description: string;
  periode: {
    debut: string;
    fin: string;
  };
  statut: 'generating' | 'ready' | 'error';
  creeA: string;
  creeParUserId: string;
  creeParUserNom: string;
  taille?: number;
  format: ReportFormat;
  lienTelechargement?: string;
}

export interface ReportExportResponse {
  success: boolean;
  data: {
    export: boolean;
    format: ReportFormat;
    filename: string;
    data?: any;
    summary?: any;
    downloadUrl?: string;
    reportId?: string;
  };
}

// ================================
// TYPES POUR L'UI
// ================================

export interface ReportChartData {
  punctuality: {
    timeline: Array<{
      date: string;
      rate: number;
      total: number;
      onTime: number;
      late: number;
    }>;
    byAgency: Array<{
      name: string;
      rate: number;
      total: number;
    }>;
  };
  performance: {
    timeline: Array<{
      date: string;
      averageTime: number;
      target: number;
      preparations: number;
    }>;
    distribution: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
  };
  activity: {
    hourly: Array<{
      hour: number;
      activity: number;
      intensity: string;
    }>;
    weekly: Array<{
      day: string;
      hours: number;
      percentage: number;
    }>;
  };
}

export interface ReportFormData {
  type: ReportType;
  title?: string;
  description?: string;
  period: ReportPeriod;
  startDate?: Date;
  endDate?: Date;
  agencies: string[];
  users: string[];
  format: ReportFormat;
  includeDetails: boolean;
  includeComparison: boolean;
  includeCharts: boolean;
  delivery: {
    method: 'download' | 'email';
    email?: string;
  };
}

// ================================
// TYPES POUR FILTRES AVANCÉS
// ================================

export interface AdvancedReportFilters extends ReportFilters {
  metriques?: {
    ponctualite?: boolean;
    performance?: boolean;
    activite?: boolean;
    satisfaction?: boolean;
  };
  seuils?: {
    retardMax?: number;
    tempsMax?: number;
    tauxMinimal?: number;
  };
  groupage?: {
    parAgence?: boolean;
    parUtilisateur?: boolean;
    parJour?: boolean;
    parHeure?: boolean;
  };
  comparaison?: {
    periodePrecedente?: boolean;
    objectifs?: boolean;
    moyenne?: boolean;
  };
}

// ================================
// CONSTANTES
// ================================

export const REPORT_TYPES = {
  ponctualite: 'Rapport de Ponctualité',
  performance: 'Rapport de Performance',
  activite: 'Rapport d\'Activité',
  custom: 'Rapport Personnalisé'
} as const;

export const REPORT_FORMATS = {
  json: 'JSON',
  csv: 'CSV',
  excel: 'Excel',
  pdf: 'PDF'
} as const;

export const REPORT_PERIODS = {
  today: 'Aujourd\'hui',
  week: 'Cette semaine',
  month: 'Ce mois',
  quarter: 'Ce trimestre',
  year: 'Cette année',
  custom: 'Période personnalisée'
} as const;