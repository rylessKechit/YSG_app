// src/components/ui/date-range-picker.tsx
'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  date?: DateRange;
  onDateChange: (date: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  align?: 'start' | 'center' | 'end';
  showPresets?: boolean;
}

// Presets de dates courantes
const datePresets = [
  {
    label: "Aujourd'hui",
    value: () => {
      const today = new Date();
      return { from: today, to: today };
    }
  },
  {
    label: "Hier",
    value: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: yesterday, to: yesterday };
    }
  },
  {
    label: "7 derniers jours",
    value: () => ({
      from: subDays(new Date(), 6),
      to: new Date()
    })
  },
  {
    label: "30 derniers jours",
    value: () => ({
      from: subDays(new Date(), 29),
      to: new Date()
    })
  },
  {
    label: "Cette semaine",
    value: () => ({
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: endOfWeek(new Date(), { weekStartsOn: 1 })
    })
  },
  {
    label: "Ce mois",
    value: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    })
  },
  {
    label: "Mois dernier",
    value: () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth)
      };
    }
  }
];

export function DateRangePicker({
  date,
  onDateChange,
  placeholder = "Sélectionner une période",
  className,
  disabled = false,
  align = "start",
  showPresets = true
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (range: DateRange | undefined) => {
    onDateChange(range);
    if (range?.from && range?.to) {
      setIsOpen(false);
    }
  };

  const handlePresetSelect = (preset: typeof datePresets[0]) => {
    const range = preset.value();
    handleSelect(range);
  };

  const formatDateRange = (dateRange: DateRange) => {
    if (dateRange.from && dateRange.to) {
      if (dateRange.from.getTime() === dateRange.to.getTime()) {
        return format(dateRange.from, 'dd/MM/yyyy', { locale: fr });
      }
      return `${format(dateRange.from, 'dd/MM/yyyy', { locale: fr })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: fr })}`;
    }
    if (dateRange.from) {
      return format(dateRange.from, 'dd/MM/yyyy', { locale: fr });
    }
    return '';
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateChange(undefined);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[300px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDateRange(date) : placeholder}
          {date && (
            <X 
              className="ml-auto h-4 w-4 opacity-50 hover:opacity-100" 
              onClick={clearSelection}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align={align}
        side="bottom"
        sideOffset={4}
      >
        <div className="flex">
          {/* Presets à gauche */}
          {showPresets && (
            <div className="border-r p-3 space-y-1">
              <div className="text-sm font-medium mb-2">Raccourcis</div>
              {datePresets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 px-2 text-xs"
                  onClick={() => handlePresetSelect(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}

          {/* Calendrier à droite */}
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={{ from: date?.from, to: date?.to }}
              onSelect={(range: any) => {
                if (range?.from && range?.to) {
                  handleSelect({ from: range.from, to: range.to });
                } else if (range?.from) {
                  // Si seulement une date est sélectionnée, on attend la deuxième
                  onDateChange(range.from ? { from: range.from, to: range.from } : undefined);
                }
              }}
              numberOfMonths={2}
              locale={fr}
              className="rounded-md"
            />
            
            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t mt-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onDateChange(undefined)}
              >
                Effacer
              </Button>
              <Button 
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={!date?.from || !date?.to}
              >
                Valider
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Version simplifiée sans presets
export function SimpleDateRangePicker({
  date,
  onDateChange,
  placeholder = "Sélectionner une période",
  className,
  disabled = false
}: Omit<DateRangePickerProps, 'showPresets' | 'align'>) {
  return (
    <DateRangePicker
      date={date}
      onDateChange={onDateChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      showPresets={false}
    />
  );
}

// Hook personnalisé pour gérer les états du DateRangePicker
export function useDateRange(initialRange?: DateRange) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialRange);

  const setRange = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const clearRange = () => {
    setDateRange(undefined);
  };

  const setPreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth') => {
    const presetMap = {
      today: () => {
        const today = new Date();
        return { from: today, to: today };
      },
      yesterday: () => {
        const yesterday = subDays(new Date(), 1);
        return { from: yesterday, to: yesterday };
      },
      week: () => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 })
      }),
      month: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
      }),
      lastMonth: () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth)
        };
      }
    };

    setDateRange(presetMap[preset]());
  };

  return {
    dateRange,
    setRange,
    clearRange,
    setPreset,
    isSelected: !!dateRange?.from && !!dateRange?.to,
    formatRange: dateRange ? formatDateRange(dateRange) : ''
  };
}

// Fonction helper pour formater la plage de dates
function formatDateRange(dateRange: DateRange): string {
  if (dateRange.from && dateRange.to) {
    if (dateRange.from.getTime() === dateRange.to.getTime()) {
      return format(dateRange.from, 'dd/MM/yyyy', { locale: fr });
    }
    return `${format(dateRange.from, 'dd/MM/yyyy', { locale: fr })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: fr })}`;
  }
  if (dateRange.from) {
    return format(dateRange.from, 'dd/MM/yyyy', { locale: fr });
  }
  return '';
}