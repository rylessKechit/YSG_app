// admin-app/src/app/(dashboard)/timesheets/page.tsx - VERSION COMPATIBLE BACKEND
'use client';

import { useState } from 'react';
import { Clock, BarChart3, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Composants révisés pour le backend
import { TimesheetsHeader } from '@/components/timesheets/timesheets-header';
import { TimesheetsQuickStats } from '@/components/timesheets/timesheets-quick-stats';
import { TimesheetsListView } from '@/components/timesheets/timesheets-list-view';
import { TimesheetsComparisonView } from '@/components/timesheets/timesheets-comparison-view';
import { TimesheetsAnalyticsView } from '@/components/timesheets/timesheets-analytics-view';

import { format, subDays } from 'date-fns';

export default function TimesheetsPage() {
  // ===== ÉTAT GLOBAL DE LA PAGE =====
  const [activeTab, setActiveTab] = useState<'list' | 'comparison' | 'analytics'>('list');
  
  // Filtres partagés
  const [globalDateRange, setGlobalDateRange] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  // ===== HANDLERS GLOBAUX =====
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'list' | 'comparison' | 'analytics');
  };

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setGlobalDateRange({ startDate, endDate });
  };

  return (
    <div className="space-y-6">
      {/* Header avec actions principales */}
      <TimesheetsHeader />

      {/* Stats rapides compatibles backend */}
      <TimesheetsQuickStats dateRange={globalDateRange} />

      {/* Navigation par onglets */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Liste des pointages
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Vue comparative
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytiques
          </TabsTrigger>
        </TabsList>

        {/* Vue Liste - Compatible Backend */}
        <TabsContent value="list" className="space-y-6">
          <TimesheetsListView 
            dateRange={globalDateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        </TabsContent>

        {/* Vue Comparative - Compatible Backend */}
        <TabsContent value="comparison" className="space-y-6">
          <TimesheetsComparisonView 
            dateRange={globalDateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        </TabsContent>

        {/* Vue Analytiques - Compatible Backend */}
        <TabsContent value="analytics" className="space-y-6">
          <TimesheetsAnalyticsView 
            dateRange={globalDateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}