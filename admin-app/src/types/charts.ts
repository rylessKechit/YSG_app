// admin-app/src/types/charts.ts
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
  color?: string;
}

export interface TimelineDataPoint {
  date: string;
  preparations: number;
  ponctualite: number;
  presents: number;
  retards: number;
  tempsMoyen?: number;
}

export interface AgencyPerformanceData {
  agencyId: string;
  agencyName: string;
  punctualityRate: number;
  totalPreparations: number;
  completedPreparations: number;
  averageTime: number;
  onTime?: number;
  total?: number;
}

export interface TimeDistributionData {
  range: string;
  count: number;
  percentage: number;
  min?: number;
  max?: number;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export interface TrendData {
  value: number;
  percentage: number;
  isPositive: boolean;
  label: string;
}

export type ChartColorScheme = 'default' | 'performance' | 'status' | 'timeline';

export interface ChartConfig {
  colors: string[];
  theme: 'light' | 'dark';
  showGrid: boolean;
  showLegend: boolean;
  responsive: boolean;
}

export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'composed';
export type ChartMetric = 'punctuality' | 'preparations' | 'averageTime' | 'attendance';
export type ChartPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';
export type ChartGranularity = 'hour' | 'day' | 'week' | 'month';

// Interfaces pour les réponses API
export interface ChartDataResponse {
  timeline: TimelineDataPoint[];
  punctualityByAgency: AgencyPerformanceData[];
  timeDistribution: TimeDistributionData[];
  agencyPerformance: AgencyPerformanceData[];
}

export interface ChartFilters {
  period?: ChartPeriod;
  granularity?: ChartGranularity;
  agencies?: string[];
  startDate?: string;
  endDate?: string;
  type?: 'all' | 'timeline' | 'ponctualite' | 'temps' | 'agencies';
}

// Interfaces pour les composants de graphiques
export interface BaseChartProps {
  data: any[];
  isLoading?: boolean;
  className?: string;
  height?: number;
  showTooltip?: boolean;
  showLegend?: boolean;
}

export interface LineChartProps extends BaseChartProps {
  data: TimelineDataPoint[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
}

export interface BarChartProps extends BaseChartProps {
  data: AgencyPerformanceData[];
  xKey: string;
  yKey: string;
  color?: string;
  horizontal?: boolean;
}

export interface PieChartProps extends BaseChartProps {
  data: TimeDistributionData[];
  valueKey: string;
  nameKey: string;
  colors?: string[];
}

// Interfaces pour les métriques calculées
export interface ChartStats {
  total: number;
  average: number;
  min: number;
  max: number;
  trend?: TrendData;
}

export interface AgencyStats extends ChartStats {
  best: AgencyPerformanceData;
  worst: AgencyPerformanceData;
  aboveTarget: number;
  belowTarget: number;
}

export interface TimeDistributionStats extends ChartStats {
  underThirtyMin: number;
  overSixtyMin: number;
  excellentCount: number;
  problematicCount: number;
}

// Utilitaires pour le formatage
export interface ChartFormatter {
  value: (value: number) => string;
  percentage: (value: number) => string;
  time: (minutes: number) => string;
  date: (date: string | Date, format?: 'short' | 'long') => string;
}

// Configuration des thèmes
export interface ChartTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    text: string;
    grid: string;
  };
  fonts: {
    family: string;
    size: {
      small: number;
      medium: number;
      large: number;
    };
  };
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
}

// Types pour les actions utilisateur
export type ChartAction = 'zoom' | 'filter' | 'export' | 'refresh';

export interface ChartActionEvent {
  action: ChartAction;
  data?: any;
  timestamp: Date;
}

// Interfaces pour l'export
export interface ChartExportOptions {
  format: 'png' | 'pdf' | 'svg' | 'excel';
  filename?: string;
  includeData?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

// Types pour l'animation
export interface ChartAnimation {
  enabled: boolean;
  duration: number;
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

// Interface pour la configuration complète d'un graphique
export interface FullChartConfig {
  type: ChartType;
  metric: ChartMetric;
  period: ChartPeriod;
  granularity: ChartGranularity;
  theme: ChartTheme;
  animation: ChartAnimation;
  formatter: ChartFormatter;
  filters: ChartFilters;
  exportOptions: ChartExportOptions;
}

// Types pour les événements de graphique
export interface ChartEventHandlers {
  onDataPointClick?: (data: any, event: MouseEvent) => void;
  onDataPointHover?: (data: any, event: MouseEvent) => void;
  onZoom?: (range: { start: Date; end: Date }) => void;
  onFilterChange?: (filters: ChartFilters) => void;
  onExport?: (options: ChartExportOptions) => void;
}

// Interface pour les graphiques interactifs
export interface InteractiveChartProps extends BaseChartProps {
  interactive?: boolean;
  zoomEnabled?: boolean;
  brushEnabled?: boolean;
  eventHandlers?: ChartEventHandlers;
}

// Types pour la validation des données
export interface ChartDataValidation {
  required: string[];
  types: Record<string, 'string' | 'number' | 'boolean' | 'date'>;
  ranges?: Record<string, { min?: number; max?: number }>;
}

// Interface pour les erreurs de graphique
export interface ChartError {
  code: string;
  message: string;
  field?: string;
  value?: any;
}

// Types pour le cache des données
export interface ChartCacheEntry {
  key: string;
  data: any;
  timestamp: Date;
  expiresAt: Date;
}

export interface ChartCacheOptions {
  ttl: number; // Time to live en millisecondes
  maxEntries: number;
  enabled: boolean;
}