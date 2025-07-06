// preparator-app/src/lib/types/preparation.ts
// ✅ Types complets pour les préparations avec vehicleType

// ===== TYPES DE BASE =====

export type VehicleType = 'particulier' | 'utilitaire';
export type PreparationStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type StepType = 'exterior' | 'interior' | 'fuel' | 'tires_fluids' | 'special_wash' | 'parking';
export type FuelType = 'essence' | 'diesel' | 'electrique' | 'hybride';
export type VehicleCondition = 'excellent' | 'good' | 'fair' | 'poor';
export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueType = 'damage' | 'cleanliness' | 'missing_item' | 'mechanical' | 'other';

// ===== INTERFACES VÉHICULE =====

export interface VehicleInfo {
  id?: string;
  licensePlate: string;
  brand: string;
  model: string;
  vehicleType: VehicleType; // ✅ NOUVEAU : Type de véhicule pour facturation
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

// ===== INTERFACES AGENCE =====

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

// ===== INTERFACES UTILISATEUR =====

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

// ===== INTERFACES ÉTAPES =====

export interface StepDefinition {
  step: StepType;
  label: string;
  description: string;
  icon: string;
}

export interface PreparationStep {
  step: StepType;
  completed: boolean;
  completedAt?: Date;
  duration?: number; // en minutes
  notes?: string;
  photos?: StepPhoto[];
}

export interface PreparationStepData extends PreparationStep {
  label: string; // Ajouté côté frontend
}

export interface StepPhoto {
  url: string;
  description: string;
  uploadedAt: Date;
}

// ===== INTERFACES INCIDENTS =====

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

// ===== INTERFACES PRÉPARATION =====

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
  createdAt: Date;
  updatedAt: Date;
}

// Alias pour compatibilité
export type BackendPreparation = Preparation;

// ===== INTERFACES FORMULAIRES =====

export interface VehicleFormData {
  agencyId: string;
  licensePlate: string;
  brand: string;
  model: string;
  vehicleType: VehicleType; // ✅ NOUVEAU : Type de véhicule requis
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

export interface PreparationFilters {
  startDate?: Date;
  endDate?: Date;
  agencyId?: string;
  vehicleType?: VehicleType; // ✅ NOUVEAU : Filtrage par type de véhicule
  status?: PreparationStatus;
  search?: string;
  page?: number;
  limit?: number;
}

// ===== INTERFACES STATISTIQUES =====

export interface PreparationStats {
  totalPreparations: number;
  averageTime: number;
  onTimeRate: number;
  completionRate: number;
  bestTime: number;
  worstTime: number;
  byVehicleType?: { // ✅ NOUVEAU : Stats par type de véhicule
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

export interface PreparationHistory {
  preparations: Preparation[];
  filters: PreparationFilters;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ===== INTERFACES API =====

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ===== CONSTANTES =====

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
    step: 'tires_fluids',
    label: 'Pneus & Fluides',
    description: 'Pression pneus, niveaux huile/liquides',
    icon: '🔧'
  },
  {
    step: 'special_wash',
    label: 'Lavage Spécial',
    description: 'Traitement anti-bactérien, parfums',
    icon: '✨'
  },
  {
    step: 'parking',
    label: 'Stationnement',
    description: 'Positionnement final, vérification clés',
    icon: '🅿️'
  }
] as const;

// ✅ NOUVEAU : Constantes pour les types de véhicules
export const VEHICLE_TYPES = {
  PARTICULIER: 'particulier',
  UTILITAIRE: 'utilitaire'
} as const;

export const VEHICLE_TYPE_LABELS = {
  [VEHICLE_TYPES.PARTICULIER]: 'Véhicule particulier',
  [VEHICLE_TYPES.UTILITAIRE]: 'Véhicule utilitaire'
} as const;

export const VEHICLE_TYPE_DESCRIPTIONS = {
  [VEHICLE_TYPES.PARTICULIER]: 'Voiture, citadine, berline, break',
  [VEHICLE_TYPES.UTILITAIRE]: 'Fourgon, camionnette, van'
} as const;

export const VEHICLE_TYPE_ICONS = {
  [VEHICLE_TYPES.PARTICULIER]: '🚗',
  [VEHICLE_TYPES.UTILITAIRE]: '🚐'
} as const;

// Constantes pour les carburants
export const FUEL_TYPES = {
  ESSENCE: 'essence',
  DIESEL: 'diesel',
  ELECTRIQUE: 'electrique',
  HYBRIDE: 'hybride'
} as const;

export const FUEL_TYPE_LABELS = {
  [FUEL_TYPES.ESSENCE]: 'Essence',
  [FUEL_TYPES.DIESEL]: 'Diesel',
  [FUEL_TYPES.ELECTRIQUE]: 'Électrique',
  [FUEL_TYPES.HYBRIDE]: 'Hybride'
} as const;

// Constantes pour les conditions
export const VEHICLE_CONDITIONS = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor'
} as const;

export const VEHICLE_CONDITION_LABELS = {
  [VEHICLE_CONDITIONS.EXCELLENT]: 'Excellent',
  [VEHICLE_CONDITIONS.GOOD]: 'Bon',
  [VEHICLE_CONDITIONS.FAIR]: 'Moyen',
  [VEHICLE_CONDITIONS.POOR]: 'Mauvais'
} as const;

// Constantes pour les statuts
export const PREPARATION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export const PREPARATION_STATUS_LABELS = {
  [PREPARATION_STATUS.PENDING]: 'En attente',
  [PREPARATION_STATUS.IN_PROGRESS]: 'En cours',
  [PREPARATION_STATUS.COMPLETED]: 'Terminée',
  [PREPARATION_STATUS.CANCELLED]: 'Annulée'
} as const;

// ===== FONCTIONS UTILITAIRES =====

/**
 * Convertit une étape backend vers une étape frontend avec label
 */
export function adaptBackendStep(
  backendStep: PreparationStep | undefined, 
  stepDefinition: StepDefinition
): PreparationStepData {
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
 * Obtient le label d'un type de véhicule
 */
export function getVehicleTypeLabel(vehicleType: VehicleType): string {
  return VEHICLE_TYPE_LABELS[vehicleType] || vehicleType;
}

/**
 * Obtient l'icône d'un type de véhicule
 */
export function getVehicleTypeIcon(vehicleType: VehicleType): string {
  return VEHICLE_TYPE_ICONS[vehicleType] || '🚗';
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

/**
 * Vérifie si une préparation est dans les temps (< 30 min par défaut)
 */
export function isPreparationOnTime(currentDuration: number, timeLimit: number = 30): boolean {
  return currentDuration <= timeLimit;
}

// ===== TYPES D'UNION POUR L'AUTOCOMPLETION =====

export type AllowedStepType = typeof PREPARATION_STEPS[number]['step'];
export type AllowedVehicleType = keyof typeof VEHICLE_TYPE_LABELS;
export type AllowedFuelType = keyof typeof FUEL_TYPE_LABELS;
export type AllowedCondition = keyof typeof VEHICLE_CONDITION_LABELS;
export type AllowedStatus = keyof typeof PREPARATION_STATUS_LABELS;