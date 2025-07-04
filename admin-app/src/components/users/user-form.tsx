// src/components/users/user-form.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ArrowLeft, Save, User, Mail, Phone, Building, Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';

import { useCreateUser, useUpdateUser, useUser, useCheckEmail } from '@/hooks/api/useUsers';
import { useAgencies } from '@/hooks/api/useAgencies';
import { User as UserType } from '@/types/auth';

// Schéma de validation - CORRIGÉ téléphone obligatoire
const userFormSchema = z.object({
  email: z.string().email('Format email invalide').min(1, 'Email requis'),
  password: z.string().min(6, 'Minimum 6 caractères').optional(),
  firstName: z.string().min(2, 'Minimum 2 caractères').max(50, 'Maximum 50 caractères'),
  lastName: z.string().min(2, 'Minimum 2 caractères').max(50, 'Maximum 50 caractères'),
  phone: z.string()
    .min(1, 'Téléphone requis')
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Format téléphone invalide'),
  role: z.enum(['admin', 'preparateur']),
  agencies: z.array(z.string()).optional(), // Plus obligatoire
  isActive: z.boolean().default(true)
}).refine((data) => {
  // Les agences ne sont obligatoires que pour les préparateurs
  if (data.role === 'preparateur' && (!data.agencies || data.agencies.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Au moins une agence est requise pour les préparateurs",
  path: ["agencies"]
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  userId?: string; // Si fourni, mode édition
  onSuccess?: (user: UserType) => void;
  onCancel?: () => void;
  hideHeader?: boolean; // ✅ AJOUTÉ pour masquer le header
}

export function UserForm({ userId, onSuccess, onCancel, hideHeader = false }: UserFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailValidated, setEmailValidated] = useState(false);
  const [lastValidatedEmail, setLastValidatedEmail] = useState(''); // ✅ AJOUTÉ pour tracker le dernier email validé

  const isEditMode = !!userId;

  // Hooks API
  const { data: existingUser, isLoading: isLoadingUser } = useUser(userId || '', isEditMode);
  const { data: agenciesData, isLoading: isLoadingAgencies } = useAgencies();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const checkEmail = useCheckEmail();

  // Form setup
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '', // ✅ CORRECTION: String vide au lieu d'undefined
      role: 'preparateur',
      agencies: [],
      isActive: true
    }
  });

  const { handleSubmit, formState: { errors, isSubmitting }, watch, setValue, reset } = form;

  // Charger les données utilisateur pour l'édition
  useEffect(() => {
    if (isEditMode && existingUser) {
      reset({
        email: existingUser.email,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        phone: existingUser.phone || '',
        role: existingUser.role,
        agencies: existingUser.agencies?.map(agency => agency.id) || [],
        isActive: existingUser.isActive ?? true
      });
      
      // ✅ CORRECTION: Marquer l'email existant comme déjà validé
      if (existingUser.email) {
        setEmailValidated(true);
        setLastValidatedEmail(existingUser.email);
      }
    }
  }, [existingUser, isEditMode, reset]);

  // ✅ CORRECTION FINALE: Vérification email ultra-optimisée
  const watchedEmail = watch('email');
  const watchedRole = watch('role');
  
  useEffect(() => {
    // ✅ STOP TOTAL si l'email est déjà validé ET identique au dernier validé
    if (emailValidated && watchedEmail === lastValidatedEmail) {
      console.log('🛑 Email déjà validé, pas de nouvelle vérification');
      return;
    }

    // Ne vérifier que si l'email a réellement changé
    const shouldCheck = watchedEmail && 
      watchedEmail !== existingUser?.email && 
      watchedEmail !== lastValidatedEmail;

    if (!shouldCheck) return;

    console.log('🔍 Vérification email:', watchedEmail);

    const timeoutId = setTimeout(async () => {
      setIsCheckingEmail(true);
      setEmailValidated(false); // Reset pendant la vérification
      
      try {
        const result = await checkEmail.mutateAsync({
          email: watchedEmail,
          excludeUserId: userId
        });
        
        // Si l'email est disponible, marquer comme validé
        if (result.data.available) {
          setEmailValidated(true);
          setLastValidatedEmail(watchedEmail); // ✅ SAUVEGARDER l'email validé
          console.log('✅ Email validé et sauvegardé:', watchedEmail);
        }
      } catch (error) {
        console.log('❌ Email invalide:', watchedEmail);
        setEmailValidated(false);
        setLastValidatedEmail(''); // Reset si erreur
      }
      setIsCheckingEmail(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedEmail, existingUser?.email, userId, checkEmail, emailValidated, lastValidatedEmail]);

  // Reset complet si l'utilisateur change d'email
  useEffect(() => {
    if (watchedEmail !== lastValidatedEmail && watchedEmail !== existingUser?.email) {
      setEmailValidated(false);
    }
  }, [watchedEmail, lastValidatedEmail, existingUser?.email]);

  // Soumission du formulaire
  const onSubmit = useCallback(async (data: UserFormData) => {
    try {
      if (isEditMode) {
        // Mode édition
        const updateData = {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          agencies: data.role === 'admin' ? [] : (data.agencies || []), // ✅ CORRECTION
          role: data.role,
          isActive: data.isActive
        };

        const result = await updateUser.mutateAsync({
          id: userId!,
          userData: updateData
        });

        toast({
          title: 'Succès',
          description: 'Utilisateur modifié avec succès',
          variant: 'default'
        });

        onSuccess?.(result.data.user);
      } else {
        // Mode création
        const createData = {
          ...data,
          password: data.password!,
          // ✅ CORRECTION: Envoyer un tableau vide pour les admins
          agencies: data.role === 'admin' ? [] : (data.agencies || [])
        };

        const result = await createUser.mutateAsync(createData);

        toast({
          title: 'Succès',
          description: 'Utilisateur créé avec succès',
          variant: 'default'
        });

        onSuccess?.(result.data.user);
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Une erreur est survenue',
        variant: 'destructive'
      });
    }
  }, [isEditMode, userId, updateUser, createUser, onSuccess, toast]);

  // Navigation
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/users');
    }
  }, [onCancel, router]);

  // Loading states
  if (isEditMode && isLoadingUser) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const agencies = agenciesData?.agencies || [];

  return (
    <div className="space-y-6">
      {/* Header - Conditionnel */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <User className="h-8 w-8" />
                {isEditMode ? 'Modifier l\'utilisateur' : 'Nouveau préparateur'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isEditMode 
                  ? 'Modifiez les informations de l\'utilisateur'
                  : 'Créez un nouveau compte préparateur ou administrateur'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire */}
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informations personnelles */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informations personnelles
                  </CardTitle>
                  <CardDescription>
                    Informations de base de l'utilisateur
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Prénom */}
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom</FormLabel>
                          <FormControl>
                            <Input placeholder="Jean" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Nom */}
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom</FormLabel>
                          <FormControl>
                            <Input placeholder="Dupont" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input 
                              placeholder="jean.dupont@sixt.fr" 
                              className="pl-10"
                              disabled={isEditMode}
                              {...field} 
                            />
                            {isCheckingEmail && (
                              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Téléphone - OBLIGATOIRE */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input 
                              placeholder="+33123456789" 
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Format international recommandé (ex: +33123456789)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Mot de passe - Seulement en création */}
                  {!isEditMode && (
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mot de passe</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Minimum 6 caractères"
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Le mot de passe doit contenir au moins 6 caractères
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Configuration et permissions */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Configuration
                  </CardTitle>
                  <CardDescription>
                    Rôle, agences et permissions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Rôle */}
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rôle</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un rôle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="preparateur">Préparateur</SelectItem>
                            <SelectItem value="admin">Administrateur</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {watchedRole === 'admin' 
                            ? 'Les administrateurs ont accès à toutes les fonctionnalités'
                            : 'Les préparateurs ont accès aux fonctions de préparation uniquement'
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Agences - CORRECTION: Optionnel pour les admins */}
                  <FormField
                    control={form.control}
                    name="agencies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Agences {watchedRole === 'preparateur' && <span className="text-red-500">*</span>}
                        </FormLabel>
                        <FormDescription>
                          {watchedRole === 'admin' 
                            ? 'Les administrateurs ont accès à toutes les agences par défaut'
                            : 'Sélectionnez les agences assignées au préparateur'
                          }
                        </FormDescription>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {isLoadingAgencies ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : agencies.length === 0 ? (
                            <p className="text-sm text-gray-500">Aucune agence disponible</p>
                          ) : (
                            agencies.map((agency: any) => (
                              <div key={agency.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={agency.id}
                                  checked={field.value?.includes(agency.id) || false}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, agency.id]);
                                    } else {
                                      field.onChange(currentValue.filter(id => id !== agency.id));
                                    }
                                  }}
                                  disabled={watchedRole === 'admin'} // ✅ Désactivé pour les admins
                                />
                                <Label
                                  htmlFor={agency.id}
                                  className={`text-sm font-normal cursor-pointer ${
                                    watchedRole === 'admin' ? 'text-gray-400' : ''
                                  }`}
                                >
                                  {agency.name}
                                  {agency.code && (
                                    <span className="text-gray-500 ml-1">({agency.code})</span>
                                  )}
                                </Label>
                              </div>
                            ))
                          )}
                          
                          {watchedRole === 'admin' && (
                            <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                              ℹ️ En tant qu'administrateur, vous avez automatiquement accès à toutes les agences
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Statut actif */}
                  {isEditMode && (
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Compte actif</FormLabel>
                            <FormDescription>
                              Décochez pour désactiver temporairement le compte
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEditMode ? 'Enregistrer' : 'Créer l\'utilisateur'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}