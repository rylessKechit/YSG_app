// admin-app/src/app/(dashboard)/reports/preparations/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Download, FileSpreadsheet, Building2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { useAgencies } from '@/hooks/api/useAgencies';
import { usePreparationsReport } from '@/hooks/api/usePreparationsReport';

const PreparationsReportPage: React.FC = () => {
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Hooks pour récupérer les données
  const { data: agenciesData, isLoading: agenciesLoading } = useAgencies();
  const agencies = agenciesData?.agencies || [];
  const { generateReport, downloadExcel } = usePreparationsReport();

  // Définir les dates par défaut (dernier mois)
  React.useEffect(() => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(endOfLastMonth.toISOString().split('T')[0]);
  }, []);

  // Validation du formulaire avec useMemo pour éviter les recalculs inutiles
  const isFormValid = useMemo(() => {
    if (!selectedAgency || !startDate || !endDate) {
      return false;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Vérifier que les dates sont valides avant de comparer
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }
    
    return start <= end;
  }, [selectedAgency, startDate, endDate]);

  // Générer le rapport Excel
  const handleGenerateExcelReport = async () => {
    if (!isFormValid) {
      toast.error('Veuillez remplir tous les champs correctement');
      return;
    }

    setIsGenerating(true);
    
    try {
      const selectedAgencyData = agencies.find(a => a.id === selectedAgency);
      
      toast.loading('Génération du rapport en cours...', { id: 'generating' });
      
      await downloadExcel({
        agencyId: selectedAgency,
        startDate,
        endDate
      });
      
      toast.success(`Rapport Excel généré pour ${selectedAgencyData?.name}`, { id: 'generating' });
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      toast.error('Erreur lors de la génération du rapport', { id: 'generating' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Prévisualiser les données (optionnel)
  const handlePreviewReport = async () => {
    if (!isFormValid) {
      toast.error('Veuillez remplir tous les champs correctement');
      return;
    }

    try {
      const result = await generateReport({
        agencyId: selectedAgency,
        startDate,
        endDate,
        format: 'json'
      });

      // Afficher un aperçu des métriques
      const metrics = result.data.metriques;
      toast.success(
        `Aperçu: ${metrics.totalPreparations} préparations trouvées\n` +
        `• Nettoyage: ${metrics.exteriorOrInterior}\n` +
        `• Carburant: ${metrics.fuel}\n` +
        `• Lavage spécial: ${metrics.specialWash}`,
        { duration: 5000 }
      );
    } catch (error) {
      console.error('Erreur prévisualisation:', error);
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rapport Préparations</h1>
          <p className="text-gray-600 mt-1">
            Analyse des étapes de préparation par agence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-green-600" />
          <span className="text-sm text-gray-600">Export Excel disponible</span>
        </div>
      </div>

      {/* Formulaire de configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Configuration du rapport
          </CardTitle>
          <CardDescription>
            Sélectionnez l'agence et la période pour générer le rapport des préparations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sélection agence */}
          <div className="space-y-2">
            <Label htmlFor="agency">Agence *</Label>
            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une agence" />
              </SelectTrigger>
              <SelectContent>
                {agenciesLoading ? (
                  <SelectItem value="loading" disabled>Chargement...</SelectItem>
                ) : (
                  agencies && agencies.length > 0 ? agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name} ({agency.code})
                    </SelectItem>
                  )) : (
                    <SelectItem value="no-agencies" disabled>Aucune agence disponible</SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Période */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              onClick={handlePreviewReport}
              variant="outline"
              disabled={!isFormValid || isGenerating}
              className="flex-1"
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Prévisualiser
            </Button>
            <Button
              onClick={handleGenerateExcelReport}
              disabled={!isFormValid || isGenerating}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? 'Génération...' : 'Télécharger Excel'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informations sur le rapport */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Métriques incluses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                🚗
              </div>
              <div>
                <p className="font-medium text-blue-900">Nettoyage</p>
                <p className="text-sm text-blue-700">Exterior OU Interior</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                ⛽
              </div>
              <div>
                <p className="font-medium text-yellow-900">Carburant</p>
                <p className="text-sm text-yellow-700">Étape Fuel</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                ✨
              </div>
              <div>
                <p className="font-medium text-purple-900">Lavage spécial</p>
                <p className="text-sm text-purple-700">Étape Special Wash</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Note :</strong> Le rapport comptabilise toutes les préparations ayant les étapes 
              demandées, peu importe leur statut (complétées ou non). Une préparation peut être 
              comptée dans plusieurs catégories si elle contient plusieurs étapes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PreparationsReportPage;