// lib/types/stats.ts
// ✅ Types pour les statistiques

export interface StatsFilter {
  period: 'today' | 'week' | 'month';
  agencyId?: string;
}

export interface PerformanceStats {
  totalPreparations: number;
  averageTime: number;
  onTimeRate: number;
  completionRate: number;
  bestTime: number;
  worstTime: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface WeeklyStatPoint {
  date: string;
  count: number;
  averageTime: number;
  onTimeCount: number;
}

export interface StepStat {
  stepType: string;
  stepLabel: string;
  averageTime: number;
  completionRate: number;
  icon: string;
}

export interface VehicleTypeStats {
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
}

export interface DetailedStats extends PerformanceStats {
  weeklyStats: WeeklyStatPoint[];
  stepStats: StepStat[];
  vehicleTypeStats: VehicleTypeStats;
  trends: {
    preparationsChange: number;
    timeChange: number;
    onTimeChange: number;
  };
}