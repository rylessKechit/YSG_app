// admin-app/src/types/preparation.ts

/**
 * Types et interfaces pour les préparations
 */

// ===== ENUMS =====

export enum PreparationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

export enum PreparationStep {
  EXTERIOR = 'exterior',
  INTERIOR = 'interior',
  FUEL = 'fuel',
  TIRES_FLUIDS = 'tires_fluids',
  SPECIAL_WASH = 'special_wash',
  PARKING = 'parking'
}

export enum IssueType {
  DAMAGE = 'damage',
  MISSING_ITEM = 'missing_item',
  TECHNICAL = 'technical',
  OTHER = 'other'
}

export enum IssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// ===== INTERFACES DE BASE =====

export interface PreparationVehicle {
  id: string;
  licensePlate: string;
  model: string;
  brand: string;
  year?: number;
  color?: string;
  condition?: string;
}

export interface PreparationUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface PreparationAgency {
  id: string;
  name: string;
  code: string;
  client: string;
  address?: string;
}

export interface PreparationStepData {
  step: PreparationStep;
  completed: boolean;
  completedAt?: Date;
  notes?: string;
  photos?: string[];
  photosCount?: number;
}

export interface PreparationIssue {
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  photos?: string[];
  reportedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

export interface AgencyChangeHistory {
  fromAgency: {
    id: string;
    name: string;
    code: string;
  };
  toAgency: {
    id: string;
    name: string;
    code: string;
  };
  changedBy: {
    id: string;
    name: string;
    email: string;
  };
  reason?: string;
  changedAt: Date;
}

export interface AdminModification {
  modifiedBy: {
    id: string;
    name: string;
    email: string;
  };
  modifiedAt: Date;
  type: 'steps_modification' | 'agency_change' | 'status_change';
  previousSteps?: Array<{
    step: string;
    completed: boolean;
    notes?: string;
  }>;
  newSteps?: Array<{
    step: string;
    completed: boolean;
    notes?: string;
  }>;
  adminNotes?: string;
  changes?: {
    added: Array<{
      step: string;
      completed: boolean;
      notes?: string;
    }>;
    removed: Array<{
      step: string;
      completed: boolean;
      notes?: string;
    }>;
    modified: Array<{
      step: string;
      completed: boolean;
      notes?: string;
    }>;
  };
}

// ===== INTERFACE PRÉPARATION PRINCIPALE =====

export interface Preparation {
  id: string;
  vehicle: PreparationVehicle;
  user: PreparationUser;
  agency: PreparationAgency;
  status: PreparationStatus;
  progress: number;
  duration: number;
  totalTime?: number;
  isOnTime: boolean;
  startTime?: Date;
  endTime?: Date;
  steps: PreparationStepData[];
  issues?: PreparationIssue[];
  notes?: string;
  agencyHistory?: AgencyChangeHistory[];
  adminModifications?: AdminModification[];
  createdAt: Date;
  updatedAt: Date;
}

// ===== FILTRES ET RECHERCHE =====

export interface PreparationFilters {
  page?: number;
  limit?: number;
  search?: string;
  user?: string;
  agency?: string;
  status?: PreparationStatus | 'all';
  startDate?: string;
  endDate?: string;
  sort?: 'createdAt' | 'startTime' | 'endTime' | 'totalTime' | 'user' | 'agency' | 'vehicle';
  order?: 'asc' | 'desc';
}

export interface PreparationSearchParams {
  search: string;
  user: string;
  agency: string;
  status: string;
  startDate: string;
  endDate: string;
}

// ===== STATISTIQUES =====

export interface PreparationGlobalStats {
  totalPreparations: number;
  averageTime: number;
  onTimeRate: number;
  completionRate: number;
}

export interface PreparationStatusStats {
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface PreparationAgencyStats {
  agency: {
    id: string;
    name: string;
    code: string;
  };
  count: number;
  averageTime: number;
  onTimeRate: number;
}

export interface PreparationUserStats {
  user: {
    id: string;
    name: string;
    email: string;
  };
  count: number;
  averageTime: number;
  onTimeRate: number;
}

export interface PreparationStats {
  global: PreparationGlobalStats;
  byStatus: PreparationStatusStats;
  byAgency: PreparationAgencyStats[];
  topUsers: PreparationUserStats[];
}

// ===== PAGINATION =====

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ===== RÉPONSES API =====

export interface PreparationListResponse {
  success: boolean;
  data: {
    preparations: Preparation[];
    pagination: Pagination;
    filters: PreparationFilters;
    stats: {
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
      cancelled: number;
    };
  };
}

export interface PreparationDetailResponse {
  success: boolean;
  data: {
    preparation: Preparation;
  };
}

export interface PreparationStatsResponse {
  success: boolean;
  data: {
    stats: PreparationStats;
    period: {
      startDate: Date | null;
      endDate: Date | null;
    };
    filters: {
      agency?: string;
    };
  };
}

export interface PreparationPhotosResponse {
  success: boolean;
  data: {
    preparation: {
      id: string;
      vehicle: {
        licensePlate: string;
        model: string;
        brand: string;
      };
      user: {
        name: string;
        email: string;
      };
      totalPhotos: number;
      photosByStep: Record<string, number>;
    };
    photos: Array<{
      stepType: string;
      stepLabel: string;
      stepIcon: string;
      photoUrl: string;
      photoIndex: number;
      completedAt: string;
      notes?: string;
    }>;
  };
}

// ===== REQUÊTES ET RÉPONSES DE MUTATION =====

export interface UpdateAgencyRequest {
  agencyId: string;
  reason?: string;
}

export interface UpdateAgencyResponse {
  success: boolean;
  message: string;
  data: {
    preparation: {
      id: string;
      agency: PreparationAgency;
      agencyHistory: AgencyChangeHistory[];
    };
    change: AgencyChangeHistory;
  };
}

export interface UpdateStepsRequest {
  steps: Array<{
    step: string;
    completed: boolean;
    notes?: string;
  }>;
  adminNotes?: string;
}

export interface UpdateStepsResponse {
  success: boolean;
  message: string;
  data: {
    preparation: {
      id: string;
      steps: PreparationStepData[];
      progress: number;
      adminModifications: AdminModification[];
    };
  };
}

// ===== PROPS DES COMPOSANTS =====

export interface PreparationTableProps {
  preparations: Preparation[];
  pagination?: Pagination;
  filters: PreparationFilters;
  onFiltersChange: (filters: Partial<PreparationFilters>) => void;
  onPreparationSelect: (preparationId: string) => void;
  agencies: PreparationAgency[];
  isLoading?: boolean;
}

export interface PreparationFiltersProps {
  filters: PreparationFilters;
  onFiltersChange: (filters: Partial<PreparationFilters>) => void;
  agencies: PreparationAgency[];
  users: PreparationUser[];
  isLoading?: boolean;
}

export interface PreparationStatsProps {
  stats: PreparationStats['global'];
  statusStats: PreparationStatusStats;
  isLoading?: boolean;
}

export interface PreparationDetailProps {
  preparation: Preparation;
  onAgencyChange: (agencyId: string, reason?: string) => void;
  agencies: PreparationAgency[];
  isLoading?: boolean;
}

// ===== LABELS ET MAPPING =====

export const PREPARATION_STATUS_LABELS: Record<PreparationStatus, string> = {
  [PreparationStatus.PENDING]: 'En attente',
  [PreparationStatus.IN_PROGRESS]: 'En cours',
  [PreparationStatus.COMPLETED]: 'Terminée',
  [PreparationStatus.CANCELLED]: 'Annulée',
  [PreparationStatus.ON_HOLD]: 'En pause'
};

export const PREPARATION_STEP_LABELS: Record<PreparationStep, string> = {
  [PreparationStep.EXTERIOR]: 'Extérieur',
  [PreparationStep.INTERIOR]: 'Intérieur',
  [PreparationStep.FUEL]: 'Carburant',
  [PreparationStep.TIRES_FLUIDS]: 'Pneus & Fluides',
  [PreparationStep.SPECIAL_WASH]: 'Lavage Spécial',
  [PreparationStep.PARKING]: 'Stationnement'
};

export const PREPARATION_STEP_ICONS: Record<PreparationStep, string> = {
  [PreparationStep.EXTERIOR]: '🚗',
  [PreparationStep.INTERIOR]: '🧽',
  [PreparationStep.FUEL]: '⛽',
  [PreparationStep.TIRES_FLUIDS]: '🔧',
  [PreparationStep.SPECIAL_WASH]: '✨',
  [PreparationStep.PARKING]: '🅿️'
};

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  [IssueType.DAMAGE]: 'Dommage',
  [IssueType.MISSING_ITEM]: 'Élément manquant',
  [IssueType.TECHNICAL]: 'Problème technique',
  [IssueType.OTHER]: 'Autre'
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  [IssueSeverity.LOW]: 'Faible',
  [IssueSeverity.MEDIUM]: 'Moyen',
  [IssueSeverity.HIGH]: 'Élevé',
  [IssueSeverity.CRITICAL]: 'Critique'
};

// ===== FONCTIONS UTILITAIRES =====

export const getStatusColor = (status: PreparationStatus): string => {
  switch (status) {
    case PreparationStatus.PENDING:
      return 'bg-yellow-100 text-yellow-800';
    case PreparationStatus.IN_PROGRESS:
      return 'bg-blue-100 text-blue-800';
    case PreparationStatus.COMPLETED:
      return 'bg-green-100 text-green-800';
    case PreparationStatus.CANCELLED:
      return 'bg-red-100 text-red-800';
    case PreparationStatus.ON_HOLD:
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getProgressColor = (progress: number, isOnTime: boolean): string => {
  if (progress === 100) return 'bg-green-500';
  if (!isOnTime) return 'bg-red-500';
  if (progress >= 75) return 'bg-blue-500';
  if (progress >= 50) return 'bg-yellow-500';
  return 'bg-gray-300';
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h${remainingMinutes}min` : `${hours}h`;
};

export const getStepProgress = (steps: PreparationStepData[]): number => {
  if (!steps || steps.length === 0) return 0;
  const completedSteps = steps.filter(step => step.completed).length;
  return Math.round((completedSteps / steps.length) * 100);
};

// ===== TYPES DE COMPATIBILITÉ =====

export type Vehicle = PreparationVehicle;
export type User = PreparationUser;
export type Agency = PreparationAgency;