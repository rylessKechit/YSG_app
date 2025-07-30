// preparator-app/src/lib/types/preparation.ts
// ✅ Types TypeScript complets et corrigés pour les préparations

// ===== TYPES DE BASE =====

export type VehicleType = 'particulier' | 'utilitaire';
export type PreparationStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type StepType = 'exterior' | 'interior' | 'fuel' | 'special_wash';
export type FuelType = 'essence' | 'diesel' | 'electrique' | 'hybride';
export type VehicleCondition = 'excellent' | 'good' | 'fair' | 'poor';
export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueType = 'damage' | 'cleanliness' | 'missing_item' | 'mechanical' | 'other';
export type UserRole = 'admin' | 'preparateur';
export type PreparationPriority = 'low' | 'normal' | 'high' | 'urgent';

// ===== INTERFACES PRINCIPALES =====

/**
 * Interface véhicule unifiée - correspond exactement au backend
 */
export interface VehicleInfo {
  id?: string;
  licensePlate: string;
  brand: string; // ✅ Toujours présent (N/A si inconnu)
  model: string;
  vehicleType: VehicleType;
  year?: number;
  fuelType?: FuelType;
  color?: string;
  condition?: VehicleCondition;
}

/**
 * Interface agence
 */
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
}

/**
 * Interface utilisateur
 */
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  agencies: Agency[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface photo d'étape
 */
export interface StepPhoto {
  url: string;
  description: string;
  uploadedAt: Date;
}

/**
 * Interface étape de préparation
 */
export interface PreparationStep {
  step: StepType;
  completed: boolean;
  completedAt?: Date;
  duration?: number; // en minutes
  notes?: string;
  photos?: StepPhoto[];
}

/**
 * Interface étape avec données frontend (label, description, icon)
 */
export interface PreparationStepData extends PreparationStep {
  label: string;
  description: string;
  icon: string;
}

/**
 * Interface incident/problème
 */
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

/**
 * Interface préparation complète
 */
export interface Preparation {
  id: string;
  vehicle: VehicleInfo; // ✅ Toujours présent et complet
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
  priority?: PreparationPriority;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
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

/**
 * Données de formulaire pour créer un véhicule/préparation
 */
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

/**
 * Données pour compléter une étape
 */
export interface StepCompletionData {
  step: StepType;
  photo: File;
  notes?: string;
}

/**
 * Données pour signaler un incident
 */
export interface IssueReportData {
  type: IssueType;
  description: string;
  severity?: IssueSeverity;
  photo?: File;
}

/**
 * Filtres pour l'historique des préparations
 */
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

// ===== INTERFACES API =====

/**
 * Réponse API générique
 */
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

/**
 * Données d'historique des préparations
 */
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
  filters?: PreparationFilters;
}

/**
 * Statistiques des préparations
 */
export interface PreparationStats {
  totalPreparations: number;
  averageTime: number; // en minutes
  onTimeRate: number; // pourcentage
  completionRate: number; // pourcentage
  bestTime: number; // en minutes
  worstTime: number; // en minutes
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
  weeklyStats?: Array<{
    date: string;
    count: number;
    averageTime: number;
    particulier: number;
    utilitaire: number;
  }>;
  stepStats?: Array<{
    stepType: StepType;
    averageTime: number;
    completionRate: number;
  }>;
}

// ===== DÉFINITIONS DES ÉTAPES =====

/**
 * Interface définition d'étape avec métadonnées
 */
export interface StepDefinition {
  step: StepType;
  label: string;
  description: string;
  icon: string;
}

/**
 * Constantes des étapes de préparation
 */
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
  },
] as const;

// ===== CONSTANTES LABELS =====

export const VEHICLE_TYPE_LABELS = {
  particulier: 'Véhicule particulier',
  utilitaire: 'Véhicule utilitaire'
} as const;

export const VEHICLE_TYPE_ICONS = {
  particulier: '🚗',
  utilitaire: '🚐'
} as const;

export const FUEL_TYPE_LABELS = {
  essence: 'Essence',
  diesel: 'Diesel',
  electrique: 'Électrique',
  hybride: 'Hybride'
} as const;

export const VEHICLE_CONDITION_LABELS = {
  excellent: 'Excellent',
  good: 'Bon',
  fair: 'Moyen',
  poor: 'Mauvais'
} as const;

export const PREPARATION_STATUS_LABELS = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée'
} as const;

export const ISSUE_SEVERITY_LABELS = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé'
} as const;

// ===== FONCTIONS UTILITAIRES =====

/**
 * Adapte une étape backend vers le format frontend avec label
 * @param backendStep - Étape venant du backend (peut être undefined)
 * @param stepDef - Définition de l'étape (avec label, description, icon)
 * @returns Étape formatée avec toutes les infos frontend
 */
export function adaptBackendStep(
  backendStep: PreparationStep | undefined, 
  stepDef: StepDefinition
): PreparationStepData {
  return {
    step: stepDef.step,
    label: stepDef.label,
    description: stepDef.description,
    icon: stepDef.icon,
    completed: backendStep?.completed || false,
    completedAt: backendStep?.completedAt,
    duration: backendStep?.duration,
    notes: backendStep?.notes || '',
    photos: backendStep?.photos || []
  };
}

/**
 * Trouve une définition d'étape par son type
 * @param stepType - Type de l'étape
 * @returns Définition de l'étape ou undefined
 */
export function getStepDefinition(stepType: StepType): StepDefinition | undefined {
  return PREPARATION_STEPS.find(step => step.step === stepType);
}

/**
 * Adapte toutes les étapes d'une préparation backend
 * @param backendSteps - Étapes venant du backend
 * @returns Étapes formatées avec labels dans l'ordre défini
 */
export function adaptAllBackendSteps(backendSteps: PreparationStep[] = []): PreparationStepData[] {
  return PREPARATION_STEPS.map(stepDef => {
    const backendStep = backendSteps.find(step => step.step === stepDef.step);
    return adaptBackendStep(backendStep, stepDef);
  });
}

/**
 * Obtient un affichage sécurisé des informations véhicule
 * Compatible avec toutes les versions de préparation
 */
export function getSafeVehicleDisplay(vehicle: any): {
  fullName: string;
  brandDisplay: string;
  modelDisplay: string;
  hasValidData: boolean;
} {
  if (!vehicle) {
    return {
      fullName: 'Véhicule inconnu',
      brandDisplay: 'N/A',
      modelDisplay: 'Véhicule inconnu',
      hasValidData: false
    };
  }

  // ✅ Gérer brand = "N/A" ou vide
  const brand = vehicle.brand && 
                vehicle.brand !== 'N/A' && 
                vehicle.brand.trim() !== '' 
    ? vehicle.brand.trim() 
    : '';
    
  const model = vehicle.model && vehicle.model.trim() !== '' 
    ? vehicle.model.trim() 
    : 'Véhicule';

  const brandDisplay = brand || 'N/A';
  const modelDisplay = model;
  const fullName = brand ? `${brand} ${model}` : model;

  return {
    fullName,
    brandDisplay,
    modelDisplay,
    hasValidData: Boolean(vehicle.licensePlate && model !== 'Véhicule')
  };
}

/**
 * Formate la plaque d'immatriculation de manière sécurisée
 */
export function getSafeLicensePlate(licensePlate: string | undefined): string {
  if (!licensePlate || licensePlate.trim() === '') {
    return 'N/A';
  }
  return licensePlate.toUpperCase().trim();
}

/**
 * Obtient le type de véhicule avec valeur par défaut
 */
export function getSafeVehicleType(vehicleType: string | undefined): VehicleType {
  if (vehicleType === 'utilitaire') {
    return 'utilitaire';
  }
  return 'particulier';
}

/**
 * Valide si les données véhicule sont complètes
 */
export function isVehicleDataComplete(vehicle: any): boolean {
  return Boolean(
    vehicle &&
    vehicle.licensePlate &&
    vehicle.licensePlate.trim() !== '' &&
    vehicle.model &&
    vehicle.model.trim() !== '' &&
    vehicle.model !== 'Véhicule'
  );
}

/**
 * Adapte une préparation legacy vers le nouveau format
 * COMPATIBILITÉ DESCENDANTE
 */
export function adaptLegacyPreparation(prep: any): Preparation {
  // Si c'est déjà le nouveau format, retourner tel quel
  if (prep.vehicle && prep.vehicle.licensePlate) {
    return prep as Preparation;
  }

  // Adapter depuis l'ancien format vehicleInfo
  const vehicle: VehicleInfo = {
    id: prep.vehicle?.id,
    licensePlate: prep.vehicleInfo?.licensePlate || prep.vehicleData?.licensePlate || 'N/A',
    brand: prep.vehicleInfo?.brand || prep.vehicleData?.brand || 'N/A',
    model: prep.vehicleInfo?.model || prep.vehicleData?.model || 'Véhicule',
    vehicleType: prep.vehicleInfo?.vehicleType || prep.vehicleData?.vehicleType || 'particulier',
    year: prep.vehicleInfo?.year || prep.vehicleData?.year,
    fuelType: prep.vehicleInfo?.fuelType || prep.vehicleData?.fuelType,
    color: prep.vehicleInfo?.color || prep.vehicleData?.color,
    condition: prep.vehicleInfo?.condition || prep.vehicleData?.condition
  };

  return {
    ...prep,
    vehicle
  } as Preparation;
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
  if (!minutes || minutes < 0) return '0min';
  
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h${remainingMinutes.toString().padStart(2, '0')}`;
}

/**
 * Vérifie si une préparation est dans les temps
 */
export function isPreparationOnTime(currentDuration: number, timeLimit: number = 30): boolean {
  return currentDuration <= timeLimit;
}

/**
 * Obtient le label d'un statut de préparation
 */
export function getStatusLabel(status: PreparationStatus): string {
  return PREPARATION_STATUS_LABELS[status] || status;
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
 * Obtient la prochaine étape non complétée
 */
export function getNextStep(steps: PreparationStep[]): PreparationStep | null {
  return steps.find(step => !step.completed) || null;
}

/**
 * Vérifie si toutes les étapes sont complétées
 */
export function areAllStepsCompleted(steps: PreparationStep[]): boolean {
  return steps.length > 0 && steps.every(step => step.completed);
}

// ===== TYPES D'UNION POUR L'AUTOCOMPLÉTION =====

export type AllowedStepType = typeof PREPARATION_STEPS[number]['step'];
export type AllowedVehicleType = keyof typeof VEHICLE_TYPE_LABELS;
export type AllowedFuelType = keyof typeof FUEL_TYPE_LABELS;
export type AllowedCondition = keyof typeof VEHICLE_CONDITION_LABELS;
export type AllowedStatus = keyof typeof PREPARATION_STATUS_LABELS;

// ===== ALIASES POUR COMPATIBILITÉ =====

export type BackendPreparation = Preparation;
export type PreparationData = Preparation;
export type StepData = PreparationStepData;