// admin-app/src/types/schedule.ts - TYPES COMPLETS
export interface Schedule {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  agency: {
    id: string;
    name: string;
    code: string;
    client: string;
    address?: string;
  };
  date: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
  status: 'active' | 'cancelled' | 'completed';
  workingHours?: number;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface ScheduleFilters {
  page?: number;
  limit?: number;
  search?: string;
  user?: string;
  agency?: string;
  startDate?: string;
  endDate?: string;
  status?: 'all' | 'active' | 'cancelled' | 'completed';
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ScheduleCreateData {
  userId: string;
  agencyId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
}

export interface ScheduleUpdateData {
  userId?: string;
  agencyId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
  status?: 'active' | 'cancelled' | 'completed';
}

export interface ScheduleListData {
  schedules: Schedule[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters?: {
    search?: string;
    user?: string;
    agency?: string;
    status?: string;
  };
  stats?: {
    totalSchedules: number;
    activeSchedules: number;
    totalHours: number;
  };
}

// ✅ TYPES MANQUANTS POUR LE CALENDRIER
export interface CalendarDay {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend?: boolean;
  schedules: CalendarSchedule[];
  conflicts?: CalendarConflict[];
  stats: {
    totalSchedules: number;
    totalHours: number;
    agencies: number;
  };
}

export interface CalendarWeek {
  weekStart: string;
  weekEnd: string;
  days: CalendarDay[];
  stats: {
    totalSchedules: number;
    totalHours: number;
    workingDays: number;
  };
}

export interface CalendarSchedule {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  agency: {
    id: string;
    name: string;
    code: string;
    client?: string;
  };
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
  workingHours: number;
  status: string;
}

export interface CalendarConflict {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  scheduleIds: string[];
}

export interface CalendarMetadata {
  totalSchedules: number;
  totalWorkingHours: number;
  uniqueUsers: number;
  uniqueAgencies: number;
  averagePerDay: number;
  busiestrDay?: {
    date: string;
    count: number;
  };
  lightestDay?: {
    date: string;
    count: number;
  };
}

// ✅ TYPE PRINCIPAL POUR LES DONNÉES CALENDRIER
export interface CalendarData {
  calendar: CalendarWeek[];
  metadata: CalendarMetadata;
  period: {
    month: number;
    year: number;
    startDate: string;
    endDate: string;
    view: 'month' | 'week' | 'day';
  };
  filters: {
    agencies: string[];
    users: string[];
    includeMetadata: boolean;
    includeConflicts: boolean;
  };
}

// ✅ TYPES POUR LES STATISTIQUES
export interface ScheduleStatsData {
  totalSchedules: number;
  totalWorkingHours: number;
  averagePerUser: number;
  averagePerDay: number;
  busiestrDays: Array<{
    date: string;
    count: number;
    hours: number;
  }>;
  userStats: Array<{
    userId: string;
    userName: string;
    totalHours: number;
    totalDays: number;
    averagePerDay: number;
  }>;
  agencyStats: Array<{
    agencyId: string;
    agencyName: string;
    totalSchedules: number;
    totalHours: number;
    activeUsers: number;
  }>;
  period: {
    startDate: string;
    endDate: string;
  };
  filters: {
    agency?: string;
    user?: string;
    period?: string;
  };
}

export interface BulkCreateData {
  template: {
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
  };
  assignments: Array<{
    userId: string;
    agencyId: string;
    dates: string[];
  }>;
  options: {
    skipConflicts: boolean;
    notifyUsers: boolean;
    overwrite: boolean;
  };
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  template: {
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
  };
  isDefault: boolean;
  usageCount?: number;
  recentUsage?: number;
  defaultAgencies?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface WeekSchedule {
  userId: string;
  userName: string;
  weekStart: string;
  weekEnd: string;
  schedules: Schedule[];
  totalHours: number;
  totalDays: number;
  conflicts?: CalendarConflict[];
}