// Types principaux de l'application

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'preparateur' | 'superviseur' | 'admin';
  agencies: Agency[];
  stats?: UserStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
  address?: string;
  city?: string;
  postalCode?: string;
  isDefault?: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface UserStats {
  totalPreparations: number;
  onTimeRate: number;
  averageTime: number;
  lastCalculated: string | null;
  thisWeekPreparations: number;
  thisMonthPreparations: number;
  qualityScore: number;
}

export interface Vehicle {
  id?: string;
  licensePlate: string;
  brand: string;
  model: string;
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
  errors?: string[];
}

// Types pour les états des stores
export interface PreparationState {
  // Préparations
  currentPreparation: Preparation | null;
  preparationHistory: Preparation[] | null;
  
  // Agences utilisateur
  userAgencies: Agency[] | null;
  
  // Statistiques
  stats: any | null;
  
  // États
  isLoading: boolean;
  error: string | null;
}

// Types pour les statistiques utilisateur
export interface PerformanceMetrics {
  totalPreparations: number;
  averageTime: number;
  onTimeRate: number;
  qualityScore: number;
  weeklyStats: {
    week: string;
    preparations: number;
    averageTime: number;
  }[];
  monthlyStats: {
    month: string;
    preparations: number;
    averageTime: number;
  }[];
}

// Types pour les horaires
export interface Schedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  agency: Agency;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface WeekSchedule {
  week: string;
  schedules: Schedule[];
}

// Types pour les données du dashboard
export interface DashboardSummary {
  todayPreparations: number;
  weekPreparations: number;
  monthPreparations: number;
  averageTimeToday: number;
  onTimeRateWeek: number;
  currentStreak: number;
}

// Types pour les timesheet (import depuis timesheet.ts)
export interface TimesheetData {
  id: string;
  agency: Agency;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
  workingDuration: number;
  formatted: any;
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

// Types pour les notifications - CORRIGÉ: Définition complète
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  read?: boolean;
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

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Export des types depuis les sous-modules
export * from './timesheet';