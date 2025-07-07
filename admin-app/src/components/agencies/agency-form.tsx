// admin-app/src/components/agencies/agency-form.tsx - FORMULAIRE AGENCE
'use client&apos;;

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Building, MapPin, Phone, Mail, Hash, User, Loader2, CheckCircle, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from &apos;@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from &apos;@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { useCreateAgency, useUpdateAgency, useCheckAgencyCode } from '@/hooks/api/useAgencies';
import { Agency, AgencyCreateData, AgencyUpdateData } from '@/types/agency';

// Schéma de validation
const agencySchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères&apos;)
    .max(100, 'Le nom ne peut pas dépasser 100 caractères&apos;),
  code: z.string()
    .min(2, 'Le code doit contenir au moins 2 caractères&apos;)
    .max(20, 'Le code ne peut pas dépasser 20 caractères&apos;)
    .regex(/^[A-Z0-9_-]+$/, 'Le code ne peut contenir que des lettres majuscules, chiffres, _ et -&apos;),
  client: z.string().optional(),
  address: z.string().optional(),
  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, &apos;Format de téléphone invalide&apos;)
    .optional()
    .or(z.literal('')),
  email: z.string()
    .email('Format d\'email invalide&apos;)
    .optional()
    .or(z.literal('')),
});

type AgencyFormData = z.infer<typeof agencySchema>;

interface AgencyFormProps {
  agency?: Agency | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CLIENT_OPTIONS = [
  { value: &apos;SIXT', label: &apos;SIXT' },
  { value: &apos;Europcar', label: &apos;Europcar' },
  { value: &apos;Hertz', label: &apos;Hertz' },
  { value: &apos;Avis', label: &apos;Avis' },
  { value: &apos;Budget', label: &apos;Budget' },
  { value: &apos;Enterprise', label: &apos;Enterprise' },
];

export function AgencyForm({ agency, onSuccess, onCancel }: AgencyFormProps) {
  const isEditing = !!agency;
  const [codeInput, setCodeInput] = useState('');
  const [debouncedCode, setDebouncedCode] = useState('');

  // Hooks pour les mutations
  const createAgency = useCreateAgency();
  const updateAgency = useUpdateAgency();

  // Hook pour vérifier la disponibilité du code (avec debounce)
  const { data: isCodeAvailable, isLoading: isCheckingCode } = useCheckAgencyCode(
    debouncedCode,
    agency?.id
  );

  // Debounce du code pour éviter trop de requêtes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode(codeInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [codeInput]);

  // Configuration du formulaire
  const form = useForm<AgencyFormData>({
    resolver: zodResolver(agencySchema),
    defaultValues: {
      name: agency?.name || &apos;',
      code: agency?.code || &apos;',
      client: agency?.client || &apos;',
      address: agency?.address || &apos;',
      phone: agency?.phone || &apos;',
      email: agency?.email || &apos;',
    },
  });

  // Surveiller les changements du code
  const watchedCode = form.watch('code');
  useEffect(() => {
    setCodeInput(watchedCode);
  }, [watchedCode]);

  // Transformation automatique du code en majuscules
  const handleCodeChange = (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    form.setValue('code', upperValue);
    setCodeInput(upperValue);
  };

  // Soumission du formulaire
  const onSubmit = async (data: AgencyFormData) => {
    try {
      // Nettoyer les champs vides
      const cleanData = {
        ...data,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        client: data.client || undefined,
      };

      if (isEditing && agency) {
        await updateAgency.mutateAsync({
          id: agency.id,
          data: cleanData as AgencyUpdateData
        });
      } else {
        await createAgency.mutateAsync(cleanData as AgencyCreateData);
      }

      form.reset();
      onSuccess?.();
    } catch (error) {
      // Erreur gérée par les hooks
    }
  };

  // État de chargement
  const isLoading = createAgency.isPending || updateAgency.isPending;

  // Indicateur de disponibilité du code
  const getCodeStatus = () => {
    if (!debouncedCode || debouncedCode.length < 2) return null;
    if (isCheckingCode) {
      return (
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Vérification...
        </div>
      );
    }
    if (isCodeAvailable) {
      return (
        <div className="flex items-center gap-1 text-sm text-green-600">
          <CheckCircle className="h-3 w-3" />
          Code disponible
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-sm text-red-600">
        <XCircle className="h-3 w-3" />
        Code déjà utilisé
      </div>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Informations principales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informations principales
            </CardTitle>
            <CardDescription>
              Renseignez les informations essentielles de l&apos;agence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nom de l'agence */}'
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l&apos;agence *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ex: SIXT Paris Charles de Gaulle"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Code agence */}
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code agence *</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          placeholder="ex: CDG-01"
                          {...field}
                          onChange={(e) => handleCodeChange(e.target.value)}
                          className={`font-mono ${
                            debouncedCode && !isCodeAvailable && !isCheckingCode
                              ? &apos;border-red-300 focus:border-red-500'
                              : &apos;'
                          }`}`
                        />
                        {getCodeStatus()}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Code unique d&apos;identification (lettres majuscules, chiffres, _ et - autorisés)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Client */}
            <FormField
              control={form.control}
              name="client"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CLIENT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Client principal de cette agence
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Contact et localisation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Contact et localisation
            </CardTitle>
            <CardDescription>
              Informations de contact et adresse de l&apos;agence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Adresse */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse complète</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ex: Aéroport Charles de Gaulle Terminal 2E, 95700 Roissy-en-France"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Téléphone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="+33 1 23 45 67 89"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="cdg@sixt.fr"
                          type="email"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Aperçu en mode édition */}
        {isEditing && agency && (
          <Card>
            <CardHeader>
              <CardTitle>Statut actuel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge variant={agency.isActive ? "default" : "secondary"}>
                  {agency.isActive ? &apos;Active' : 'Inactive'}
                </Badge>
                <span className="text-sm text-gray-500">
                  Créée le {new Date(agency.createdAt || '').toLocaleDateString('fr-FR')}
                </span>
                {agency.updatedAt && agency.updatedAt !== agency.createdAt && (
                  <span className="text-sm text-gray-500">
                    • Modifiée le {new Date(agency.updatedAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isLoading || (!!debouncedCode && !isCodeAvailable && !isCheckingCode)}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? &apos;Modifier l\'agence' : &apos;Créer l\'agence'}
          </Button>
        </div>
      </form>
    </Form>
  );
}