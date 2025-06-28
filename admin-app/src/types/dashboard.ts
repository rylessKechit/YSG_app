export interface DashboardKPIs {
  activeUsers: {
    total: number;
    present: number;
  };
  punctuality: {
    global: number;
    byAgency: Array<{
      agencyId: string;
      agencyName: string;
      rate: number;
    }>;
  };
  preparations: {
    today: number;
    averageTime: number;
    delayed: number;
  };
  performance: {
    target: number;
    achieved: number;
    variance: number;
  };
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}