export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'admin' | 'preparateur';
  agencies: Agency[];
  isActive: boolean;
  stats?: {
    totalPreparations: number;
    averageTime: number;
    onTimeRate: number;
  };
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Agency {
  id: string;
  name: string;
  code: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  contact: {
    manager: string;
    phone: string;
    email: string;
  };
  isActive: boolean;
  createdAt: string;
}