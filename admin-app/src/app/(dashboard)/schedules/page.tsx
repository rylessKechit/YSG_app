// src/app/(dashboard)/schedules/page.tsx
'use client';

import { useState } from 'react';
import { Plus, Calendar, Users, Clock, BarChart3, Grid, List } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScheduleTable } from '@/components/schedules/schedule-table';
import { ScheduleCalendar } from '@/components/schedules/schedule-calendar';
import { ScheduleStats } from '@/components/schedules/schedule-stats';
import { QuickCreateSchedule } from '@/components/schedules/quick-create-schedule';

import { useSchedules, useScheduleStats } from '@/hooks/api/useSchedules';

export default function SchedulesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('calendar');
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  // Hooks pour les données
  const { data: schedulesData, isLoading: isLoadingSchedules } = useSchedules({
    page: 1,
    limit: 10 // Limite pour le widget récent
  });

  const { data: stats, isLoading: isLoadingStats } = useScheduleStats();

  const handleCreateSchedule = () => {
    router.push('/schedules/new');
  };

  const handleQuickCreateSuccess = () => {
    setShowQuickCreate(false);
    // Les données seront automatiquement rafraîchies par React Query
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Gestion des Plannings
          </h1>
          <p className="text-gray-600 mt-1">
            Planifiez et organisez les horaires de vos préparateurs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowQuickCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Planning rapide
          </Button>
          <Button onClick={handleCreateSchedule}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau planning
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-blue-600" />
                <div className="ml-3">
                  <div className="text-2xl font-bold">{stats.totalSchedules}</div>
                  <p className="text-xs text-gray-600">Plannings totaux</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-green-600" />
                <div className="ml-3">
                  <div className="text-2xl font-bold">{Math.round(stats.totalWorkingHours)}</div>
                  <p className="text-xs text-gray-600">Heures de travail</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Users className="h-4 w-4 text-purple-600" />
                <div className="ml-3">
                  <div className="text-2xl font-bold">{stats.averagePerUser}</div>
                  <p className="text-xs text-gray-600">Moyenne par utilisateur</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <BarChart3 className="h-4 w-4 text-orange-600" />
                <div className="ml-3">
                  <div className="text-2xl font-bold">{stats.averagePerDay}h</div>
                  <p className="text-xs text-gray-600">Moyenne par jour</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Interface principale avec onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            Vue Calendrier
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Liste des Plannings
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analyses
          </TabsTrigger>
        </TabsList>

        {/* Vue Calendrier */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendrier des Plannings</CardTitle>
              <CardDescription>
                Vue d'ensemble mensuelle des plannings par préparateur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScheduleCalendar />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vue Liste */}
        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tous les Plannings</CardTitle>
              <CardDescription>
                Liste détaillée de tous les plannings avec filtres avancés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScheduleTable />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vue Analyses */}
        <TabsContent value="analytics" className="space-y-6">
          <ScheduleStats />
        </TabsContent>
      </Tabs>

      {/* Modal de création rapide */}
      <QuickCreateSchedule
        isOpen={showQuickCreate}
        onClose={() => setShowQuickCreate(false)}
        onSuccess={handleQuickCreateSuccess}
      />
    </div>
  );
}