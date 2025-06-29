// src/types/schedule.ts
export interface Schedule {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  agency: {
    id: string;
    name: string;
    code: string;
    client?: string;
  };
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakStart?: string; // HH:mm
  breakEnd?: string; // HH:mm
  notes?: string;
  status: 'active' | 'cancelled' | 'completed';
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
  workingDuration?: number; // en minutes
  formatted?: {
    date: string;
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
    totalWorkingTime: string;
    totalMinutes: number;
  };
}

export interface ScheduleFilters {
  page?: number;
  limit?: number;
  search?: string;
  agency?: string;
  user?: string;
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
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  stats: {
    totalSchedules: number;
    activeSchedules: number;
    cancelledSchedules: number;
    completedSchedules: number;
    uniqueUsers: number;
    uniqueAgencies: number;
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

export interface CalendarDay {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  schedules: Array<{
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
  }>;
  conflicts?: any[];
}

export interface CalendarWeek {
  days: CalendarDay[];
}

export interface CalendarData {
  weeks: CalendarWeek[];
  summary: {
    totalSchedules: number;
    totalWorkingHours: number;
    averagePerDay: number;
    busiest: {
      date: string;
      count: number;
    };
  };
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'standard' | 'shifts' | 'special' | 'custom';
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
  updatedAt: string;
}

export interface ScheduleConflict {
  type: 'overlap' | 'duplicate' | 'invalid_time';
  message: string;
  scheduleId?: string;
  affectedSchedule?: Partial<Schedule>;
  severity: 'warning' | 'error';
}

export interface WeekSchedule {
  weekStart: string;
  weekSchedule: Array<{
    date: Date;
    dayName: string;
    dayShort: string;
    isToday: boolean;
    schedule: Schedule | null;
  }>;
  weekTotals: {
    totalDays: number;
    totalMinutes: number;
    totalHours: number;
  };
}