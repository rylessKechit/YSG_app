import React from 'react';
import { Car, Fuel, Calendar, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VehicleInfo } from '@/lib/types';

interface VehicleDisplayProps {
  vehicle: VehicleInfo;
  showAgency?: boolean;
  compact?: boolean;
}

export const VehicleDisplay: React.FC<VehicleDisplayProps> = ({
  vehicle,
  showAgency = false,
  compact = false
}) => {
  const getConditionColor = (condition?: string) => {
    switch (condition) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'good':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFuelTypeIcon = (fuelType?: string) => {
    switch (fuelType) {
      case 'electrique':
        return '⚡';
      case 'hybride':
        return '🔋';
      case 'diesel':
        return '🛢️';
      case 'essence':
      default:
        return '⛽';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
        <Car className="w-8 h-8 text-blue-600" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {vehicle.licensePlate}
          </p>
          <p className="text-sm text-gray-600 truncate">
            {vehicle.brand} {vehicle.model}
          </p>
        </div>
        {vehicle.year && (
          <span className="text-sm text-gray-500">{vehicle.year}</span>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Car className="w-5 h-5 text-blue-600" />
          <span>{vehicle.licensePlate}</span>
          {vehicle.vehicleType && (
            <Badge variant="outline" className="ml-auto">
              {vehicle.vehicleType === 'particulier' ? 'Particulier' : 'Utilitaire'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informations principales */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Marque</p>
            <p className="font-medium">{vehicle.brand}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Modèle</p>
            <p className="font-medium">{vehicle.model}</p>
          </div>
        </div>

        {/* Détails optionnels */}
        {(vehicle.year || vehicle.color) && (
          <div className="grid grid-cols-2 gap-4">
            {vehicle.year && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Année</p>
                  <span className="font-medium">{vehicle.year}</span>
                </div>
              </div>
            )}
            {vehicle.color && (
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Couleur</p>
                  <span className="font-medium capitalize">{vehicle.color}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Carburant et état */}
        {(vehicle.fuelType || vehicle.condition) && (
          <div className="flex items-center gap-2">
            {vehicle.fuelType && (
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Carburant:</span>
                <span className="font-medium capitalize">{vehicle.fuelType}</span>
              </div>
            )}
          </div>
        )}

        {/* État du véhicule */}
        {vehicle.condition && (
          <div>
            <p className="text-sm text-gray-600 mb-1">État général</p>
            <Badge 
              variant="outline" 
              className={getConditionColor(vehicle.condition)}
            >
              {vehicle.condition === 'excellent' && '⭐ Excellent'}
              {vehicle.condition === 'good' && '✅ Bon'}
              {vehicle.condition === 'fair' && '⚠️ Correct'}
              {vehicle.condition === 'poor' && '❌ Mauvais'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};