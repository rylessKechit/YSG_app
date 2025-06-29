// src/types/auth.ts - VERSION CORRIGÉE avec updatedAt
// src/types/auth.ts - Types pour l'authentification

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: 'admin' | 'preparateur';
  phone?: string;
  agencies: Agency[];
  stats?: UserStats;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string; // ✅ AJOUTÉ pour corriger l'erreur TypeScript
  isActive?: boolean;
}

export interface Agency {
  id: string;
  _id?: string;
  name: string;
  code: string;
  client?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface UserStats {
  totalPreparations: number;
  averageTime: number;
  onTimeRate: number;
  lastCalculated?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  isAdmin: () => boolean;
  getUserFullName: () => string;
  hasPermission: (permission: string) => boolean;
  hasAgencyAccess: (agencyId: string) => boolean;
  checkAuthConsistency: () => boolean;
}