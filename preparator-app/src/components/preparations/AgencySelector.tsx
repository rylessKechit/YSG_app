import React from 'react';
import { ChevronDown } from 'lucide-react';
// ✅ CORRECTION: Import Agency depuis le bon module
import { Agency } from '@/lib/types';

interface AgencySelectorProps {
  agencies: Agency[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showAllOption?: boolean;
}

export const AgencySelector: React.FC<AgencySelectorProps> = ({
  agencies,
  value,
  onChange,
  placeholder = "Sélectionner une agence",
  disabled = false,
  showAllOption = false
}) => {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        
        {showAllOption && (
          <option value="all">
            Toutes les agences
          </option>
        )}
        
        {agencies.map((agency) => (
          <option key={agency.id} value={agency.id}>
            {agency.name} - {agency.client}
          </option>
        ))}
      </select>
      
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
};