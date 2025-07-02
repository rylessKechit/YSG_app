// admin-app/src/lib/stores/timesheet-store.ts - STORE ZUSTAND POUR TIMESHEETS
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TimesheetFilters, ComparisonFilters } from '@/types/timesheet';

interface TimesheetState {
  // Filtres persistants
  lastFilters: TimesheetFilters;
  lastComparisonFilters: ComparisonFilters;
  
  // État de l'UI
  selectedTimesheetIds: string[];
  isComparisonMode: boolean;
  showOnlyAnomalies: boolean;
  
  // Actions
  setLastFilters: (filters: TimesheetFilters) => void;
  setLastComparisonFilters: (filters: ComparisonFilters) => void;
  setSelectedTimesheetIds: (ids: string[]) => void;
  toggleTimesheetSelection: (id: string) => void;
  clearSelection: () => void;
  setComparisonMode: (enabled: boolean) => void;
  setShowOnlyAnomalies: (show: boolean) => void;
  
  // Getters
  hasSelection: () => boolean;
  getSelectionCount: () => number;
}

export const useTimesheetStore = create<TimesheetState>()(
  persist(
    (set, get) => ({
      // État initial
      lastFilters: {
        page: 1,
        limit: 20,
        status: 'all',
        sort: 'date',
        order: 'desc'
      },
      lastComparisonFilters: {
        startDate: '',
        endDate: '',
        includeDetails: true,
        anomaliesOnly: false
      },
      selectedTimesheetIds: [],
      isComparisonMode: false,
      showOnlyAnomalies: false,

      // Actions
      setLastFilters: (filters: TimesheetFilters) => {
        console.log('💾 Sauvegarde filtres timesheets:', filters);
        set({ lastFilters: filters });
      },

      setLastComparisonFilters: (filters: ComparisonFilters) => {
        console.log('💾 Sauvegarde filtres comparaison:', filters);
        set({ lastComparisonFilters: filters });
      },

      setSelectedTimesheetIds: (ids: string[]) => {
        set({ selectedTimesheetIds: ids });
      },

      toggleTimesheetSelection: (id: string) => {
        const { selectedTimesheetIds } = get();
        const isSelected = selectedTimesheetIds.includes(id);
        
        if (isSelected) {
          set({ 
            selectedTimesheetIds: selectedTimesheetIds.filter(selectedId => selectedId !== id) 
          });
        } else {
          set({ 
            selectedTimesheetIds: [...selectedTimesheetIds, id] 
          });
        }
      },

      clearSelection: () => {
        set({ selectedTimesheetIds: [] });
      },

      setComparisonMode: (enabled: boolean) => {
        set({ isComparisonMode: enabled });
        if (enabled) {
          // En mode comparaison, on clear la sélection
          set({ selectedTimesheetIds: [] });
        }
      },

      setShowOnlyAnomalies: (show: boolean) => {
        set({ showOnlyAnomalies: show });
      },

      // Getters
      hasSelection: () => {
        const { selectedTimesheetIds } = get();
        return selectedTimesheetIds.length > 0;
      },

      getSelectionCount: () => {
        const { selectedTimesheetIds } = get();
        return selectedTimesheetIds.length;
      },
    }),
    {
      name: 'timesheet-storage',
      partialize: (state) => ({
        lastFilters: state.lastFilters,
        lastComparisonFilters: state.lastComparisonFilters,
        isComparisonMode: state.isComparisonMode,
        showOnlyAnomalies: state.showOnlyAnomalies,
        // Ne pas persister la sélection (ephémère)
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔄 Hydratation timesheet store:', {
          hasFilters: !!state?.lastFilters,
          comparisonMode: state?.isComparisonMode || false
        });
        
        // Reset la sélection au démarrage
        if (state) {
          state.selectedTimesheetIds = [];
        }
      },
    }
  )
);

// Hook personnalisé avec méthodes utilitaires
export const useTimesheetActions = () => {
  const store = useTimesheetStore();
  
  return {
    ...store,
    
    // Méthodes avancées
    selectAll: (timesheetIds: string[]) => {
      store.setSelectedTimesheetIds(timesheetIds);
    },
    
    selectNone: () => {
      store.clearSelection();
    },
    
    isSelected: (id: string) => {
      return store.selectedTimesheetIds.includes(id);
    },
    
    // Mode comparaison avec filtres automatiques
    enableComparisonMode: (defaultFilters?: Partial<ComparisonFilters>) => {
      store.setComparisonMode(true);
      
      if (defaultFilters) {
        const currentFilters = store.lastComparisonFilters;
        store.setLastComparisonFilters({
          ...currentFilters,
          ...defaultFilters
        });
      }
    },
    
    // Appliquer des filtres rapides
    applyQuickFilter: (filter: 'today' | 'week' | 'month' | 'late' | 'missing') => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let newFilters: Partial<TimesheetFilters> = {};
      
      switch (filter) {
        case 'today':
          newFilters = {
            startDate: today.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0]
          };
          break;
          
        case 'week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay() + 1); // Lundi
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6); // Dimanche
          
          newFilters = {
            startDate: weekStart.toISOString().split('T')[0],
            endDate: weekEnd.toISOString().split('T')[0]
          };
          break;
          
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          
          newFilters = {
            startDate: monthStart.toISOString().split('T')[0],
            endDate: monthEnd.toISOString().split('T')[0]
          };
          break;
          
        case 'late':
          newFilters = {
            sort: 'delays.startDelay',
            order: 'desc'
          };
          break;
          
        case 'missing':
          newFilters = {
            status: 'incomplete'
          };
          break;
      }
      
      const currentFilters = store.lastFilters;
      store.setLastFilters({
        ...currentFilters,
        ...newFilters,
        page: 1 // Reset à la page 1
      });
    },
    
    // Reset tous les filtres
    resetFilters: () => {
      store.setLastFilters({
        page: 1,
        limit: 20,
        status: 'all',
        sort: 'date',
        order: 'desc'
      });
      
      store.setLastComparisonFilters({
        startDate: '',
        endDate: '',
        includeDetails: true,
        anomaliesOnly: false
      });
    }
  };
};