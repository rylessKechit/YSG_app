// src/lib/validations/auth.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Format d\'email invalide')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Le mot de passe est requis')
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Validation pour le formulaire de création d'utilisateur (pour plus tard)
export const createUserSchema = z.object({
  email: z.string().email('Format d\'email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Format de téléphone invalide'),
  agencies: z.array(z.string()).min(1, 'Au moins une agence est requise'),
  role: z.enum(['admin', 'preparateur']),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;