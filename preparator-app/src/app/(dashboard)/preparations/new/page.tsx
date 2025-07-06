// preparator-app/src/app/(dashboard)/preparations/new/page.tsx
// ✅ CORRECTION: Utiliser la route d'agences qui fonctionne

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
  AlertCircle,
  Loader2
} from 'lucide-react';

import { usePreparationStore } from '@/lib/stores/preparation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';

// Interfaces TypeScript
interface Agency {
  id: string;
  name: string;
  code: string;
  client?: string;
}

// Schéma Zod
const vehicleSchema = z.object({
  agencyId: z.string().min(1, 'Veuillez sélectionner une agence'),
  licensePlate: z.string().min(1, 'Plaque d\'immatriculation requise'),
  brand: z.string().min(1, 'Marque requise'),
  model: z.string().min(1, 'Modèle requis'),
  color: z.string().optional(),
  year: z.number().nullable().optional(),
  fuelType: z.string().optional(),
  condition: z.string().optional(),
  notes: z.string().optional()
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

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
    startPreparation, 
    isLoading, 
    error, 
    clearError 
  } = usePreparationStore();

  // États locaux
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(true);
  const [customBrand, setCustomBrand] = useState<string>('');
  const [showCustomBrand, setShowCustomBrand] = useState<boolean>(false);

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      agencyId: '',
      licensePlate: '',
      brand: '',
      model: '',
      color: '',
      year: null,
      fuelType: 'essence',
      condition: 'bon',
      notes: ''
    },
    mode: 'onChange'
  });

  // ✅ CORRECTION: Charger les agences avec la route qui fonctionne
  useEffect(() => {
    const loadAgencies = async () => {
      try {
        setLoadingAgencies(true);
        
        const token = localStorage.getItem('token');
        
        // ✅ ESSAYER PLUSIEURS ROUTES POSSIBLES
        const route = '/api/preparations/user-agencies'
        
        let agenciesData = [];

        const response = await fetch(route, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log(`✅ Réponse de ${route}:`, data);
              
              if (data.success && data.data.agencies) {
                agenciesData = data.data.agencies;
                console.log(`✅ Agences chargées via ${route}:`, agenciesData.length);
              }
            } else {
              console.log(`❌ ${route} retourne ${response.status}`);
            }
        
        setAgencies(agenciesData);
          
          // Sélectionner la première agence par défaut
          form.setValue('agencyId', agenciesData[0].id, { shouldValidate: true });
        
      } catch (error) {
        console.error('❌ Erreur chargement agences:', error);
        
        // ✅ FALLBACK: Utiliser des agences par défaut si nécessaire
        const fallbackAgencies = [
          { id: '1', name: 'Agence par défaut', code: 'DEFAULT', client: 'SIXT' }
        ];
        
        setAgencies(fallbackAgencies);
        form.setValue('agencyId', fallbackAgencies[0].id, { shouldValidate: true });
        
        toast({
          title: "Attention",
          description: "Impossible de charger les agences. Agence par défaut sélectionnée.",
          variant: "destructive"
        });
      } finally {
        setLoadingAgencies(false);
      }
    };

    loadAgencies();
  }, [form, toast]);

  // Nettoyer les erreurs
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Fonction de soumission
  const onSubmit = async (data: VehicleFormData) => {
    try {
      const vehicleData = {
        agencyId: data.agencyId,
        licensePlate: formatLicensePlate(data.licensePlate),
        brand: showCustomBrand ? customBrand.trim() : data.brand,
        model: data.model,
        color: data.color || undefined,
        year: data.year || undefined,
        fuelType: data.fuelType || undefined,
        condition: data.condition || undefined,
        notes: data.notes || undefined
      };

      console.log('🚀 Démarrage préparation avec données:', vehicleData);
      
      const preparation = await startPreparation(vehicleData);
      
      toast({
        title: "✅ Préparation démarrée !",
        description: `Véhicule ${vehicleData.licensePlate} en cours de préparation`,
      });

      if (preparation?.id) {
        router.push(`/preparations/${preparation.id}`);
      } else {
        router.push('/preparations');
      }
      
    } catch (error: any) {
      console.error('❌ Erreur démarrage:', error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de démarrer la préparation",
        variant: "destructive"
      });
    }
  };

  // Fonctions utilitaires
  const handleBrandChange = (value: string) => {
    if (value === 'Autre') {
      setShowCustomBrand(true);
      setCustomBrand('');
      form.setValue('brand', '');
    } else {
      setShowCustomBrand(false);
      setCustomBrand('');
      form.setValue('brand', value, { shouldValidate: true });
    }
  };

  const formatLicensePlate = (value: string): string => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (cleaned.length >= 7) {
      if (/^[A-Z]{2}\d{3}[A-Z]{2}/.test(cleaned)) {
        return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 5)}-${cleaned.substring(5, 7)}`;
      }
      if (/^\d{3}[A-Z]{2}\d{3}/.test(cleaned)) {
        return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 5)}-${cleaned.substring(5, 8)}`;
      }
    }
    
    return cleaned;
  };

  const handleLicensePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicensePlate(e.target.value);
    form.setValue('licensePlate', formatted, { shouldValidate: true });
  };

  // Variables dérivées
  const selectedAgency = agencies.find(a => a.id === form.watch('agencyId'));
  const watchedValues = form.watch();
  
  const isFormValid = form.formState.isValid && 
    watchedValues.agencyId && 
    watchedValues.licensePlate && 
    (showCustomBrand ? customBrand.trim() : watchedValues.brand) && 
    watchedValues.model;

  // Loading state
  if (loadingAgencies) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Chargement des agences...</p>
        </div>
      </div>
    );
  }

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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                          {agencies.map((agency) => (
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
                disabled={isLoading}
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
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
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