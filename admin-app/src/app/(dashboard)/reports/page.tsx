// admin-app/src/app/(dashboard)/reports/page.tsx - REFONTE MODERNE
'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  Building2, 
  Clock, 
  BarChart3,
  Filter,
  RefreshCw,
  Plus,
  Eye,
  AlertCircle,
  FileText,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Hook pour notre nouveau rapport de préparations
import { useAgencies } from '@/hooks/api/useAgencies';
import { usePreparationsReport } from '@/hooks/api/usePreparationsReport';

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('preparations');
  
  // Hook pour récupérer les agences pour les stats
  const { data: agenciesData, isLoading: agenciesLoading } = useAgencies();
  const agencies = agenciesData?.agencies || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rapports & Analytics</h1>
          <p className="text-gray-600 mt-1">
            Générez et analysez vos rapports de performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            <FileSpreadsheet className="h-3 w-3 mr-1" />
            Excel disponible
          </Badge>
        </div>
      </div>

      {/* KPIs rapides - TODO: Connecter avec vraies données */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickMetricCard
          title="Rapports générés"
          value="42" // TODO: Remplacer par vraies données
          change="+12%"
          icon={<FileText className="h-4 w-4" />}
          trend="up"
          isLoading={false} // TODO: État de chargement réel
        />
        <QuickMetricCard
          title="Agences actives"
          value={agencies.length.toString()}
          change="stable"
          icon={<Building2 className="h-4 w-4" />}
          trend="stable"
          isLoading={agenciesLoading}
        />
        <QuickMetricCard
          title="Dernière mise à jour"
          value="2min" // TODO: Calculer temps réel
          change="Temps réel"
          icon={<RefreshCw className="h-4 w-4" />}
          trend="stable"
          isLoading={false}
        />
        <QuickMetricCard
          title="Exports ce mois"
          value="156" // TODO: Compter vrais exports
          change="+8%"
          icon={<Download className="h-4 w-4" />}
          trend="up"
          isLoading={false}
        />
      </div>

      {/* Navigation par onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preparations" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Préparations
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="archives" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Archives
          </TabsTrigger>
        </TabsList>

        {/* Onglet Préparations */}
        <TabsContent value="preparations">
          <PreparationsReportTab />
        </TabsContent>

        {/* Onglet Performance */}
        <TabsContent value="performance">
          <PerformanceReportTab />
        </TabsContent>

        {/* Onglet Archives */}
        <TabsContent value="archives">
          <ArchivesReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ================================
// COMPOSANT : Métriques rapides (VRAIES DONNÉES À CONNECTER)
// ================================

interface QuickMetricCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'stable';
  isLoading?: boolean;
}

const QuickMetricCard: React.FC<QuickMetricCardProps> = ({ title, value, change, icon, trend, isLoading = false }) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className="text-gray-400">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <p className={`text-xs flex items-center gap-1 ${getTrendColor()}`}>
          <span>{getTrendIcon()}</span>
          {change}
        </p>
      </CardContent>
    </Card>
  );
};

// ================================
// COMPOSANT : Rapport Préparations
// ================================

const PreparationsReportTab: React.FC = () => {
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data: agenciesData, isLoading: agenciesLoading } = useAgencies();
  const agencies = agenciesData?.agencies || [];
  const { generateReport, downloadExcel, isGenerating, isDownloading } = usePreparationsReport();

  // Définir les dates par défaut (dernier mois)
  React.useEffect(() => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(endOfLastMonth.toISOString().split('T')[0]);
  }, []);

  const isFormValid = React.useMemo(() => {
    if (!selectedAgency || !startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
  }, [selectedAgency, startDate, endDate]);

  const handlePreview = async () => {
    if (!isFormValid) return;
    
    try {
      const result = await generateReport({
        agencyId: selectedAgency,
        startDate,
        endDate,
        format: 'json'
      });

      // Afficher un aperçu des métriques
      const metrics = result.data.metriques;
      alert(
        `Aperçu du rapport:\n\n` +
        `📊 Total préparations: ${metrics.totalPreparations}\n` +
        `🚗 Nettoyage (terminé): ${metrics.exteriorOrInterior}\n` +
        `⛽ Carburant (terminé): ${metrics.fuel}\n` +
        `✨ Lavage spécial (terminé): ${metrics.specialWash}`
      );
    } catch (error) {
      alert('Erreur lors de la prévisualisation');
    }
  };

  const handleDownload = async () => {
    if (!isFormValid) return;
    
    try {
      await downloadExcel({
        agencyId: selectedAgency,
        startDate,
        endDate
      });
    } catch (error) {
      alert('Erreur lors du téléchargement');
    }
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Rapport Préparations par Étapes</h3>
              <p className="text-sm text-blue-700 mt-1">
                Analysez le nombre de préparations avec les étapes terminées : nettoyage, carburant et lavage spécial.
                Export Excel avec détails complets.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Configuration du rapport
          </CardTitle>
          <CardDescription>
            Sélectionnez l'agence et la période pour générer le rapport
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sélection agence avec Shadcn Select */}
          <div className="space-y-2">
            <Label htmlFor="agency">Agence *</Label>
            {agenciesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez une agence" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name} ({agency.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Période avec inputs Shadcn */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
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
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
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
              onClick={handlePreview}
              variant="outline"
              disabled={!isFormValid || isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Prévisualiser
            </Button>
            <Button
              onClick={handleDownload}
              disabled={!isFormValid || isDownloading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Télécharger Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Métriques expliquées */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Métriques incluses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricExplanation
              icon="🚗"
              title="Nettoyage"
              description="Préparations avec exterior OU interior terminés"
              color="blue"
            />
            <MetricExplanation
              icon="⛽"
              title="Carburant"
              description="Préparations avec étape fuel terminée"
              color="yellow"
            />
            <MetricExplanation
              icon="✨"
              title="Lavage spécial"
              description="Préparations avec special_wash terminé"
              color="purple"
            />
          </div>
          
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note :</strong> Seules les étapes marquées comme "terminées" sont comptabilisées. 
              Une préparation peut être comptée dans plusieurs catégories.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ================================
// COMPOSANT : Métrique expliquée
// ================================

interface MetricExplanationProps {
  icon: string;
  title: string;
  description: string;
  color: 'blue' | 'yellow' | 'purple';
}

const MetricExplanation: React.FC<MetricExplanationProps> = ({ icon, title, description, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    purple: 'bg-purple-50 border-purple-200'
  };

  const textClasses = {
    blue: 'text-blue-900',
    yellow: 'text-yellow-900',
    purple: 'text-purple-900'
  };

  const subtextClasses = {
    blue: 'text-blue-700',
    yellow: 'text-yellow-700',
    purple: 'text-purple-700'
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <p className={`font-medium ${textClasses[color]}`}>{title}</p>
          <p className={`text-sm ${subtextClasses[color]}`}>{description}</p>
        </div>
      </div>
    </div>
  );
};

// ================================
// COMPOSANT : Onglet Performance (placeholder)
// ================================

const PerformanceReportTab: React.FC = () => {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Rapports de Performance</h3>
        <p className="text-gray-600 mb-6">
          Analysez les temps de préparation, l'efficacité des équipes et les tendances de performance.
        </p>
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          Prochainement disponible
        </Badge>
      </CardContent>
    </Card>
  );
};

// ================================
// COMPOSANT : Onglet Archives (placeholder)
// ================================

const ArchivesReportTab: React.FC = () => {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Archives des Rapports</h3>
        <p className="text-gray-600 mb-6">
          Consultez l'historique de tous vos rapports générés et téléchargez-les à nouveau.
        </p>
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          Prochainement disponible
        </Badge>
      </CardContent>
    </Card>
  );
};

export default ReportsPage;