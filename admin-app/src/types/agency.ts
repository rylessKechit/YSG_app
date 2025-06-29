// admin-app/src/types/agency.ts
export interface Agency {
  id: string;
  _id?: string; // Support du format MongoDB
  name: string;
  code: string;
  client?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgencyFilters {
  page?: number;
  limit?: number;
  search?: string;
  client?: string;
  status?: 'all' | 'active' | 'inactive';
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface AgencyCreateData {
  name: string;
  code: string;
  client?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface AgencyUpdateData {
  name?: string;
  code?: string;
  client?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

export interface AgencyListData {
  agencies: Agency[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  filters?: {
    search?: string;
    client?: string;
    status?: string;
  };
  stats?: {
    totalAgencies: number;
    activeAgencies: number;
    inactiveAgencies: number;
  };
}

export interface AgencyStats {
  id: string;
  name: string;
  totalUsers: number;
  activeUsers: number;
  totalSchedules: number;
  totalPreparations: number;
  averageTime: number;
  completionRate: number;
}