// components/preparations/PreparationCard.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Clock, 
  Car, 
  Building2, 
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Preparation } from '@/lib/types';

interface PreparationCardProps {
  preparation: Preparation;
  showViewButton?: boolean;
}

export function PreparationCard({ preparation, showViewButton = true }: PreparationCardProps) {
  const router = useRouter();

  // Calcul du statut basé sur la durée totale
  const getStatusInfo = () => {
    const totalMinutes = preparation.totalTime || preparation.currentDuration || 0;
    const isLate = totalMinutes > 30; // Plus de 30 minutes = retard
    
    if (preparation.status === 'completed') {
      return {
        label: isLate ? 'Terminé en retard' : 'Terminé à temps',
        variant: isLate ? 'destructive' : 'default',
        bgColor: isLate ? 'bg-orange-50' : 'bg-green-50',
        textColor: isLate ? 'text-orange-600' : 'text-green-600',
        icon: isLate ? AlertTriangle : CheckCircle2
      };
    } else if (preparation.status === 'cancelled') {
      return {
        label: 'Annulé',
        variant: 'secondary',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-600',
        icon: AlertTriangle
      };
    }
    
    return {
      label: 'En cours',
      variant: 'default',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      icon: Clock
    };
  };

  // Formatage de la durée
  const formatDuration = (minutes: number) => {
    if (!minutes || minutes === 0) return '0min';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`;
  };

  // Formatage des dates
  const formatTimeRange = () => {
    const start = format(new Date(preparation.startTime), 'HH:mm', { locale: fr });
    if (preparation.endTime) {
      const end = format(new Date(preparation.endTime), 'HH:mm', { locale: fr });
      return `${start} → ${end}`;
    }
    return `${start} → En cours`;
  };

  const formatDate = () => {
    return format(new Date(preparation.startTime), 'dd/MM/yyyy', { locale: fr });
  };

  // Calcul des étapes complétées
  const completedSteps = preparation.steps?.filter(s => s.completed).length || 0;
  const totalSteps = 6; // Nombre d'étapes total

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // 🚀 FONCTION DE CLIC CORRIGÉE
  const handleCardClick = () => {
    // Rediriger vers la page de visualisation des détails
    router.push(`/preparations/${preparation.id}/view`);
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la propagation du clic
    handleCardClick();
  };

  return (
    <Card 
      className={`${statusInfo.bgColor} border transition-all duration-200 hover:shadow-md cursor-pointer`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* En-tête avec plaque et statut */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {preparation.vehicle.licensePlate}
            </h3>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Car className="h-4 w-4" />
              <span>{preparation.vehicle.brand} {preparation.vehicle.model}</span>
            </div>
          </div>
          
          <Badge className={`${statusInfo.textColor} bg-transparent border-current`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>

        {/* Informations agence */}
        <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
          <Building2 className="h-4 w-4" />
          <span>{preparation.agency.name}</span>
        </div>

        {/* Date et horaires */}
        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-center space-x-1 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{formatDate()}</span>
          </div>
          <span className="font-medium text-gray-900">
            {formatTimeRange()}
          </span>
        </div>

        {/* Étapes et durée */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            <span className="font-medium">{completedSteps}/{totalSteps}</span> étapes
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(preparation.totalTime || preparation.currentDuration || 0)}</span>
            </div>
            
            {showViewButton && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleViewClick}
                className={`${statusInfo.textColor} hover:bg-white/50 p-1 h-8 w-8`}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}