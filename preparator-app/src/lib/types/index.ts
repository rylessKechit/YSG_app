// preparator-app/src/lib/types.ts
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

export interface Vehicle {
  id?: string;
  licensePlate: string;
  brand: string;
  model: string;
  color?: string;
  year?: number;
  fuelType?: 'essence' | 'diesel' | 'electrique' | 'hybride';
  condition?: 'excellent' | 'bon' | 'correct' | 'mediocre';
  status?: 'available' | 'in_preparation' | 'ready' | 'rented';
  agency?: Agency;
}

// ✅ CORRIGÉ: Utilisation de 'step' comme dans le backend
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

// ✅ CORRIGÉ: Data pour compléter une étape
export interface StepCompletionData {
  stepType: string; // Sera mappé vers 'step' dans l'API
  photo: File;
  notes?: string;
}

// ✅ Data pour commencer une préparation avec véhicule
export interface VehicleFormData {
  agencyId: string;
  licensePlate: string;
  brand: string;
  model: string;
  color?: string;
  year?: number;
  fuelType?: 'essence' | 'diesel' | 'electrique' | 'hybride';
  condition?: 'excellent' | 'bon' | 'correct' | 'mediocre';
  notes?: string;
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