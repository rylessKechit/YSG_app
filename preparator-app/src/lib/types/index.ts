// Types principaux de l'application
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: 'preparateur';
  agencies: Agency[];
  stats: UserStats;
  lastLogin?: Date;
}

export interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
  isDefault?: boolean;
}

export interface UserStats {
  totalPreparations: number;
  averageTime: number;
  onTimeRate: number;
  lastCalculated: Date;
}

export interface Timesheet {
  id: string;
  agency: Agency;
  date: Date;
  startTime?: Date;
  endTime?: Date;
  breakStart?: Date;
  breakEnd?: Date;
  totalWorkedMinutes?: number;
  delays: {
    startDelay: number;
    endDelay?: number;
  };
  status: 'incomplete' | 'complete';
  notes?: string;
}

export interface TimesheetStatus {
  date: Date;
  agency?: Agency;
  schedule?: {
    startTime: string;
    endTime: string;
    workingDuration: number;
  };
  timesheet?: Timesheet;
  currentStatus: {
    isClockedIn: boolean;
    isClockedOut: boolean;
    isOnBreak: boolean;
    currentWorkedMinutes: number;
    currentWorkedTime?: string;
  };
}

export interface Vehicle {
  licensePlate: string;
  brand: string;
  model: string;
  fullName: string;
  color?: string;
  year?: number;
  fuelType?: 'essence' | 'diesel' | 'electrique' | 'hybride' | 'autre';
  condition: 'excellent' | 'bon' | 'moyen' | 'mauvais';
  notes?: string;
}

export interface PreparationStep {
  type: 'exterior' | 'interior' | 'fuel' | 'tires_fluids' | 'special_wash' | 'parking';
  label: string;
  completed: boolean;
  photoUrl?: string;
  completedAt?: Date;
  notes?: string;
}

export interface Preparation {
  id: string;
  vehicle: Vehicle;
  agency: Agency;
  startTime: Date;
  endTime?: Date;
  totalMinutes?: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  steps: PreparationStep[];
  progress: number;
  currentDuration: number;
  isOnTime?: boolean;
  notes?: string;
  issues: Issue[];
}

export interface Issue {
  type: 'damage' | 'missing_key' | 'fuel_problem' | 'cleanliness' | 'mechanical' | 'other';
  description: string;
  photoUrl?: string;
  reportedAt: Date;
}

export interface VehicleFormData {
  agencyId: string;
  vehicle: {
    licensePlate: string;
    brand: string;
    model: string;
    color?: string;
    year?: number;
    fuelType?: string;
    condition?: string;
    notes?: string;
  };
  notes?: string;
}

// Types d'état de l'application
export interface AppState {
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
}

// Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Types pour les stores
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface TimesheetState {
  todayStatus: TimesheetStatus | null;
  history: Timesheet[];
  isLoading: boolean;
  error: string | null;
}

export interface PreparationState {
  currentPreparation: Preparation | null;
  userAgencies: Agency[];
  history: Preparation[];
  isLoading: boolean;
  error: string | null;
}

// Types pour les formulaires
export interface LoginFormData {
  email: string;
  password: string;
}

export interface StepCompletionData {
  stepType: string;
  photo: File;
  notes?: string;
}

export interface IssueReportData {
  type: string;
  description: string;
  photo?: File;
}

// Types d'événements
export type NavigationEvent = 'dashboard' | 'timesheets' | 'preparations' | 'profile';

// Types utilitaires
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PaginationParams {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}