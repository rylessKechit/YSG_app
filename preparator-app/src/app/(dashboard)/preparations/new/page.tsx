// app/(dashboard)/preparations/new/page.tsx
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
  AlertCircle
} from 'lucide-react';

import { usePreparationStore } from '@/lib/stores/preparation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

// Schéma de validation simplifié
const vehicleSchema = z.object({
  agencyId: z.string().min(1, 'Veuillez sélectionner une agence'),
  licensePlate: z.string()
    .min(1, 'Plaque d\'immatriculation requise')
    .regex(/^[A-Z0-9\-\s]+$/i, 'Format de plaque invalide')
    .transform(val => val.toUpperCase().replace(/\s+/g, '')),
  brand: z.string().min(1, 'Marque requise'),
  model: z.string().min(1, 'Modèle requis'),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

// Marques de véhicules
const VEHICLE_BRANDS = [
  'Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Renault', 'Peugeot', 
  'Citroën', 'Ford', 'Opel', 'Toyota', 'Honda', 'Nissan', 'Hyundai',
  'Kia', 'Seat', 'Skoda', 'Fiat', 'Alfa Romeo', 'Volvo', 'Mini',
  'Autre'
];

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

  const [customBrand, setCustomBrand] = useState<string>('');
  const [showCustomBrand, setShowCustomBrand] = useState<boolean>(false);

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      agencyId: '',
      licensePlate: '',
      brand: '',
      model: '',
    },
    mode: 'onChange'
  });

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

  // Nettoyer les erreurs
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const onSubmit = async (data: VehicleFormData): Promise<void> => {
    try {
      // Préparer les données dans le format attendu par le backend
      const vehicleData = {
        agencyId: data.agencyId,
        licensePlate: formatLicensePlate(data.licensePlate),
        brand: showCustomBrand ? customBrand.trim() : data.brand,
        model: data.model,
        color: '', // Optionnel
        year: null, // Optionnel
        fuelType: 'essence', // Valeur par défaut
        condition: 'bon', // Valeur par défaut
        notes: '' // Optionnel
      };

      console.log('📤 Démarrage préparation:', vehicleData);
      
      await startPreparation(vehicleData);
      
      toast({
        title: "✅ Préparation démarrée !",
        description: `Véhicule ${vehicleData.licensePlate} en cours de préparation`,
      });

      // Redirection vers le workflow
      router.push('/preparations');
      
    } catch (error: any) {
      console.error('❌ Erreur démarrage:', error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de démarrer la préparation",
        variant: "destructive"
      });
    }
  };

  const handleBrandChange = (value: string): void => {
    if (value === 'Autre') {
      setShowCustomBrand(true);
      setCustomBrand('');
      form.setValue('brand', '');
    } else {
      setShowCustomBrand(false);
      setCustomBrand('');
      form.setValue('brand', value);
    }
  };

  const formatLicensePlate = (value: string): string => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (cleaned.length >= 7) {
      // AA123AA -> AA-123-AA
      if (/^[A-Z]{2}\d{3}[A-Z]{2}/.test(cleaned)) {
        return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 5)}-${cleaned.substring(5, 7)}`;
      }
      // 123AA123 -> 123-AA-123  
      if (/^\d{3}[A-Z]{2}\d{3}/.test(cleaned)) {
        return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 5)}-${cleaned.substring(5, 8)}`;
      }
    }
    
    return cleaned;
  };

  const handleLicensePlateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const formatted = formatLicensePlate(e.target.value);
    form.setValue('licensePlate', formatted);
  };

  const selectedAgency = userAgencies.find(a => a.id === form.watch('agencyId'));

  // Vérifier si le formulaire est valide
  const isFormValid = form.formState.isValid && 
    form.watch('agencyId') && 
    form.watch('licensePlate') && 
    (showCustomBrand ? customBrand.trim() : form.watch('brand')) && 
    form.watch('model');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.back()}
            className="p-2 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Nouvelle Préparation</h1>
            <p className="text-sm text-gray-600">
              Remplissez les informations du véhicule
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Agence */}
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
                      <FormLabel>Sélectionner l'agence *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Choisir une agence...">
                              {field.value && selectedAgency ? (
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-medium truncate pr-2">
                                    {selectedAgency.name}
                                  </span>
                                  <span className="text-sm text-gray-500 flex-shrink-0">
                                    {selectedAgency.code}
                                  </span>
                                </div>
                              ) : (
                                "Choisir une agence..."
                              )}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userAgencies.map((agency) => (
                            <SelectItem key={agency.id} value={agency.id}>
                              <div>
                                <div className="font-medium">{agency.name}</div>
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

            {/* Véhicule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-green-600" />
                  Identification du véhicule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Plaque */}
                <FormField
                  control={form.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plaque d'immatriculation *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="AB-123-CD ou 123-AB-123"
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

                {/* Marque */}
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marque du véhicule *</FormLabel>
                      {!showCustomBrand ? (
                        <Select onValueChange={handleBrandChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Sélectionner une marque..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {VEHICLE_BRANDS.map((brand) => (
                              <SelectItem key={brand} value={brand}>
                                {brand}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="space-y-3">
                          <FormControl>
                            <Input
                              placeholder="Saisir la marque personnalisée..."
                              value={customBrand}
                              onChange={(e) => setCustomBrand(e.target.value)}
                              className="h-12"
                            />
                          </FormControl>
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setShowCustomBrand(false);
                              setCustomBrand('');
                            }}
                            className="w-full"
                          >
                            ← Retour à la liste des marques
                          </Button>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Modèle */}
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modèle du véhicule *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="A4, Clio, Golf, C3..." 
                          className="h-12"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Récapitulatif - supprimé */}

            {/* Message d'erreur */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="w-4 h-4" />
                    <p className="font-medium">Erreur</p>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Annuler
              </Button>
              
              <Button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Démarrage...
                  </>
                ) : (
                  '🚀 Démarrer la préparation'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default NewPreparationPage;