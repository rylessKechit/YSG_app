// preparator-app/src/lib/types/index.ts
// ✅ Types harmonisés avec le backend

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'preparateur' | 'admin';
  agencies: Agency[];
  stats?: UserStats;
}

export interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
  isDefault?: boolean;
  workingHours?: {
    start: string;
    end: string;
  };
  isActive?: boolean;
}

// ✅ Interface simplifiée pour le véhicule (suppression color, condition)
export interface Vehicle {
  id?: string;
  licensePlate: string;
  brand: string;
  model: string;
  status?: 'available' | 'in_preparation' | 'ready' | 'rented';
  agency?: Agency;
}

// ✅ Étapes de préparation - harmonisées avec le backend
export interface PreparationStep {
  step: string; // ✅ 'step' au lieu de 'type'
  completed: boolean;
  photoUrl?: string;
  completedAt?: Date;
  notes?: string;
  photos?: Array<{
    url: string;
    description: string;
    uploadedAt: Date;
  }>;
}

export interface Preparation {
  id: string;
  vehicle: Vehicle;
  agency: Agency;
  user?: User;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  steps: PreparationStep[];
  progress: number;
  currentDuration: number;
  totalTime?: number;
  isOnTime?: boolean;
  notes?: string;
  issues?: Issue[];
  qualityCheck?: {
    passed: boolean;
    checkedBy?: string;
    checkedAt?: Date;
    notes?: string;
  };
}

export interface Issue {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  reportedAt: Date;
  photos?: string[];
  resolved: boolean;
}

// ✅ Data pour compléter une étape
export interface StepCompletionData {
  step: string; // Sera mappé vers 'step' dans l'API
  photo: File;
  notes?: string;
}

// ✅ Data pour commencer une préparation avec véhicule (SIMPLIFIÉ)
export interface VehicleFormData {
  agencyId: string;
  licensePlate: string;
  brand: string;
  model: string;
}

// ✅ Data pour signaler un incident
export interface IssueReportData {
  type: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  photo?: File;
}

// ✅ Statistiques utilisateur
export interface UserStats {
  totalPreparations: number;
  averageTime: number;
  completionRate: number;
  onTimeRate: number;
  issuesReported: number;
}

// ✅ Statut pointage
export interface TimesheetStatus {
  isWorking: boolean;
  isOnBreak: boolean;
  currentAgency?: Agency;
  startTime?: Date;
  breakStart?: Date;
  totalWorkedToday: number;
  totalBreakToday: number;
}

// ✅ Définition des étapes harmonisée
export interface StepDefinition {
  step: string; // ✅ Utilise 'step' comme le backend
  label: string;
  description: string;
  icon: string;
}

// ✅ Constantes des étapes
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

// ✅ Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ✅ Types pour les formulaires
export interface LoginFormData {
  email: string;
  password: string;
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
}

// ✅ Types pour les filtres et recherches
export interface PreparationFilters {
  startDate?: Date;
  endDate?: Date;
  agencyId?: string;
  search?: string;
  status?: Preparation['status'];
}

export interface TimesheetFilters {
  startDate?: Date;
  endDate?: Date;
  agencyId?: string;
}

// ✅ Enums pour les constantes
export enum PreparationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum UserRole {
  ADMIN = 'admin',
  PREPARATEUR = 'preparateur'
}

export enum IssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

// ✅ Types pour les hooks et stores
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

// ✅ Types pour les statistiques
export interface PreparationStats {
  totalPreparations: number;
  averageTime: number;
  onTimeRate: number;
  completionRate: number;
  bestTime: number;
  worstTime: number;
  weeklyStats: {
    date: string;
    count: number;
    averageTime: number;
  }[];
  stepStats: {
    stepType: string;
    averageTime: number;
    completionRate: number;
  }[];
}

// ✅ Types pour l'historique
export interface PreparationHistory {
  preparations: Preparation[];
  filters: {
    startDate: Date;
    endDate: Date;
    agencyId?: string;
    search?: string;
  };
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}