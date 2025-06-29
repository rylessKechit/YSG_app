'use client';

import { useState } from 'react';
import { Plus, Calendar, Users as UsersIcon, Clock, BarChart3, Grid, List } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScheduleTable } from '@/components/schedules/schedule-table'; // ✅ Utilise le nouveau composant
import { ScheduleCalendar } from '@/components/schedules/schedule-calendar';
import { ScheduleStats } from '@/components/schedules/schedule-stats';
import { QuickCreateSchedule } from '@/components/schedules/quick-create-schedule';

import { useSchedules, useScheduleStats } from '@/hooks/api/useSchedules';

export default function SchedulesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('planning'); // ✅ Changé de 'calendar' vers 'planning'
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  // Hooks pour les données
  const { data: schedulesData, isLoading: isLoadingSchedules } = useSchedules({
    page: 1,
    limit: 10
  });

  const { data: stats, isLoading: isLoadingStats } = useScheduleStats();

  const handleCreateSchedule = () => {
    router.push('/schedules/new');
  };

  const handleQuickCreateSuccess = () => {
    setShowQuickCreate(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Plannings</h1>
          <p className="text-gray-600">
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

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Plannings totaux</p>
              <p className="text-2xl font-bold">
                {schedulesData?.data?.pagination?.total || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Heures de travail</p>
              <p className="text-2xl font-bold">
                {stats?.totalWorkingHours || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <UsersIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Moyenne par utilisateur</p>
              <p className="text-2xl font-bold">
                {stats?.averagePerUser || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <BarChart3 className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Moyenne par jour</p>
              <p className="text-2xl font-bold">
                {stats?.averagePerDay ? `${stats.averagePerDay}h` : '0h'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="planning" className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            Planning
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Vue Calendrier
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analyses
          </TabsTrigger>
        </TabsList>

        {/* ✅ Vue Planning (nouveau composant avec toutes les vues) */}
        <TabsContent value="planning" className="space-y-6">
          <ScheduleTable />
        </TabsContent>

        {/* Vue Calendrier (ancienne vue mensuelle) */}
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