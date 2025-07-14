// admin-app/src/app/(dashboard)/timesheets/compare/page.tsx - VERSION MISE À JOUR
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Import du composant de vue comparative
import { TimesheetsComparisonView } from '@/components/timesheets/timesheets-comparison-view';
import { useState } from 'react';
import { format, subDays } from 'date-fns';

export default function TimesheetsComparePage() {
  const router = useRouter();
  
  // État pour la période
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  const handleBack = () => {
    router.push('/timesheets');
  };

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux pointages
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Vue comparative
          </h1>
          <p className="text-gray-600 mt-1">
            Comparaison entre les plannings prévus et les pointages réels
          </p>
        </div>
      </div>

      {/* Vue comparative */}
      <TimesheetsComparisonView 
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />
    </div>
  );
}