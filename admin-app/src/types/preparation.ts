// admin-app/src/types/preparation.ts - VERSION CORRIGÉE
// ✅ CORRECTION PRINCIPALE : Interface Pagination sans conflit de propriété

export interface Pagination {
  page: number;
  limit: number;
  total: number;  // ✅ RENOMMÉ: "Pagination" → "total" 
  totalPages: number; // ✅ OBLIGATOIRE pour éviter l'erreur undefined
  totalCount?: number; // ✅ OPTIONNEL pour compatibilité backend
  pages?: number; // ✅ OPTIONNEL pour backward compatibility
  hasNext?: boolean;
  hasPrev?: boolean;
  hasNextPage?: boolean; 
  hasPrevPage?: boolean;
}

// ===== ENUMS ET TYPES DE BASE =====

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
  SPECIAL_WASH = 'special_wash'
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

export enum VehicleType {
  PARTICULIER = 'particulier',
  UTILITAIRE = 'utilitaire'
}

export enum FuelType {
  ESSENCE = 'essence',
  DIESEL = 'diesel',
  ELECTRIQUE = 'electrique',
  HYBRIDE = 'hybride'
}

export enum VehicleCondition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}

// ===== INTERFACES SYSTÈME =====

export interface PreparationUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: 'admin' | 'preparateur';
}

export interface PreparationAgency {
  id: string;
  name: string;
  code: string;
  client?: string;
  address?: {
    street?: string;
    city?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface VehicleInfo {
  id: string;
  licensePlate: string;
  brand?: string;
  model: string;
  vehicleType: VehicleType;
  year?: number;
  color?: string;
  fuelType?: FuelType;
  condition?: VehicleCondition;
}

// ===== INTERFACES MÉTIER =====

export interface PreparationStepData {
  step: PreparationStep;
  completed: boolean;
  completedAt?: Date;
  duration?: number;
  notes?: string;
  photos?: StepPhoto[];
}

export interface StepPhoto {
  url: string;
  description: string;
  uploadedAt: Date;
}

export interface PreparationIssue {
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

export interface AgencyChangeHistory {
  previousAgencyId: string;
  previousAgencyName: string;
  newAgencyId: string;
  newAgencyName: string;
  changedAt: Date;
  changedBy: PreparationUser;
  reason?: string;
}

export interface AdminModification {
  modifiedAt: Date;
  modifiedBy: PreparationUser;
  action: 'steps_updated' | 'status_changed' | 'agency_changed' | 'notes_added';
  details: Record<string, any>;
  reason?: string;
}

export interface Preparation {
  id: string;
  vehicle: VehicleInfo;
  agency: PreparationAgency;
  user: PreparationUser;
  status: PreparationStatus;
  steps: PreparationStepData[];
  startTime?: Date;
  endTime?: Date;
  totalTime?: number;
  progress: number;
  currentDuration: number;
  isOnTime?: boolean;
  issues?: PreparationIssue[];
  notes?: string;
  agencyHistory?: AgencyChangeHistory[];
  adminModifications?: AdminModification[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: PreparationUser;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
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
  selectedIds?: string[];
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

// ===== RÉPONSES API =====

export interface PreparationListResponse {
  success: boolean;
  data: {
    preparations: Preparation[];
    pagination: Pagination; // ✅ UTILISE l'interface corrigée
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

// ===== PROPS DES COMPOSANTS =====

export interface PreparationsTableProps {
  preparations: Preparation[];
  pagination?: Pagination; // ✅ UTILISE l'interface corrigée
  filters: PreparationFilters;
  onFiltersChange: (filters: Partial<PreparationFilters>) => void;
  onPreparationSelect: (preparationId: string) => void;
  agencies: PreparationAgency[];
  isLoading?: boolean;
  selectedPreparations?: string[];
  onSelectionChange?: (preparationIds: string[]) => void;
}

// ===== ALIAS POUR COMPATIBILITÉ =====
export type Agency = PreparationAgency;
export type User = PreparationUser;

// ===== LABELS ET CONSTANTES =====

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

export const formatDuration = (minutes: number | null | undefined): string => {
  if (!minutes || minutes === 0) return '0 min';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
};