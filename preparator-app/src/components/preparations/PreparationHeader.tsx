// components/preparations/PreparationHeader.tsx
'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Preparation } from '@/lib/types';

interface PreparationHeaderProps {
  preparation: Preparation;
}

export function PreparationHeader({ preparation }: PreparationHeaderProps) {
  const { vehicle, user, agency, status, startTime, endTime, totalTime } = preparation;
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminée';
      case 'in_progress': return 'En cours';
      case 'cancelled': return 'Annulée';
      case 'pending': return 'En attente';
      default: return status;
    }
  };

  const getVehicleTypeIcon = (vehicleType: string) => {
    return vehicleType === 'utilitaire' ? '🚐' : '🚗';
  };

  const getVehicleTypeLabel = (vehicleType: string) => {
    return vehicleType === 'utilitaire' ? 'Utilitaire' : 'Particulier';
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {/* En-tête principal */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {getVehicleTypeIcon(vehicle.vehicleType)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {vehicle.brand} {vehicle.model}
              </h1>
              <p className="text-lg font-semibold text-gray-600">
                {vehicle.licensePlate}
              </p>
            </div>
          </div>
          
          <Badge className={`${getStatusColor(status)} font-medium`}>
            {getStatusLabel(status)}
          </Badge>
        </div>

        {/* Informations véhicule */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Type de véhicule</p>
            <p className="text-sm text-gray-900">
              {getVehicleTypeLabel(vehicle.vehicleType)}
            </p>
          </div>
          
          {vehicle.color && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Couleur</p>
              <p className="text-sm text-gray-900">{vehicle.color}</p>
            </div>
          )}
          
          {vehicle.year && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Année</p>
              <p className="text-sm text-gray-900">{vehicle.year}</p>
            </div>
          )}
        </div>

        {/* Informations préparateur et agence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Préparateur</p>
            <p className="text-sm text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Agence</p>
            <p className="text-sm text-gray-900">{agency.name}</p>
            <p className="text-xs text-gray-500">Code: {agency.code}</p>
          </div>
        </div>

        {/* Timing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Début</p>
            <p className="text-sm text-gray-900">
              {format(new Date(startTime), 'dd/MM/yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
          
          {endTime && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Fin</p>
              <p className="text-sm text-gray-900">
                {format(new Date(endTime), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
          )}
          
          {totalTime && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Durée totale</p>
              <p className="text-sm font-bold text-gray-900">
                {formatDuration(totalTime)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}