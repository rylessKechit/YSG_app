import React from 'react';
import { Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Agency } from '@/lib/api/preparations';

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
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-500" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem value="all">Toutes les agences</SelectItem>
        )}
        {agencies.map((agency) => (
          <SelectItem key={agency.id} value={agency.id}>
            <div className="flex flex-col">
              <span className="font-medium">{agency.name}</span>
              <span className="text-sm text-gray-500">
                {agency.client} • {agency.code}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};