// ========================================
// FICHIER: preparator-app/src/lib/types/preparation.ts
// ✅ CORRECTION : Ajout des exports manquants
// ========================================

// ===== TYPES EXISTANTS =====
export type PreparationStatus = 'in_progress' | 'completed' | 'cancelled';
export type StepType = 'exterior' | 'interior' | 'fuel' | 'special_wash';
export type VehicleType = 'particulier' | 'utilitaire';
export type FuelType = 'essence' | 'diesel' | 'hybrid' | 'electric';
export type VehicleCondition = 'excellent' | 'good' | 'fair' | 'poor';
export type IssueType = 'damage' | 'missing_item' | 'technical' | 'other';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

// ===== INTERFACES VÉHICULE =====
export interface VehicleInfo {
  id: string;
  licensePlate: string;
  brand: string;
  model: string;
  vehicleType: VehicleType;
  color?: string;
  year?: number;
  fuelType?: FuelType;
  condition?: VehicleCondition;
}

export interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
  isDefault?: boolean;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// ===== INTERFACES ÉTAPES =====
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
export interface PreparationHistoryData {
  preparations: Preparation[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: PreparationFilters;
}

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

// ✅ NOUVEAU : Interface pour complétion étape simplifiée (sans photo)
export interface SimpleStepCompletionData {
  step: StepType;
  notes?: string;
}

// ✅ ANCIEN : Interface pour complétion étape avec photo (conservée pour compatibilité)
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
  vehicleType?: VehicleType;
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
  byVehicleType?: {
    VP: { count: number; averageTime: number };
    VU: { count: number; averageTime: number };
  };
  thisWeek: {
    completed: number;
    averageTime: number;
    onTimeRate: number;
  };
  thisMonth: {
    completed: number;
    averageTime: number;
    onTimeRate: number;
  };
}

// ✅ NOUVEAU : Interface pour planning du jour
export interface TodayScheduleAgency {
  hasSchedule: boolean;
  defaultAgency: Agency | null;
  schedule?: {
    id: string;
    startTime: string;
    endTime: string;
    date: string;
  };
  message?: string;
}

// ===== TYPES HISTORIQUE =====
export interface PreparationHistory {
  preparations: Preparation[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: PreparationFilters;
}

// ===== INTERFACES API =====
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

// ✅ CORRECTION 1: Export de PREPARATION_STEPS (pour compatibilité)
export const PREPARATION_STEPS = [
  'exterior',
  'interior', 
  'fuel',
  'special_wash'
] as const;

// ✅ CORRECTION 2: Export des constantes pour les étapes
export const PREPARATION_STEP_DEFINITIONS = [
  {
    step: 'exterior' as StepType,
    label: 'Préparation extérieure',
    description: 'Nettoyage et contrôle de l\'extérieur du véhicule',
    icon: '🚗'
  },
  {
    step: 'interior' as StepType,
    label: 'Préparation intérieure', 
    description: 'Nettoyage et vérification de l\'intérieur',
    icon: '🪑'
  },
  {
    step: 'fuel' as StepType,
    label: 'Contrôle carburant',
    description: 'Mise à niveau de carburant',
    icon: '⛽'
  },
  {
    step: 'special_wash' as StepType,
    label: 'Nettoyage spécialisé',
    description: 'Traitements spéciaux si nécessaire',
    icon: '✨'
  }
] as const;

// ✅ CORRECTION 3: Fonctions utilitaires manquantes
export const getSafeVehicleDisplay = (vehicle: Partial<VehicleInfo>): string => {
  if (!vehicle) return 'Véhicule inconnu';
  
  const brand = vehicle.brand || '';
  const model = vehicle.model || 'Modèle inconnu';
  const licensePlate = vehicle.licensePlate || 'N/A';
  
  if (brand && model) {
    return `${brand} ${model} (${licensePlate})`;
  } else if (model) {
    return `${model} (${licensePlate})`;
  } else {
    return licensePlate;
  }
};

export const getSafeLicensePlate = (vehicle: Partial<VehicleInfo>): string => {
  return vehicle?.licensePlate || 'N/A';
};

// ✅ CORRECTION 4: Fonction d'adaptation pour compatibilité avec ancien code
export const adaptLegacyPreparation = (preparation: any): Preparation => {
  // Cette fonction adapte les anciennes structures de données
  // vers le nouveau format si nécessaire
  return {
    id: preparation.id || preparation._id,
    vehicle: {
      id: preparation.vehicle?.id || preparation.vehicle?._id || '',
      licensePlate: preparation.vehicle?.licensePlate || preparation.vehicleData?.licensePlate || 'N/A',
      brand: preparation.vehicle?.brand || preparation.vehicleData?.brand || '',
      model: preparation.vehicle?.model || preparation.vehicleData?.model || 'Véhicule',
      vehicleType: preparation.vehicle?.vehicleType || preparation.vehicleData?.vehicleType || 'particulier',
      color: preparation.vehicle?.color || preparation.vehicleData?.color,
      year: preparation.vehicle?.year || preparation.vehicleData?.year,
      fuelType: preparation.vehicle?.fuelType || preparation.vehicleData?.fuelType || 'essence',
      condition: preparation.vehicle?.condition || preparation.vehicleData?.condition || 'good'
    },
    agency: preparation.agency || {
      id: preparation.agencyId || '',
      name: 'Agence inconnue',
      code: 'N/A',
      client: 'N/A'
    },
    user: preparation.user || {
      id: preparation.userId || '',
      firstName: 'Préparateur',
      lastName: '',
      email: ''
    },
    status: preparation.status || 'in_progress',
    steps: preparation.steps || [],
    startTime: new Date(preparation.startTime),
    endTime: preparation.endTime ? new Date(preparation.endTime) : undefined,
    totalTime: preparation.totalTime,
    progress: preparation.progress || 0,
    currentDuration: preparation.currentDuration || 0,
    isOnTime: preparation.isOnTime,
    issues: preparation.issues || [],
    notes: preparation.notes || '',
    qualityCheck: preparation.qualityCheck,
    createdAt: new Date(preparation.createdAt || Date.now()),
    updatedAt: new Date(preparation.updatedAt || Date.now())
  };
};

// Alias pour compatibilité avec l'ancien code
export type BackendPreparation = Preparation;