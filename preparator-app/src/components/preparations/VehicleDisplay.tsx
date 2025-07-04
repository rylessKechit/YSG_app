import React from 'react';
import { Car, Palette, Calendar, Fuel } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Vehicle } from '@/lib/api/preparations';

interface VehicleDisplayProps {
  vehicle: Vehicle;
  showDetails?: boolean;
  compact?: boolean;
}

export const VehicleDisplay: React.FC<VehicleDisplayProps> = ({
  vehicle,
  showDetails = true,
  compact = false
}) => {
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'bon': return 'bg-blue-100 text-blue-800';
      case 'correct': return 'bg-yellow-100 text-yellow-800';
      case 'mediocre': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`${compact ? 'space-y-2' : 'space-y-4'}`}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <Car className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">
            {vehicle.licensePlate}
          </h3>
          <p className="text-gray-600">
            {vehicle.brand} {vehicle.model}
          </p>
          {vehicle.condition && (
            <Badge className={getConditionColor(vehicle.condition)}>
              {vehicle.condition}
            </Badge>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          {vehicle.color && (
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Couleur:</span>
              <span className="font-medium">{vehicle.color}</span>
            </div>
          )}
          {vehicle.year && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Année:</span>
              <span className="font-medium">{vehicle.year}</span>
            </div>
          )}
          {vehicle.fuelType && (
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Carburant:</span>
              <span className="font-medium capitalize">{vehicle.fuelType}</span>
            </div>
          )}
        </div>
      )}

      {vehicle.notes && !compact && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">{vehicle.notes}</p>
        </div>
      )}
    </div>
  );
};