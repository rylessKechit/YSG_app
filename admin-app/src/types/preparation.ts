// admin-app/src/types/preparation.ts - TYPES CORRIGÉS
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
  SPECIAL_WASH = 'special_wash',
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
  brand: string;
  model: string;
  licensePlate: string;
  year?: number;
  color?: string;
  mileage?: number;
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
  client?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface PreparationStepData {
  step: PreparationStep;
  completed: boolean;
  completedAt?: Date;
  notes?: string;
  photos?: string[];
}

export interface PreparationIssue {
  type: IssueType;
  description: string;
  severity: IssueSeverity;
  photos?: string[];
  reportedAt?: Date;
}

export interface AgencyChangeHistory {
  fromAgency?: PreparationAgency;
  toAgency: PreparationAgency;
  changedAt: Date;
  changedBy: {
    id: string;
    name: string;
    email: string;
  };
  reason?: string;
}

export interface AdminModification {
  modifiedAt: Date;
  modifiedBy: {
    id: string;
    name: string;
    email: string;
  };
  type: 'step_update' | 'status_change' | 'agency_change' | 'notes_update';
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  reason?: string;
  modified: Array<{
    step: string;
    completed: boolean;
    notes?: string;
  }>;
}

// ===== INTERFACE PRÉPARATION PRINCIPALE =====

export interface Preparation {
  id: string;
  vehicle: PreparationVehicle;
  user: PreparationUser;
  agency: PreparationAgency;
  status: PreparationStatus;
  progress: number;
  duration?: number;
  totalTime?: number;
  isOnTime?: boolean;
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
  selectedIds?: string[]; // Pour les exports de sélection
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
  // ✅ Propriétés additionnelles pour compatibility
  totalPreparations?: number;
  averageTime?: number;
  onTimeRate?: number;
  completionRate?: number;
}

// ===== PAGINATION CORRIGÉE =====

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number; // ✅ Ajouté pour corriger l'erreur
  pages?: number; // ✅ Kept for backward compatibility
  hasNext?: boolean;
  hasPrev?: boolean;
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
    preparationId: string;
    vehicle?: {
      licensePlate: string;
      model: string;
      brand: string;
    };
    user?: {
      name: string;
      email: string;
    };
    photosByStep: Record<string, Array<{
      stepType: string;
      stepLabel: string;
      stepIcon: string;
      photoUrl: string;
      photoIndex: number;
      completedAt?: string;
      notes?: string;
      description?: string;
    }>>;
    photos: Array<{
      stepType: string;
      stepLabel: string;
      stepIcon: string;
      photoUrl: string;
      photoIndex: number;
      completedAt?: string;
      notes?: string;
      description?: string;
    }>;
    stats: {
      totalPhotos: number;
      totalSteps: number;
      completedSteps: number;
      stepsWithPhotos: number;
      // ✅ PAS de propriété "progress" car elle n'existe pas dans votre API
    };
    metadata?: {
      generatedAt: string;
      version?: string;
      environment?: string;
      error?: string;
    };
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

// ===== TYPE AGENCY ALIASÉ POUR COMPATIBILITY =====

export type Agency = PreparationAgency;

// ===== PROPS DES COMPOSANTS =====

export interface PreparationTableProps {
  preparations: Preparation[];
  pagination?: Pagination;
  filters: PreparationFilters;
  onFiltersChange: (filters: Partial<PreparationFilters>) => void;
  onPreparationSelect: (preparationId: string) => void;
  agencies: PreparationAgency[];
  isLoading?: boolean;
  selectedPreparations?: string[];
  onSelectionChange?: (preparationIds: string[]) => void;
}

export interface PreparationFiltersProps {
  filters: PreparationFilters;
  onFiltersChange: (filters: Partial<PreparationFilters>) => void;
  agencies: PreparationAgency[];
  users: PreparationUser[]; // ✅ Changé de PreparationUser[] vers User[]
  isLoading?: boolean;
}

export interface PreparationStatsProps {
  stats?: PreparationGlobalStats; // ✅ Optionnel au lieu de PreparationStats['global']
  statusStats?: PreparationStatusStats; // ✅ Optionnel
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
  [PreparationStep.SPECIAL_WASH]: 'Lavage Spécial',
};

export const PREPARATION_STEP_ICONS: Record<PreparationStep, string> = {
  [PreparationStep.EXTERIOR]: '🚗',
  [PreparationStep.INTERIOR]: '🧽',
  [PreparationStep.FUEL]: '⛽',
  [PreparationStep.SPECIAL_WASH]: '✨',
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

export const getStatusColor = (status: PreparationStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case PreparationStatus.PENDING:
      return 'secondary';
    case PreparationStatus.IN_PROGRESS:
      return 'default';
    case PreparationStatus.COMPLETED:
      return 'outline';
    case PreparationStatus.CANCELLED:
      return 'destructive';
    case PreparationStatus.ON_HOLD:
      return 'secondary';
    default:
      return 'secondary';
  }
};

export const getProgressColor = (progress: number, isOnTime?: boolean): string => {
  if (progress === 100) return 'bg-green-500';
  if (isOnTime === false) return 'bg-red-500';
  if (progress >= 75) return 'bg-blue-500';
  if (progress >= 50) return 'bg-yellow-500';
  return 'bg-gray-300';
};

export const formatDuration = (minutes?: number): string => {
  if (!minutes || minutes === 0) return '0min';
  
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0 
    ? `${hours}h${remainingMinutes}min`
    : `${hours}h`;
};

// ===== TYPES POUR L'EXPORT =====

export interface ExportOptions {
  format: 'excel' | 'csv' | 'pdf';
  includePhotos?: boolean;
  includeDetails?: boolean;
  includeStats?: boolean;
}

export interface BulkActionResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}