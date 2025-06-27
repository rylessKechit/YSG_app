// ===== @/lib/types/index.ts =====
// Types principaux de l'application

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: 'preparateur' | 'admin';
  agencies: Agency[];
  stats: UserStats;
  lastLogin?: Date;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
  address?: string;
  workingHours?: {
    start: string;
    end: string;
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  isDefault?: boolean;
  isActive: boolean;
}

export interface UserStats {
  totalPreparations: number;
  averageTime: number; // en minutes
  onTimeRate: number; // pourcentage
  lastCalculated: Date;
}

export interface Schedule {
  id: string;
  user: string;
  agency: Agency;
  date: Date;
  startTime: string; // "08:00"
  endTime: string; // "17:00"
  breakStart?: string;
  breakEnd?: string;
  workingDuration: number; // en minutes
  notes?: string;
  status: 'active' | 'cancelled' | 'completed';
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
  totalBreakMinutes?: number;
  delays: {
    startDelay: number;
    endDelay?: number;
    breakStartDelay?: number;
    breakEndDelay?: number;
  };
  alertsSent: {
    lateStart: boolean;
    lateEnd: boolean;
    longBreak: boolean;
    missingClockOut: boolean;
  };
  status: 'incomplete' | 'complete' | 'validated' | 'disputed';
  notes?: string;
  schedule?: string; // ID du planning
  summary?: TimesheetSummary;
}

export interface TimesheetSummary {
  date: string;
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
  totalWorked: string;
  totalBreak: string;
  startDelay?: string;
  status: string;
  issues: string[];
}

export interface TimesheetStatus {
  date: Date;
  agency?: Agency;
  schedule?: {
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
    workingDuration: number;
  };
  timesheet?: Timesheet;
  currentStatus: {
    isClockedIn: boolean;
    isClockedOut: boolean;
    isOnBreak: boolean;
    hasPreparationInProgress: boolean;
    currentWorkedMinutes: number;
    currentWorkedTime?: string;
  };
}

export interface Vehicle {
  licensePlate: string;
  brand: string;
  model: string;
  fullName?: string;
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
  photoPublicId?: string;
  completedAt?: Date;
  notes?: string;
  duration?: number;
}

export interface Issue {
  id?: string;
  type: 'damage' | 'missing_key' | 'fuel_problem' | 'cleanliness' | 'mechanical' | 'other';
  description: string;
  photoUrl?: string;
  photoPublicId?: string;
  reportedAt: Date;
}

export interface Preparation {
  id: string;
  vehicle: Vehicle;
  agency: Agency;
  user?: Pick<User, 'id' | 'firstName' | 'lastName'>;
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
  qualityRating?: {
    score: number;
    comment?: string;
    ratedBy?: string;
    ratedAt?: Date;
  };
  summary?: PreparationSummary;
  createdAt: Date;
}

export interface PreparationSummary {
  totalTime: string;
  completedSteps: number;
  totalSteps: number;
  onTime: boolean;
  issues: number;
  quality?: number;
}

// Types pour les formulaires
export interface LoginFormData {
  email: string;
  password: string;
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

// Types d'état de l'application
export interface AppState {
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  theme: 'light' | 'dark' | 'system';
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

export interface PaginatedResponse<T> extends ApiResponse<{
  items: T[];
  pagination: PaginationInfo;
}> {}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Types pour les stores Zustand
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
  lastSync: Date | null;
}

export interface PreparationState {
  currentPreparation: Preparation | null;
  userAgencies: Agency[];
  history: Preparation[];
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
}

// Types pour les statistiques et rapports
export interface PersonalStats {
  period: {
    startDate: Date;
    endDate: Date;
  };
  periodStats: {
    totalPreparations: number;
    averageTime: number;
    onTimeRate: number;
    minTime: number;
    maxTime: number;
    totalIssues: number;
    issueRate: number;
  };
  overallStats: UserStats;
  topVehicles: VehicleStats[];
}

export interface VehicleStats {
  licensePlate: string;
  brand: string;
  model: string;
  fullName: string;
  totalPreparations: number;
  averageTime: number;
  lastPreparation: Date;
}

export interface WeekSchedule {
  weekStart: Date;
  weekSchedule: DaySchedule[];
  weekTotals: {
    totalDays: number;
    totalMinutes: number;
    totalHours: number;
  };
}

export interface DaySchedule {
  date: Date;
  dayName: string;
  dayShort: string;
  isToday: boolean;
  schedule?: {
    id: string;
    agency: Agency;
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
    notes?: string;
    workingDuration: number;
    formatted: any;
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnedAt?: Date;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
}

// Types d'événements et navigation
export type NavigationEvent = 'dashboard' | 'timesheets' | 'preparations' | 'profile';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type ThemeMode = 'light' | 'dark' | 'system';

// Types pour les paramètres de requête
export interface QueryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  agencyId?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Types pour les filtres
export interface HistoryFilters {
  startDate: Date;
  endDate: Date;
  agencyId?: string;
  search?: string;
}

// Types pour les notifications
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  read?: boolean; // ← Ajoutez cette ligne
  actions?: NotificationAction[];
  createdAt: Date;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive';
}

// Types pour les préférences utilisateur
export interface UserPreferences {
  theme: ThemeMode;
  notifications: {
    push: boolean;
    email: boolean;
    reminders: boolean;
  };
  language: 'fr' | 'en';
  defaultAgency?: string;
}

// Types pour la géolocalisation (future feature)
export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

// Types pour le mode offline
export interface OfflineAction {
  id: string;
  type: 'clock-in' | 'clock-out' | 'start-preparation' | 'complete-step';
  data: any;
  timestamp: Date;
  retryCount: number;
}

// Types utilitaires
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Constantes pour les types
export const STEP_TYPES = [
  'exterior',
  'interior', 
  'fuel',
  'tires_fluids',
  'special_wash',
  'parking'
] as const;

export const STEP_LABELS: Record<PreparationStep['type'], string> = {
  exterior: 'Préparation extérieure',
  interior: 'Préparation intérieure', 
  fuel: 'Mise à niveau essence',
  tires_fluids: 'Pression pneus + lave-glace',
  special_wash: 'Lavage spécial',
  parking: 'Stationnement'
};

export const ISSUE_TYPES = [
  'damage',
  'missing_key',
  'fuel_problem', 
  'cleanliness',
  'mechanical',
  'other'
] as const;

export const ISSUE_LABELS: Record<Issue['type'], string> = {
  damage: 'Dommage',
  missing_key: 'Clé manquante',
  fuel_problem: 'Problème carburant',
  cleanliness: 'Propreté',
  mechanical: 'Mécanique',
  other: 'Autre'
};