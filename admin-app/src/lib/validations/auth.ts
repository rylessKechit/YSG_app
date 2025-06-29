import { z } from 'zod';

// Schéma de validation pour le login
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email requis')
    .email('Format d\'email invalide'),
  password: z
    .string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

// Schéma de validation pour l'inscription (si nécessaire plus tard)
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email requis')
    .email('Format d\'email invalide'),
  password: z
    .string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z
    .string()
    .min(1, 'Confirmation du mot de passe requise'),
  firstName: z
    .string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

// Schéma de validation pour la réinitialisation de mot de passe
export const resetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email requis')
    .email('Format d\'email invalide'),
});

// Schéma de validation pour le nouveau mot de passe
export const newPasswordSchema = z.object({
  password: z
    .string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z
    .string()
    .min(1, 'Confirmation du mot de passe requise'),
  token: z
    .string()
    .min(1, 'Token requis'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

// Types dérivés des schémas
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type NewPasswordFormData = z.infer<typeof newPasswordSchema>;