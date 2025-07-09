// preparator-app/src/app/(dashboard)/preparations/new/page.tsx
// ✅ Page complète de création de préparation avec vehicleType

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  ArrowLeft, 
  Car, 
  Building2, 
  CheckCircle,
  AlertCircle,
  Plus,
  Loader2,
  AlertTriangle
} from 'lucide-react';

import { usePreparationStore } from '@/lib/stores/preparation';
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
  VehicleFormData, 
  VehicleType, 
  FuelType, 
  VehicleCondition,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  VEHICLE_TYPE_DESCRIPTIONS,
  VEHICLE_TYPE_ICONS
} from '@/lib/types/preparation';

// ===== SCHÉMA DE VALIDATION =====

const vehicleSchema = z.object({
  agencyId: z.string().min(1, 'Veuillez sélectionner une agence'),
  licensePlate: z.string()
    .min(1, 'Plaque d\'immatriculation requise')
    .regex(/^[A-Z0-9\-\s]+$/i, 'Format de plaque invalide')
    .transform(val => val.toUpperCase().replace(/\s+/g, '')),
  model: z.string().min(1, 'Modèle requis'),
  vehicleType: z.enum(['particulier', 'utilitaire'], {
    required_error: 'Type de véhicule requis',
    invalid_type_error: 'Type de véhicule invalide'
  }),
  color: z.string().optional(),
  year: z.number()
    .int()
    .min(1990, 'Année trop ancienne')
    .max(new Date().getFullYear() + 2, 'Année trop récente')
    .nullable()
    .optional(),
  fuelType: z.enum(['essence', 'diesel', 'electrique', 'hybride']).optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  notes: z.string().max(500, 'Notes trop longues (max 500 caractères)').optional()
}) satisfies z.ZodType<VehicleFormData>;

// ===== COMPOSANT PRINCIPAL =====

const NewPreparationPage: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  
  const { 
    userAgencies, 
    startPreparation, 
    isLoading, 
    error, 
    getUserAgencies, 
    clearError 
  } = usePreparationStore();

  // États locaux
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Formulaire
  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      agencyId: '',
      licensePlate: '',
      brand: '',
      model: '',
      vehicleType: 'particulier',
      color: '',
      year: null,
      fuelType: 'essence',
      condition: 'good',
      notes: ''
    },
    mode: 'onChange'
  });

  // ===== EFFETS =====

  // Charger les agences au montage
  useEffect(() => {
    getUserAgencies();
  }, [getUserAgencies]);

  // Sélectionner l'agence par défaut
  useEffect(() => {
    if (userAgencies.length > 0) {
      const currentAgencyId = form.getValues('agencyId');
      if (!currentAgencyId) {
        const defaultAgency = userAgencies.find(agency => agency.isDefault) || userAgencies[0];
        if (defaultAgency) {
          form.setValue('agencyId', defaultAgency.id, { shouldValidate: true });
        }
      }
    }
  }, [userAgencies, form]);

  // Nettoyer les erreurs après 5 secondes
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // ===== HANDLERS =====

  // Formater la plaque d'immatriculation
  const handleLicensePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Formatage automatique selon le pattern français
    if (value.length <= 7) {
      // Format AB-123-CD
      if (value.length > 2 && value.length <= 5) {
        value = value.slice(0, 2) + '-' + value.slice(2);
      } else if (value.length > 5) {
        value = value.slice(0, 2) + '-' + value.slice(2, 5) + '-' + value.slice(5);
      }
    } else {
      // Format 123-AB-123
      if (value.length > 3 && value.length <= 5) {
        value = value.slice(0, 3) + '-' + value.slice(3);
      } else if (value.length > 5) {
        value = value.slice(0, 3) + '-' + value.slice(3, 5) + '-' + value.slice(5);
      }
    }
    
    form.setValue('licensePlate', value, { shouldValidate: true });
  };

  // Formater la plaque finale
  const formatLicensePlate = (plate: string): string => {
    return plate.replace(/\s+/g, '').toUpperCase();
  };

  // Soumission du formulaire
  const onSubmit = async (data: VehicleFormData): Promise<void> => {
    setIsSubmitting(true);
    
    try {
      console.log('🚀 Démarrage préparation:', data);

      // Préparer les données pour le backend
      const vehicleData: VehicleFormData = {
        agencyId: data.agencyId,
        licensePlate: formatLicensePlate(data.licensePlate),
        model: data.model.trim(),
        vehicleType: data.vehicleType,
        color: data.color?.trim() || '',
        year: data.year || null,
        fuelType: data.fuelType || 'essence',
        condition: data.condition || 'good',
        notes: data.notes?.trim() || ''
      };

      await startPreparation(vehicleData);

      toast({
        title: "✅ Préparation démarrée",
        description: `Préparation du véhicule ${vehicleData.licensePlate} créée avec succès.`
      });

      // Rediriger vers la page de workflow
      router.push('/preparations');

    } catch (error: any) {
      console.error('❌ Erreur création préparation:', error);
      
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la préparation",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== RENDU =====

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-gray-900">Nouvelle préparation</h1>
              <p className="text-sm text-gray-600">Créer une préparation de véhicule</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-md mx-auto px-4 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Erreur globale */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Sélection d'agence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Agence de facturation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="agencyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agence *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Sélectionnez une agence" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userAgencies.map(agency => (
                            <SelectItem key={agency.id} value={agency.id}>
                              <div className="flex flex-col">
                                <div className="font-medium flex items-center space-x-2">
                                  <span>{agency.name}</span>
                                  {agency.isDefault && (
                                    <Badge variant="secondary" className="text-xs">
                                      Par défaut
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {agency.client} • {agency.code}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Informations véhicule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-green-600" />
                  Identification du véhicule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Plaque d'immatriculation */}
                <FormField
                  control={form.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plaque d'immatriculation *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="AB-123-CD"
                          onChange={handleLicensePlateChange}
                          className="h-12 text-center text-lg font-mono tracking-wider uppercase"
                          maxLength={10}
                        />
                      </FormControl>
                      <div className="text-xs text-gray-500 text-center">
                        Format automatique : AA-123-AA ou 123-AA-123
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Type de véhicule */}
                <FormField
                  control={form.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de véhicule *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Sélectionnez le type de véhicule" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="particulier">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">🚗</span>
                              <div>
                                <div className="font-medium">Véhicule particulier</div>
                                <div className="text-sm text-gray-500">
                                  Voiture, citadine, berline, break
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="utilitaire">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">🚐</span>
                              <div>
                                <div className="font-medium">Véhicule utilitaire</div>
                                <div className="text-sm text-gray-500">
                                  Fourgon, camionnette, van
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-gray-600 mt-1">
                        💡 Ce choix influence la tarification de la préparation
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Modèle du véhicule */}
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modèle du véhicule *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="ex: Série 3, A4, Clio..."
                          className="h-12"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Commentaires, observations particulières..."
                          className="min-h-[80px] resize-none"
                          maxLength={500}
                        />
                      </FormControl>
                      <div className="text-xs text-gray-500">
                        {field.value?.length || 0}/500 caractères
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Boutons d'action */}
            <div className="space-y-3">
              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
                size="lg"
              >
                {isSubmitting || isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Création en cours...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Démarrer la préparation</span>
                  </div>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="w-full h-12"
                disabled={isSubmitting || isLoading}
              >
                Annuler
              </Button>
            </div>

            {/* Info de validation */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <h4 className="font-medium text-blue-900 mb-1">
                      Information importante
                    </h4>
                    <p className="text-blue-700">
                      Une fois la préparation démarrée, vous serez dirigé vers l'interface 
                      de workflow pour réaliser les étapes. Le chronomètre de 30 minutes 
                      commencera automatiquement.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default NewPreparationPage;