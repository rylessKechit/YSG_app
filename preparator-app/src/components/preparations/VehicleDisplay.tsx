// preparator-app/src/components/preparations/VehicleDisplay.tsx
// ✅ MISE À JOUR: Compatible avec la nouvelle structure Vehicle et workflow flexible

import React from 'react';
import { 
  Car, 
  Palette, 
  Calendar, 
  Fuel, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Wrench,
  Eye,
  Camera
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ✅ Interface Vehicle mise à jour (compatible avec le backend)
interface Vehicle {
  id: string;
  licensePlate: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  fuelType?: 'essence' | 'diesel' | 'electrique' | 'hybride';
  condition?: 'excellent' | 'bon' | 'correct' | 'mediocre' | 'mauvais';
  status?: 'available' | 'reserved' | 'in_preparation' | 'ready' | 'rented' | 'maintenance' | 'out_of_service';
  mileage?: number; // ✅ Nouveau: kilométrage
  location?: string; // ✅ Nouveau: emplacement actuel
  lastPreparationDate?: string; // ✅ Nouveau: dernière préparation
  currentPreparation?: string; // ✅ Nouveau: ID préparation en cours
  maintenanceNotes?: string; // ✅ Nouveau: notes de maintenance
  photos?: string[]; // ✅ Nouveau: photos du véhicule
  issues?: Array<{ // ✅ Nouveau: incidents en cours
    id: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    reportedAt: string;
  }>;
  notes?: string;
}

interface VehicleDisplayProps {
  vehicle: Vehicle;
  showDetails?: boolean;
  compact?: boolean;
  showStatus?: boolean; // ✅ Nouveau: afficher le statut
  showActions?: boolean; // ✅ Nouveau: afficher les actions
  onViewPhotos?: () => void; // ✅ Nouveau: callback pour voir les photos
  onReportIssue?: () => void; // ✅ Nouveau: callback pour signaler un incident
  showPreparationHistory?: boolean; // ✅ Nouveau: afficher l'historique
}

export const VehicleDisplay: React.FC<VehicleDisplayProps> = ({
  vehicle,
  showDetails = true,
  compact = false,
  showStatus = true,
  showActions = false,
  onViewPhotos,
  onReportIssue,
  showPreparationHistory = false
}) => {
  // ✅ Couleurs pour l'état du véhicule
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'bon': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'correct': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'mediocre': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'mauvais': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // ✅ Badge de statut du véhicule
  const getStatusBadge = () => {
    if (!vehicle.status || !showStatus) return null;

    const statusConfig = {
      available: { label: 'Disponible', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      reserved: { label: 'Réservé', color: 'bg-blue-100 text-blue-800', icon: Clock },
      in_preparation: { label: 'En préparation', color: 'bg-yellow-100 text-yellow-800', icon: Wrench },
      ready: { label: 'Prêt', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rented: { label: 'Loué', color: 'bg-blue-100 text-blue-800', icon: Car },
      maintenance: { label: 'Maintenance', color: 'bg-orange-100 text-orange-800', icon: Wrench },
      out_of_service: { label: 'Hors service', color: 'bg-red-100 text-red-800', icon: AlertTriangle }
    };

    const config = statusConfig[vehicle.status as keyof typeof statusConfig];
    if (!config) return null;

    const IconComponent = config.icon;

    return (
      <Badge className={`${config.color} gap-1 border`}>
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // ✅ Formatage du carburant
  const getFuelTypeLabel = (fuelType: string) => {
    const labels = {
      essence: 'Essence',
      diesel: 'Diesel',
      electrique: 'Électrique',
      hybride: 'Hybride'
    };
    return labels[fuelType as keyof typeof labels] || fuelType;
  };

  // ✅ Formatage du kilométrage
  const formatMileage = (mileage?: number) => {
    if (!mileage) return null;
    return new Intl.NumberFormat('fr-FR').format(mileage) + ' km';
  };

  return (
    <div className={`${compact ? 'space-y-2' : 'space-y-4'}`}>
      {/* En-tête avec véhicule et statuts */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            vehicle.status === 'in_preparation' ? 'bg-yellow-100' :
            vehicle.status === 'available' ? 'bg-green-100' :
            vehicle.status === 'maintenance' ? 'bg-orange-100' :
            'bg-blue-100'
          }`}>
            <Car className={`w-6 h-6 ${
              vehicle.status === 'in_preparation' ? 'text-yellow-600' :
              vehicle.status === 'available' ? 'text-green-600' :
              vehicle.status === 'maintenance' ? 'text-orange-600' :
              'text-blue-600'
            }`} />
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              {vehicle.licensePlate}
            </h3>
            <p className="text-gray-600">
              {vehicle.brand} {vehicle.model}
            </p>
            
            {/* Badges de condition et statut */}
            <div className="flex items-center gap-2 mt-1">
              {vehicle.condition && (
                <Badge className={getConditionColor(vehicle.condition)}>
                  {vehicle.condition}
                </Badge>
              )}
              {getStatusBadge()}
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2">
            {vehicle.photos && vehicle.photos.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewPhotos}
                className="gap-1"
              >
                <Camera className="w-4 h-4" />
                {vehicle.photos.length}
              </Button>
            )}
            
            {onReportIssue && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReportIssue}
                className="gap-1"
              >
                <AlertTriangle className="w-4 h-4" />
                Signaler
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ✅ Alertes et incidents */}
      {vehicle.issues && vehicle.issues.length > 0 && !compact && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="font-medium text-red-800">
              {vehicle.issues.length} incident{vehicle.issues.length > 1 ? 's' : ''} en cours
            </span>
          </div>
          {vehicle.issues.slice(0, 2).map((issue) => (
            <p key={issue.id} className="text-sm text-red-700">
              • {issue.description}
            </p>
          ))}
          {vehicle.issues.length > 2 && (
            <p className="text-sm text-red-600 mt-1">
              ... et {vehicle.issues.length - 2} autre{vehicle.issues.length - 2 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Détails du véhicule */}
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
              <span className="font-medium">{getFuelTypeLabel(vehicle.fuelType)}</span>
            </div>
          )}
          
          {/* ✅ Nouveau: Kilométrage */}
          {vehicle.mileage && (
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Kilométrage:</span>
              <span className="font-medium">{formatMileage(vehicle.mileage)}</span>
            </div>
          )}
          
          {/* ✅ Nouveau: Emplacement */}
          {vehicle.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Emplacement:</span>
              <span className="font-medium">{vehicle.location}</span>
            </div>
          )}
          
          {/* ✅ Nouveau: Dernière préparation */}
          {vehicle.lastPreparationDate && showPreparationHistory && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Dernière préparation:</span>
              <span className="font-medium">
                {new Date(vehicle.lastPreparationDate).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Notes générales */}
      {vehicle.notes && !compact && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">{vehicle.notes}</p>
        </div>
      )}

      {/* ✅ Notes de maintenance */}
      {vehicle.maintenanceNotes && !compact && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-orange-800">Notes de maintenance</span>
          </div>
          <p className="text-sm text-orange-700">{vehicle.maintenanceNotes}</p>
        </div>
      )}
    </div>
  );
};