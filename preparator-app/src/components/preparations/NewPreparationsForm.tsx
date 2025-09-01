'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Calendar, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api/client';
import type { VehicleFormData } from '@/lib/types';

interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
}

interface TodayScheduleResponse {
  hasSchedule: boolean;
  defaultAgency: Agency | null;
  schedule?: {
    id: string;
    startTime: string;
    endTime: string;
    date: string;
  };
  message?: string;
}

export function NewPreparationForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<TodayScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<VehicleFormData>({
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
  });

  // ✅ NOUVEAU : Charger le planning du jour et les agences
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoadingSchedule(true);
        
        // Charger en parallèle le planning du jour et les agences
        const [scheduleResponse, agenciesResponse] = await Promise.all([
          apiClient.get<{ success: boolean; data: TodayScheduleResponse }>('/preparations/today-schedule-agency'),
          apiClient.get<{ success: boolean; data: { agencies: Agency[] } }>('/preparations/user-agencies')
        ]);

        // Traitement des agences
        if (agenciesResponse.data.success) {
          setAgencies(agenciesResponse.data.data.agencies);
        }

        // ✅ Traitement du planning du jour
        if (scheduleResponse.data.success) {
          const scheduleData = scheduleResponse.data.data;
          setTodaySchedule(scheduleData);

          // ✅ Auto-sélection de l'agence si planning disponible
          if (scheduleData.hasSchedule && scheduleData.defaultAgency) {
            setFormData(prev => ({
              ...prev,
              agencyId: scheduleData.defaultAgency!.id
            }));
            
            console.log('✅ Agence auto-sélectionnée:', scheduleData.defaultAgency.name);
          }
        }

      } catch (error) {
        console.error('❌ Erreur chargement données initiales:', error);
        setError('Erreur lors du chargement des données');
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    loadInitialData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{
        success: boolean;
        data: { preparation: any };
      }>('/preparations/start', formData);

      if (response.data.success) {
        // Rediriger vers le workflow de préparation
        router.push(`/preparations/${response.data.data.preparation.id}`);
      }
    } catch (error: any) {
      console.error('❌ Erreur création préparation:', error);
      setError(error.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof VehicleFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Loading initial
  if (isLoadingSchedule) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Nouvelle Préparation</span>
          {todaySchedule?.hasSchedule && (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <Calendar className="h-3 w-3 mr-1" />
              Planning actif
            </Badge>
          )}
        </CardTitle>

        {/* ✅ NOUVEAU : Affichage info planning du jour */}
        {todaySchedule?.hasSchedule && todaySchedule.defaultAgency && (
          <Alert className="border-green-200 bg-green-50">
            <MapPin className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Agence du planning :</strong> {todaySchedule.defaultAgency.name} ({todaySchedule.defaultAgency.code})
              <br />
              <span className="text-sm text-green-700">
                Horaires : {todaySchedule.schedule?.startTime} - {todaySchedule.schedule?.endTime}
                {' • '}Vous pouvez changer d'agence si nécessaire
              </span>
            </AlertDescription>
          </Alert>
        )}

        {!todaySchedule?.hasSchedule && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Aucun planning trouvé pour aujourd'hui. Sélectionnez une agence manuellement.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* Sélection agence */}
          <div className="space-y-2">
            <Label htmlFor="agency">
              Agence *
              {todaySchedule?.hasSchedule && (
                <span className="text-sm text-green-600 ml-2">(Auto-sélectionnée)</span>
              )}
            </Label>
            <Select
              value={formData.agencyId}
              onValueChange={(value) => handleChange('agencyId', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une agence" />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{agency.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {agency.code}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Plaque d'immatriculation */}
          <div className="space-y-2">
            <Label htmlFor="licensePlate">Plaque d'immatriculation *</Label>
            <Input
              id="licensePlate"
              value={formData.licensePlate}
              onChange={(e) => handleChange('licensePlate', e.target.value.toUpperCase())}
              placeholder="AB-123-CD"
              required
            />
          </div>

          {/* Marque et Modèle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marque</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                placeholder="BMW, Mercedes..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modèle *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="X3, Classe A..."
                required
              />
            </div>
          </div>

          {/* Type de véhicule */}
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Type de véhicule *</Label>
            <Select
              value={formData.vehicleType}
              onValueChange={(value) => handleChange('vehicleType', value)}
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VP">VP - Véhicule Particulier</SelectItem>
                <SelectItem value="VU">VU - Véhicule Utilitaire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Informations optionnelles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Couleur</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                placeholder="Noir, Blanc..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Année</Label>
              <Input
                id="year"
                type="number"
                value={formData.year || ''}
                onChange={(e) => handleChange('year', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="2020"
                min="1990"
                max="2025"
              />
            </div>
          </div>

          {/* État du véhicule */}
          <div className="space-y-2">
            <Label htmlFor="condition">État général</Label>
            <Select
              value={formData.condition}
              onValueChange={(value) => handleChange('condition', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Bon</SelectItem>
                <SelectItem value="fair">Correct</SelectItem>
                <SelectItem value="poor">Mauvais</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Informations complémentaires..."
              rows={3}
            />
          </div>

          {/* Bouton de soumission */}
          <Button
            type="submit"
            disabled={isLoading || !formData.agencyId || !formData.licensePlate || !formData.model}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              'Démarrer la préparation'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}