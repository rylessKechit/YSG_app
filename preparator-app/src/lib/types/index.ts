// =====================================================
// FICHIER: preparator-app/src/lib/types/index.ts
// ✅ CORRECTION COMPLÈTE DES TYPES - Remplacer tout le contenu
// =====================================================

// ===== TYPES DE BASE =====

export type VehicleType = 'particulier' | 'utilitaire';
export type PreparationStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type StepType = 'exterior' | 'interior' | 'fuel' | 'special_wash';
export type FuelType = 'essence' | 'diesel' | 'electrique' | 'hybride';
export type VehicleCondition = 'excellent' | 'good' | 'fair' | 'poor';
export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueType = 'damage' | 'cleanliness' | 'missing_item' | 'mechanical' | 'other';

// ===== INTERFACES DE BASE =====

export interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
  isDefault?: boolean;
  isActive?: boolean;
  address?: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
  workingHours?: {
    start: string;
    end: string;
    breakStart?: string;
    breakEnd?: string;
  };
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'preparateur';
  agencies: Agency[];
  isActive: boolean;
  stats?: UserStats;
  createdAt: Date;
  updatedAt: Date; // ✅ AJOUTÉ pour corriger l'erreur
  lastLogin?: Date;
}

export interface UserStats {
  totalPreparations: number;
  averageTime: number;
  completionRate: number;
  onTimeRate: number;
  issuesReported: number;
  lastCalculated?: Date;
}

export interface VehicleInfo {
  id?: string;
  licensePlate: string;
  brand: string;
  model: string;
  vehicleType: VehicleType;
  year?: number;
  fuelType?: FuelType;
  color?: string;
  condition?: VehicleCondition;
}

export interface Vehicle extends VehicleInfo {
  id: string;
  agency?: Agency;
  status?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// ===== INTERFACES PRÉPARATION =====

export interface PreparationStep {
  step: StepType;
  completed: boolean;
  completedAt?: Date;
  duration?: number; // en minutes
  notes?: string;
  photos?: StepPhoto[];
}

export interface StepPhoto {
  url: string;
  description: string;
  uploadedAt: Date;
}

export interface Issue {
  id: string;
  type: IssueType;
  description: string;
  severity: IssueSeverity;
  reportedAt: Date;
  photos?: string[];
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// ✅ INTERFACE PREPARATION COMPLÈTE AVEC TOUTES LES PROPRIÉTÉS
export interface Preparation {
  id: string;
  vehicle: VehicleInfo;
  agency: Agency;
  user: User;
  status: PreparationStatus;
  steps: PreparationStep[];
  startTime: Date;
  endTime?: Date;
  totalTime?: number; // en minutes
  progress: number; // pourcentage 0-100
  currentDuration: number; // en minutes
  isOnTime?: boolean;
  issues?: Issue[];
  notes?: string;
  qualityCheck?: {
    passed: boolean;
    checkedBy?: string;
    checkedAt?: Date;
    notes?: string;
  };
  createdAt: Date; // ✅ PROPRIÉTÉ REQUISE
  updatedAt: Date; // ✅ PROPRIÉTÉ REQUISE
}

// ===== INTERFACES FORMULAIRES =====

export interface VehicleFormData {
  agencyId: string;
  licensePlate: string;
  brand?: string;
  model: string;
  vehicleType: VehicleType;
  color?: string;
  year?: number | null;
  fuelType?: FuelType;
  condition?: VehicleCondition;
  notes?: string;
}

export interface StepCompletionData {
  step: StepType;
  photo: File;
  notes?: string;
}

export interface IssueReportData {
  type: IssueType;
  description: string;
  severity?: IssueSeverity;
  photo?: File;
}

// ===== INTERFACES FILTRES =====

export interface PreparationFilters {
  startDate?: Date;
  endDate?: Date;
  agencyId?: string;
  vehicleType?: VehicleType;
  status?: PreparationStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TimesheetFilters {
  startDate?: Date;
  endDate?: Date;
  agencyId?: string;
}

// ===== INTERFACES HISTORIQUE ET PAGINATION =====

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ✅ INTERFACE PREPARATION_HISTORY CORRIGÉE
export interface PreparationHistory {
  preparations: Preparation[];
  filters: PreparationFilters;
  pagination: PaginationInfo;
}

// ===== INTERFACES STATISTIQUES =====

export interface PreparationStats {
  totalPreparations: number;
  averageTime: number;
  onTimeRate: number;
  completionRate: number;
  bestTime: number;
  worstTime: number;
  byVehicleType?: {
    particulier: {
      count: number;
      averageTime: number;
      onTimeRate: number;
    };
    utilitaire: {
      count: number;
      averageTime: number;
      onTimeRate: number;
    };
  };
  weeklyStats: Array<{
    date: string;
    count: number;
    averageTime: number;
    particulier: number;
    utilitaire: number;
  }>;
  stepStats: Array<{
    stepType: StepType;
    averageTime: number;
    completionRate: number;
  }>;
}

// ===== INTERFACES API =====

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
  pagination?: PaginationInfo;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: PaginationInfo;
}

// ===== INTERFACES FORMULAIRES =====

export interface LoginFormData {
  email: string;
  password: string;
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
}

// ===== INTERFACES HOOKS =====

export interface UsePreparationReturn {
  currentPreparation: Preparation | null;
  isLoading: boolean;
  error: string | null;
  startPreparation: (data: VehicleFormData) => Promise<boolean>;
  completeStep: (preparationId: string, data: StepCompletionData) => Promise<boolean>;
  completePreparation: (preparationId: string, notes?: string) => Promise<boolean>;
  reportIssue: (preparationId: string, data: IssueReportData) => Promise<boolean>;
  clearError: () => void;
}

export interface TimesheetStatus {
  isWorking: boolean;
  isOnBreak: boolean;
  currentAgency?: Agency;
  startTime?: Date;
  breakStart?: Date;
  totalWorkedToday: number;
  totalBreakToday: number;
}

export interface UseTimesheetReturn {
  status: TimesheetStatus | null;
  isLoading: boolean;
  error: string | null;
  clockIn: (agencyId: string) => Promise<boolean>;
  clockOut: (agencyId: string) => Promise<boolean>;
  startBreak: (agencyId: string) => Promise<boolean>;
  endBreak: (agencyId: string) => Promise<boolean>;
  refreshStatus: () => Promise<void>;
  clearError: () => void;
}

// ===== CONSTANTES ÉTAPES =====

export interface StepDefinition {
  step: StepType;
  label: string;
  description: string;
  icon: string;
}

export const PREPARATION_STEPS: readonly StepDefinition[] = [
  {
    step: 'exterior',
    label: 'Extérieur',
    description: 'Nettoyage carrosserie, vitres, jantes',
    icon: '🚗'
  },
  {
    step: 'interior',
    label: 'Intérieur', 
    description: 'Aspirateur, nettoyage surfaces, désinfection',
    icon: '🧽'
  },
  {
    step: 'fuel',
    label: 'Carburant',
    description: 'Vérification niveau, ajout si nécessaire',
    icon: '⛽'
  },
  {
    step: 'special_wash',
    label: 'Lavage Spécial',
    description: 'Traitement anti-bactérien, parfums',
    icon: '✨'
  }
] as const;

// ===== ENUMS =====

export enum PreparationStatusEnum {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum UserRole {
  ADMIN = 'admin',
  PREPARATEUR = 'preparateur'
}

export enum IssueSeverityEnum {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

// ===== TYPES D'UNION POUR L'AUTOCOMPLÉTION =====

export type AllowedStepType = typeof PREPARATION_STEPS[number]['step'];
export type AllowedVehicleType = VehicleType;
export type AllowedFuelType = FuelType;
export type AllowedCondition = VehicleCondition;
export type AllowedStatus = PreparationStatus;

// ===== UTILITAIRES =====

/**
 * Adapte une étape backend vers le format frontend
 */
export function adaptBackendStep(
  stepDefinition: StepDefinition, 
  backendStep?: PreparationStep
): PreparationStep & { label: string } {
  return {
    step: stepDefinition.step,
    label: stepDefinition.label,
    completed: backendStep?.completed || false,
    completedAt: backendStep?.completedAt,
    duration: backendStep?.duration,
    notes: backendStep?.notes,
    photos: backendStep?.photos
  };
}

/**
 * Trouve une définition d'étape par son type
 */
export function getStepDefinition(stepType: StepType): StepDefinition | undefined {
  return PREPARATION_STEPS.find(step => step.step === stepType);
}

/**
 * Calcule la progression d'une préparation
 */
export function calculateProgress(steps: PreparationStep[]): number {
  if (!steps || steps.length === 0) return 0;
  const completedSteps = steps.filter(step => step.completed).length;
  return Math.round((completedSteps / steps.length) * 100);
}

/**
 * Vérifie si une préparation peut être terminée
 */
export function canCompletePreparation(steps: PreparationStep[]): boolean {
  return steps.some(step => step.completed);
}

/**
 * Formate une durée en minutes vers un string lisible
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`;
}