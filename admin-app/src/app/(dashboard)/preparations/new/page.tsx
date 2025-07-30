'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  ArrowLeft, 
  Car, 
  Building2, 
  User as UserIcon,
  CheckCircle,
  AlertCircle,
  Plus,
  Loader2,
  Save,
  Trash2,
  Copy,
  CheckSquare,
  Square
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Types
import type { 
  Preparation,
  PreparationStatus,
  Agency
} from '@/types/preparation';

import type { User } from '@/types/auth';

// API
import { apiClient } from '@/lib/api/client';

// ===== SCHÉMA DE VALIDATION SIMPLIFIÉ =====

const vehicleDataSchema = z.object({
  licensePlate: z.string()
    .min(1, 'Plaque d\'immatriculation requise')
    .regex(/^[A-Z0-9\-\s]+$/i, 'Format de plaque invalide')
    .transform(val => val.toUpperCase().replace(/\s+/g, '')),
  
  vehicleType: z.enum(['particulier', 'utilitaire'] as const, {
    required_error: 'Type de véhicule requis'
  }),
  
  model: z.string()
    .min(1, 'Modèle requis')
    .max(50, 'Modèle trop long'),
  
  // ✅ NOUVEAU : Étapes déjà complétées
  completedSteps: z.array(z.enum([
    'exterior', 'interior', 'fuel', 'tires_fluids', 'special_wash', 'parking'
  ] as const)).default([])
});

const newPreparationSchema = z.object({
  userId: z.string().min(1, 'Veuillez sélectionner un préparateur'),
  agencyId: z.string().min(1, 'Veuillez sélectionner une agence'),
  
  // ✅ NOUVEAU : Array de véhicules
  vehicles: z.array(vehicleDataSchema)
    .min(1, 'Au moins un véhicule requis')
    .max(10, 'Maximum 10 véhicules par lot'),
  
  notes: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent'] as const)
    .default('normal')
});

type NewPreparationForm = z.infer<typeof newPreparationSchema>;

// ===== COMPOSANT PRINCIPAL =====

export default function NewPreparationPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // États
  const [users, setUsers] = useState<User[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulaire avec tableau de véhicules
  const form = useForm<NewPreparationForm>({
    resolver: zodResolver(newPreparationSchema),
    defaultValues: {
      userId: '',
      agencyId: '',
      vehicles: [
        {
          licensePlate: '',
          vehicleType: 'particulier',
          model: '',
          completedSteps: [] // ✅ NOUVEAU
        }
      ],
      notes: '',
      priority: 'normal'
    }
  });

  // Gestion du tableau de véhicules
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'vehicles'
  });

  // ===== CHARGEMENT DES DONNÉES =====

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [usersResponse, agenciesResponse] = await Promise.all([
          apiClient.get('/admin/users?role=preparateur&status=active'),
          apiClient.get('/admin/agencies?status=active')
        ]);

        if (usersResponse.data.success) {
          setUsers(usersResponse.data.data.users || []);
        }

        if (agenciesResponse.data.success) {
          setAgencies(agenciesResponse.data.data.agencies || []);
        }

      } catch (error: any) {
        console.error('❌ Erreur chargement données:', error);
        const errorMessage = error.response?.data?.message || 'Erreur lors du chargement des données';
        setError(errorMessage);
        toast({
          title: "Erreur",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  // ===== GESTION DE LA SOUMISSION =====

  const onSubmit = async (data: NewPreparationForm) => {
    try {
      setIsSubmitting(true);

      console.log('🚀 Création de', data.vehicles.length, 'préparations:', data);

      const response = await apiClient.post('/admin/preparations/bulk', data);

      if (response.data.success) {
        const createdCount = response.data.data.createdPreparations?.length || data.vehicles.length;
        
        toast({
          title: "✅ Succès",
          description: `${createdCount} préparation(s) créée(s) avec succès`,
        });

        router.push('/preparations');
      } else {
        throw new Error(response.data.message || 'Erreur lors de la création');
      }

    } catch (error: any) {
      console.error('❌ Erreur soumission:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la création des préparations';
      
      toast({
        title: "❌ Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ CORRECTION : Définir les types littéraux pour TypeScript
  type StepType = 'exterior' | 'interior' | 'fuel' | 'tires_fluids' | 'special_wash' | 'parking';

  // ✅ NOUVEAU : Étapes disponibles avec typage strict
  const availableSteps: Array<{
    value: StepType;
    label: string;
    icon: string;
    description: string;
  }> = [
    { value: 'exterior', label: 'Extérieur', icon: '🚗', description: 'Nettoyage carrosserie, vitres, jantes' },
    { value: 'interior', label: 'Intérieur', icon: '🧽', description: 'Aspirateur, nettoyage surfaces' },
    { value: 'fuel', label: 'Carburant', icon: '⛽', description: 'Vérification niveau carburant' },
    { value: 'special_wash', label: 'Lavage Spécial', icon: '✨', description: 'Traitement anti-bactérien' },
  ];

  // ✅ CORRECTION : Toggle d'étape avec typage strict
  const toggleStep = (vehicleIndex: number, stepValue: StepType) => {
    const currentSteps = (form.getValues(`vehicles.${vehicleIndex}.completedSteps`) || []) as StepType[];
    const newSteps: StepType[] = currentSteps.includes(stepValue)
      ? currentSteps.filter(step => step !== stepValue)
      : [...currentSteps, stepValue];
    
    form.setValue(`vehicles.${vehicleIndex}.completedSteps`, newSteps);
  };

  // ✅ CORRECTION : Sélectionner/désélectionner toutes les étapes avec typage
  const toggleAllSteps = (vehicleIndex: number, selectAll: boolean) => {
    const newSteps: StepType[] = selectAll ? availableSteps.map(step => step.value) : [];
    form.setValue(`vehicles.${vehicleIndex}.completedSteps`, newSteps);
  };

  const addVehicle = () => {
    append({
      licensePlate: '',
      vehicleType: 'particulier',
      model: '',
      completedSteps: [] // ✅ NOUVEAU
    });
  };

  const duplicateVehicle = (index: number) => {
    const vehicle = form.getValues(`vehicles.${index}`);
    append({
      ...vehicle,
      licensePlate: '', // Reset plaque pour éviter les doublons
      completedSteps: vehicle.completedSteps || [] // ✅ Garder les étapes
    });
  };

  const removeVehicle = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // ===== HANDLERS NAVIGATION =====

  const handleBack = () => {
    router.push('/preparations');
  };

  const handleCancel = () => {
    if (form.formState.isDirty) {
      if (confirm('Êtes-vous sûr de vouloir annuler ? Les modifications non sauvegardées seront perdues.')) {
        handleBack();
      }
    } else {
      handleBack();
    }
  };

  // ===== RENDU LOADING =====

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  // ===== RENDU ERREUR =====

  if (error && users.length === 0 && agencies.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">
            Erreur de chargement
          </h2>
          <p className="text-gray-600">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <Button onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===== RENDU PRINCIPAL =====

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Nouvelles Préparations
            </h1>
            <p className="text-gray-600 mt-1">
              Créer une ou plusieurs préparations de véhicules
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          {fields.length} véhicule{fields.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Alerte d'avertissement si pas de données */}
      {(users.length === 0 || agencies.length === 0) && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {users.length === 0 && agencies.length === 0
              ? 'Aucun préparateur ni agence disponible. Veuillez en créer avant de continuer.'
              : users.length === 0
              ? 'Aucun préparateur disponible. Veuillez en créer un avant de continuer.'
              : 'Aucune agence disponible. Veuillez en créer une avant de continuer.'
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Formulaire */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Section Assignation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Assignation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Préparateur */}
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Préparateur *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={users.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              users.length === 0 
                                ? "Aucun préparateur disponible" 
                                : "Sélectionner un préparateur"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center gap-2">
                                <span>{user.firstName} {user.lastName}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {user.email}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Agence */}
                <FormField
                  control={form.control}
                  name="agencyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agence *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={agencies.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              agencies.length === 0 
                                ? "Aucune agence disponible" 
                                : "Sélectionner une agence"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {agencies.map((agency) => (
                            <SelectItem key={agency.id} value={agency.id}>
                              <div className="flex items-center gap-2">
                                <span>{agency.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {agency.code}
                                </Badge>
                                {agency.client && (
                                  <Badge variant="secondary" className="text-xs">
                                    {agency.client}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            </CardContent>
          </Card>

          {/* Section Véhicules */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Véhicules ({fields.length})
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVehicle}
                  disabled={fields.length >= 10}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un véhicule
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-gray-50">
                  
                  {/* En-tête véhicule */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">
                      Véhicule #{index + 1}
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateVehicle(index)}
                        title="Dupliquer ce véhicule"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVehicle(index)}
                          className="text-red-600 hover:text-red-700"
                          title="Supprimer ce véhicule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Champs véhicule - 3 colonnes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Plaque d'immatriculation */}
                    <FormField
                      control={form.control}
                      name={`vehicles.${index}.licensePlate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plaque d'immatriculation *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="AA-123-BB" 
                              {...field}
                              className="uppercase"
                              maxLength={20}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Type de véhicule */}
                    <FormField
                      control={form.control}
                      name={`vehicles.${index}.vehicleType`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type de véhicule *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choisir le type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="particulier">
                                <div className="flex items-center gap-2">
                                  <span>🚗</span>
                                  <span>Particulier</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="utilitaire">
                                <div className="flex items-center gap-2">
                                  <span>🚐</span>
                                  <span>Utilitaire</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Modèle */}
                    <FormField
                      control={form.control}
                      name={`vehicles.${index}.model`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modèle *</FormLabel>
                          <FormControl>
                            <Input placeholder="Clio, Partner, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>

                  {/* ✅ NOUVEAU : Section Étapes Complétées */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Étapes déjà effectuées</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAllSteps(index, true)}
                          className="text-xs h-7 px-2"
                        >
                          Tout sélectionner
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAllSteps(index, false)}
                          className="text-xs h-7 px-2"
                        >
                          Tout désélectionner
                        </Button>
                      </div>
                    </div>

                    {/* Grille des étapes */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {availableSteps.map((step) => {
                        const completedSteps = form.watch(`vehicles.${index}.completedSteps`) as StepType[] || [];
                        const isCompleted = completedSteps.includes(step.value);
                        
                        return (
                          <div
                            key={step.value}
                            className={`
                              relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                              ${isCompleted 
                                ? 'border-green-500 bg-green-50 text-green-800' 
                                : 'border-gray-200 bg-white hover:border-gray-300'
                              }
                            `}
                            onClick={() => toggleStep(index, step.value)}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 mt-0.5">
                                {isCompleted ? (
                                  <CheckSquare className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Square className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-sm">{step.icon}</span>
                                  <span className="text-sm font-medium truncate">
                                    {step.label}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 leading-tight">
                                  {step.description}
                                </p>
                              </div>
                            </div>
                            
                            {/* Badge de statut */}
                            {isCompleted && (
                              <div className="absolute top-1 right-1">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Résumé des étapes sélectionnées */}
                    <div className="text-xs text-gray-600 mt-2">
                      {(() => {
                        const completedSteps = form.watch(`vehicles.${index}.completedSteps`) as StepType[] || [];
                        const completedCount = completedSteps.length;
                        const totalSteps = availableSteps.length;
                        const percentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
                        
                        return (
                          <div className="flex items-center justify-between">
                            <span>
                              {completedCount}/{totalSteps} étapes sélectionnées
                            </span>
                            <Badge 
                              variant={percentage === 100 ? "default" : percentage > 0 ? "secondary" : "outline"}
                              className="h-5 text-xs"
                            >
                              {percentage}%
                            </Badge>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                </div>
              ))}

              {/* Limite atteinte */}
              {fields.length >= 10 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Limite de 10 véhicules par lot atteinte. Créez un nouveau lot pour ajouter plus de véhicules.
                  </AlertDescription>
                </Alert>
              )}

            </CardContent>
          </Card>

          {/* Section Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Priorité */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priorité</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir la priorité" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">
                            <Badge variant="secondary" className="text-xs">
                              Faible
                            </Badge>
                          </SelectItem>
                          <SelectItem value="normal">
                            <Badge variant="outline" className="text-xs">
                              Normale
                            </Badge>
                          </SelectItem>
                          <SelectItem value="high">
                            <Badge variant="default" className="text-xs bg-orange-500">
                              Élevée
                            </Badge>
                          </SelectItem>
                          <SelectItem value="urgent">
                            <Badge variant="destructive" className="text-xs">
                              Urgente
                            </Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes supplémentaires</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Instructions spéciales, remarques communes aux véhicules..."
                        className="min-h-[100px]"
                        maxLength={1000}
                        {...field}
                      />
                    </FormControl>
                    <div className="text-xs text-gray-500 text-right">
                      {field.value?.length || 0}/1000 caractères
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  * Champs obligatoires
                </div>
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || users.length === 0 || agencies.length === 0}
                    className="min-w-[120px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Création...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Créer {fields.length > 1 ? `${fields.length} préparations` : 'la préparation'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

        </form>
      </Form>
    </div>
  );
}