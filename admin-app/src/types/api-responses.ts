// Types spécifiques pour les réponses backend
import { User } from './auth';

// Structure exacte de réponse de votre backend pour /auth/me
export interface AuthProfileResponse {
  success: boolean;
  data: {
    user: User;
  };
  message?: string;
}

// Structure exacte de réponse de votre backend pour /auth/login
export interface AuthLoginResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
    refreshToken?: string;
  };
  message: string;
}

// Structure exacte de réponse de votre backend pour /auth/refresh
export interface AuthRefreshResponse {
  success: boolean;
  data: {
    token: string;
  };
  message: string;
}

// Structure exacte de réponse de votre backend pour /auth/verify
export interface AuthVerifyResponse {
  success: boolean;
  data: {
    valid: boolean;
    userId?: string;
    role?: string;
  };
  message: string;
}

// Type guard pour vérifier si une réponse est valide
export function isValidAuthResponse(response: any): response is AuthProfileResponse {
  return (
    response &&
    typeof response.success === 'boolean' &&
    response.data &&
    response.data.user &&
    typeof response.data.user === 'object'
  );
}

// Type guard pour vérifier si une réponse de login est valide
export function isValidLoginResponse(response: any): response is AuthLoginResponse {
  return (
    response &&
    typeof response.success === 'boolean' &&
    response.data &&
    typeof response.data.token === 'string' &&
    response.data.user &&
    typeof response.data.user === 'object'
  );
}