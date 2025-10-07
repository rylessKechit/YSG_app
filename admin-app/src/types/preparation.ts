// ========================================
// FICHIER: admin-app/src/types/preparation.ts
// ✅ TOUS LES TYPES DE PRÉPARATION POUR L'ADMIN - VERSION CORRIGÉE
// ========================================

// ===== TYPES DE BASE =====
export type PreparationStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type StepType = 'exterior' | 'interior' | 'fuel' | 'special_wash';
export type VehicleType = 'VP' | 'VU';
export type FuelType = 'essence' | 'diesel' | 'hybrid' | 'electric';
export type VehicleCondition = 'excellent' | 'good' | 'fair' | 'poor';
export type IssueType = 'damage' | 'missing_item' | 'technical' | 'other';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

// ===== INTERFACES DE BASE =====
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

// Alias pour compatibilité avec les imports existants
export interface PreparationUser extends User {}

export interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
  address?: string;
}

export interface Vehicle {
  id: string;
  licensePlate: string;
  model: string;
  brand: string;
  year?: number;
  color?: string;
  condition?: VehicleCondition;
  vehicleType?: VehicleType;
}

// ===== INTERFACES ÉTAPES =====
export interface PreparationStep {
  step: StepType;
  completed: boolean;
  completedAt?: Date | string;
  notes?: string;
  photos?: string[];
  photosCount?: number;
}

export interface StepPhoto {
  url: string;
  description?: string;
  uploadedAt?: Date | string;
}

// ===== INTERFACES INCIDENTS =====
export interface PreparationIssue {
  id?: string;
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  photos?: string[];
  reportedAt: Date | string;
  resolvedAt?: Date | string;
  resolution?: string;
}

// ===== INTERFACES HISTORIQUE AGENCE =====
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
  reason: string;
  changedAt: Date | string;
}

// ===== INTERFACE PRÉPARATION PRINCIPALE =====
export interface Preparation {
  id: string;
  vehicle: Vehicle;
  user: User;
  agency: Agency;
  status: PreparationStatus;
  progress: number;
  duration: number;
  totalTime?: number;
  currentDuration?: number;
  isOnTime: boolean;
  startTime: Date | string;
  endTime?: Date | string;
  steps: PreparationStep[];
  issues?: PreparationIssue[];
  notes?: string;
  agencyHistory?: AgencyChangeHistory[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ===== INTERFACES PAGINATION - CORRECTION CRITIQUE =====

/**
 * ✅ Interface PaginationInfo - Version de base du backend
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * ✅ Interface Pagination - Version étendue avec héritage
 * RÉSOUT L'ERREUR: Type 'PaginationInfo | undefined' is not assignable to type 'Pagination | undefined'
 */
export interface Pagination extends PaginationInfo {
  totalPages: number;  // Propriété critique manquante
  totalCount: number;  // Propriété critique manquante
}

/**
 * ✅ Type union pour gérer toutes les variantes
 */
export type PaginationType = PaginationInfo | Pagination | undefined;

// ===== INTERFACES COMPOSANTS =====
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps {
  data: any[];
  columns: TableColumn[];
  pagination?: PaginationInfo;
  loading?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onPageChange?: (page: number) => void;
}

// ===== INTERFACES FILTRES =====
export interface PreparationFilters {
  search?: string;
  status?: PreparationStatus | 'all' | '';
  agencyId?: string;
  agency?: string; // Alias pour compatibilité
  userId?: string;
  user?: string; // Alias pour compatibilité
  vehicleType?: VehicleType;
  startDate?: string;
  endDate?: string;
  isOnTime?: boolean;
  hasIssues?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ===== INTERFACES STATISTIQUES - CORRECTIONS APPLIQUÉES =====

/**
 * ✅ Interface PreparationStats avec toutes propriétés optionnelles
 * RÉSOUT L'ERREUR: Type '{ stats: PreparationStats | { totalPreparations: number; ... }' not assignable
 */
export interface PreparationStats {
  // ✅ PROPRIÉTÉS DE BASE - TOUTES OPTIONNELLES
  total?: number;
  pending?: number;
  inProgress?: number;
  completed?: number;
  cancelled?: number;
  averageTime?: number;
  onTimeRate?: number;
  totalTime?: number;
  
  // ✅ PROPRIÉTÉS ÉTENDUES
  totalPreparations?: number;  // Ajouté pour compatibilité avec PreparationStatsCards
  completionRate?: number;     // Ajouté pour compatibilité avec PreparationStatsCards
  
  // ✅ STRUCTURES IMBRIQUÉES
  global?: {
    totalPreparations: number;
    averageTime?: number;
    onTimeRate?: number;
    totalTime?: number;
  };
  byStatus?: {
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  topUsers?: Array<{
    user: {
      id: string;
      name: string;
      email: string;
    };
    count: number;
    averageTime: number;
    onTimeRate: number;
  }>;
}

// Alias pour compatibilité avec les imports existants
export interface PreparationGlobalStats {
  totalPreparations?: number;
  averageTime?: number | undefined;
  onTimeRate?: number | undefined;
  completionRate?: number | undefined;
  totalTime?: number | undefined;
  pending?: number | undefined;
  inProgress?: number | undefined;
  completed?: number | undefined;
  cancelled?: number | undefined;
}

// Version avec garde de type pour éviter les erreurs undefined
export interface PreparationGlobalStatsStrict {
  totalPreparations: number;
  averageTime: number;
  onTimeRate: number;
  completionRate: number;
  totalTime: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

/**
 * ✅ AJOUT: Interface pour statusStats utilisée dans PreparationStatsCards
 * RÉSOUT L'ERREUR: Property 'statusStats' does not exist on type 'PreparationStatsCardsProps'
 */
export interface PreparationStatusStats {
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  total?: number;
}

// ===== INTERFACES REQUÊTES =====
export interface UpdateAgencyRequest {
  newAgencyId?: string;
  agencyId?: string;
  reason?: string;
  notes?: string;
}

export interface UpdateStepsRequest {
  steps: Array<{
    step: string;
    completed: boolean;
    notes?: string;
  }>;
  adminNotes?: string;
}

// ===== INTERFACES RÉPONSES API =====
export interface PreparationListResponse {
  success: boolean;
  data: {
    preparations: Preparation[];
    pagination: PaginationInfo;
    filters: PreparationFilters;
    stats: PreparationStats;
  };
  message?: string;
}

export interface PreparationDetailResponse {
  success: boolean;
  data: {
    preparation: Preparation;
  };
  message?: string;
}

export interface PreparationStatsResponse {
  success: boolean;
  data: {
    stats: PreparationStats;
    period: {
      startDate: Date | string;
      endDate: Date | string;
    };
    filters: {
      agency?: string;
      user?: string;
    };
  };
  message?: string;
}

export interface PreparationPhotosResponse {
  success: boolean;
  data: {
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
    totalPhotos: number;
    totalSteps: number;
    completedSteps: number;
    stepsWithPhotos: number;
    stats?: {
      totalPhotos: number;
      totalSteps: number;
      completedSteps: number;
      stepsWithPhotos: number;
    };
  };
  message?: string;
}

export interface UpdateAgencyResponse {
  success: boolean;
  message: string;
  data: {
    preparation: {
      id: string;
      agency: Agency;
      agencyHistory: AgencyChangeHistory[];
    };
    change: AgencyChangeHistory;
  };
}

export interface UpdateStepsResponse {
  success: boolean;
  message: string;
  data: {
    preparation: Preparation;
    changes: {
      added: PreparationStep[];
      removed: PreparationStep[];
      modified: PreparationStep[];
    };
    adminModification: {
      modifiedBy: User;
      modifiedAt: Date | string;
      type: string;
      adminNotes?: string;
    };
  };
}

// ===== TYPES DE FORMULAIRES =====
export interface PreparationSearchForm {
  search: string;
  status: PreparationStatus | 'all' | '';
  agencyId: string;
  agency: string;
  userId: string;
  user: string;
  startDate: string;
  endDate: string;
  isOnTime: boolean | null;
  hasIssues: boolean | null;
}

export interface UpdateAgencyForm {
  newAgencyId: string;
  agencyId: string;
  reason: string;
  notes: string;
}

export interface UpdateStepsForm {
  steps: Record<StepType, {
    completed: boolean;
    notes: string;
  }>;
  adminNotes: string;
}

// ===== INTERFACES POUR EXPORT =====
export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  agency?: string;
  user?: string;
  status?: PreparationStatus | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

export interface ExportOptions {
  filters: ExportFilters;
  format?: 'excel' | 'csv' | 'pdf';
  includePhotos?: boolean;
  includeDetails?: boolean;
}

export interface ExportPayload {
  type: 'activite' | 'custom';
  format: 'excel' | 'csv' | 'pdf';
  period: {
    start: string;
    end: string;
  };
  filters: {
    agencies?: string[];
    users?: string[];
    status?: string;
    search?: string;
    includeDetails: boolean;
    includeStats: boolean;
    includePhotos?: boolean;
    page?: number;
    limit?: number;
  };
  delivery: {
    method: 'download';
  };
}

// ===== INTERFACES POUR SUPPRESSION =====
export interface DeletePreparationParams {
  preparationId: string;
  reason: string;
  preserveData?: boolean;
}

export interface DeleteMultiplePreparationsParams {
  preparationIds: string[];
  reason: string;
  preserveData?: boolean;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

export interface DeleteMultipleResponse {
  success: boolean;
  message: string;
  deleted: number;
  errors?: any[];
}

// ===== INTERFACES POUR COMPOSANTS - AJOUTS POUR RÉSOUDRE ERREURS =====

/**
 * ✅ AJOUT: Props pour PreparationStatsCards
 * RÉSOUT L'ERREUR: Property 'statusStats' does not exist
 */
export interface PreparationStatsCardsProps {
  stats?: PreparationStats | null | undefined;
  statusStats?: PreparationStatusStats | undefined;
  isLoading?: boolean;
}

/**
 * ✅ AJOUT: Props pour PreparationsTable
 * RÉSOUT L'ERREUR: Types incompatibles pour pagination
 */
export interface PreparationsTableProps {
  preparations: Preparation[];
  pagination?: Pagination | undefined;
  filters: PreparationFilters;
  onFiltersChange: (filters: Partial<PreparationFilters>) => void;
  onPreparationSelect: (preparationId: string) => void;
  agencies: Agency[];
  isLoading?: boolean;
  selectedPreparations?: string[];
  onSelectionChange?: (preparationIds: string[]) => void;
}

// ===== CONSTANTES - CORRECTION DES EXPORTS =====
export const PREPARATION_STATUS_LABELS = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée'
} as const;

export const PREPARATION_STEP_LABELS = {
  exterior: 'Préparation extérieure',
  interior: 'Préparation intérieure', 
  fuel: 'Contrôle carburant',
  special_wash: 'Nettoyage spécialisé'
} as const;

export const VEHICLE_TYPE_LABELS = {
  VP: 'Véhicule Particulier',
  VU: 'Véhicule Utilitaire'
} as const;

export const ISSUE_TYPE_LABELS = {
  damage: 'Dommage',
  missing_item: 'Élément manquant',
  technical: 'Problème technique',
  other: 'Autre'
} as const;

export const ISSUE_SEVERITY_LABELS = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
  critical: 'Critique'
} as const;

// ===== TYPES UTILITAIRES =====
export type PreparationWithStats = Preparation & {
  stats?: {
    completedSteps: number;
    totalSteps: number;
    photosCount: number;
    issuesCount: number;
  };
};

export type PreparationSummary = Pick<
  Preparation,
  'id' | 'status' | 'progress' | 'duration' | 'isOnTime' | 'startTime' | 'endTime'
> & {
  vehicle: Pick<Vehicle, 'licensePlate' | 'brand' | 'model'>;
  user: Pick<User, 'id' | 'name'>;
  agency: Pick<Agency, 'name' | 'code'>;
};

// ===== HOOKS TYPES =====
export interface UsePreparationsOptions {
  page?: number;
  limit?: number;
  filters?: Partial<PreparationFilters>;
  enabled?: boolean;
}

export interface UsePreparationDetailOptions {
  preparationId: string;
  enabled?: boolean;
}

export interface UsePreparationStatsOptions {
  startDate?: string;
  endDate?: string;
  agencyId?: string;
  userId?: string;
  enabled?: boolean;
}

// ===== FONCTIONS UTILITAIRES =====

/**
 * Formate une durée en minutes vers un string lisible
 * CORRECTION: Gère les valeurs undefined/null de façon robuste
 */
export function formatDuration(minutes: number | undefined | null): string {
  if (minutes == null || isNaN(minutes)) {
    return 'N/A';
  }
  
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h${remainingMinutes}min` : `${hours}h`;
}

/**
 * Fonction helper pour calculer un pourcentage sécurisé
 */
export function safePercentage(value: number | undefined | null, total: number | undefined | null): number {
  if (value == null || total == null || total === 0) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

/**
 * Fonction helper pour Math.min avec valeurs undefined
 */
export function safeMin(value1: number | undefined | null, value2: number): number {
  if (value1 == null || isNaN(value1)) {
    return value2;
  }
  return Math.min(value1, value2);
}

/**
 * Fonction helper pour vérifier si un nombre est valide
 */
export function isValidNumber(value: number | undefined | null): value is number {
  return value != null && !isNaN(value) && isFinite(value);
}

/**
 * Fonction helper pour obtenir une valeur numérique sécurisée
 */
export function safeNumber(value: number | undefined | null, defaultValue: number = 0): number {
  return isValidNumber(value) ? value : defaultValue;
}

/**
 * Vérifie si une préparation est dans les temps
 */
export function isPreparationOnTime(currentDuration: number, timeLimit: number = 30): boolean {
  return currentDuration <= timeLimit;
}

/**
 * Convertit une étape backend vers une étape frontend avec label
 */
export function adaptBackendStep(
  backendStep: PreparationStep | undefined, 
  stepType: StepType
): PreparationStep {
  return {
    step: stepType,
    completed: backendStep?.completed || false,
    completedAt: backendStep?.completedAt,
    notes: backendStep?.notes,
    photos: backendStep?.photos,
    photosCount: backendStep?.photos?.length || 0
  };
}

/**
 * Trouve une définition d'étape par son type
 */
export function getStepDefinition(stepType: StepType) {
  return PREPARATION_STEP_LABELS[stepType];
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
 * Obtient le label d'un statut
 */
export function getStatusLabel(status: PreparationStatus): string {
  return PREPARATION_STATUS_LABELS[status] || status;
}

// ===== TYPE GUARDS ET HELPERS =====

/**
 * ✅ AJOUT: Vérifie si un objet est une pagination valide
 */
export function isPagination(obj: any): obj is Pagination {
  return obj && 
    typeof obj.page === 'number' && 
    typeof obj.limit === 'number' && 
    typeof obj.total === 'number' &&
    (typeof obj.totalPages === 'number' || typeof obj.pages === 'number');
}

/**
 * ✅ AJOUT: Normalise une pagination vers le format attendu
 * RÉSOUT LES PROBLÈMES: Types incompatibles pour totalPages/totalCount
 */
export function normalizePagination(pagination: PaginationInfo | Pagination | undefined): Pagination {
  if (!pagination) {
    return {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
      totalPages: 0,
      totalCount: 0,
      hasNext: false,
      hasPrev: false
    };
  }

  return {
    page: pagination.page || 1,
    limit: pagination.limit || 20,
    total: pagination.total || 0,
    pages: pagination.pages || 0,
    totalPages: (pagination as Pagination).totalPages || pagination.pages || 0,
    totalCount: (pagination as Pagination).totalCount || pagination.total || 0,
    hasNext: pagination.hasNext || false,
    hasPrev: pagination.hasPrev || false
  };
}