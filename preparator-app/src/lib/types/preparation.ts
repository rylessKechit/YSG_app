export type VehicleType = 'particulier' | 'utilitaire';
export type PreparationStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type StepType = 'exterior' | 'interior' | 'fuel' | 'tires_fluids' | 'special_wash' | 'parking';
export type FuelType = 'essence' | 'diesel' | 'electrique' | 'hybride';
export type VehicleCondition = 'excellent' | 'good' | 'fair' | 'poor';
export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueType = 'damage' | 'cleanliness' | 'missing_item' | 'mechanical' | 'other';

// ✅ INTERFACE VÉHICULE UNIFIÉE (correspond exactement au backend)
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

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'preparateur';
  agencies: Agency[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PreparationStep {
  step: StepType;
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

// ✅ INTERFACE PRÉPARATION UNIFIÉE
export interface Preparation {
  id: string;
  vehicle: VehicleInfo; // ✅ Toujours présent et complet
  agency: Agency;
  user: User;
  status: PreparationStatus;
  steps: PreparationStep[];
  startTime: Date;
  endTime?: Date;
  totalTime?: number;
  progress: number;
  currentDuration: number;
  isOnTime?: boolean;
  issues?: Issue[];
  notes?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'preparateur';
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

export interface StepCompletionData {
  step: StepType;
  photo: File;
  notes?: string;
}

// ===== UTILS VÉHICULE SÉCURISÉS =====

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
  const brand = vehicle.brand && vehicle.brand !== 'N/A' && vehicle.brand.trim() !== '' 
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
    licensePlate: prep.vehicleInfo?.licensePlate || 'N/A',
    brand: prep.vehicleInfo?.brand || 'N/A',
    model: prep.vehicleInfo?.model || 'Véhicule',
    vehicleType: prep.vehicleInfo?.vehicleType || 'particulier',
    year: prep.vehicleInfo?.year,
    fuelType: prep.vehicleInfo?.fuelType,
    color: prep.vehicleInfo?.color,
    condition: prep.vehicleInfo?.condition
  };

  return {
    ...prep,
    vehicle
  } as Preparation;
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

// ===== INTERFACES API =====
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

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
}

// ===== EXPORT LEGACY POUR COMPATIBILITÉ =====
export type BackendPreparation = Preparation;
export type PreparationStepData = PreparationStep & { label: string };