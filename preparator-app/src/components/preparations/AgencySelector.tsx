// preparator-app/src/components/preparations/AgencySelector.tsx
// ✅ MISE À JOUR: Compatible avec la nouvelle structure Agency

import React from 'react';
import { Building2, MapPin, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// ✅ Interface Agency mise à jour (compatible avec le backend)
interface Agency {
  id: string;
  name: string;
  code: string;
  client?: string; // Optionnel car peut ne pas être présent partout
  address?: string; // Nouveau: adresse de l'agence
  city?: string; // Nouveau: ville
  isActive?: boolean; // Nouveau: statut actif/inactif
  preparationsCount?: number; // Nouveau: nombre de préparations en cours
}

interface AgencySelectorProps {
  agencies: Agency[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showAllOption?: boolean;
  showDetails?: boolean; // ✅ Nouveau: afficher les détails enrichis
  compact?: boolean; // ✅ Nouveau: mode compact
  filterActive?: boolean; // ✅ Nouveau: filtrer seulement les agences actives
}

export const AgencySelector: React.FC<AgencySelectorProps> = ({
  agencies,
  value,
  onChange,
  placeholder = "Sélectionner une agence",
  disabled = false,
  showAllOption = false,
  showDetails = true,
  compact = false,
  filterActive = true
}) => {
  // ✅ Filtrer les agences selon les critères
  const filteredAgencies = React.useMemo(() => {
    let filtered = agencies;
    
    // Filtrer les agences actives si demandé
    if (filterActive) {
      filtered = filtered.filter(agency => agency.isActive !== false);
    }
    
    // Trier par nom
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [agencies, filterActive]);

  // ✅ Obtenir l'agence sélectionnée pour l'affichage
  const selectedAgency = filteredAgencies.find(agency => agency.id === value);

  // ✅ Obtenir le texte d'affichage dans le trigger
  const getDisplayText = () => {
    if (value === 'all') return 'Toutes les agences';
    if (!selectedAgency) return placeholder;
    
    if (compact) {
      return selectedAgency.code || selectedAgency.name;
    }
    
    return selectedAgency.name;
  };

  // ✅ Obtenir les informations secondaires
  const getSecondaryInfo = (agency: Agency) => {
    const info = [];
    
    if (agency.client) info.push(agency.client);
    if (agency.code) info.push(agency.code);
    if (agency.city) info.push(agency.city);
    
    return info.join(' • ');
  };

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="truncate">{getDisplayText()}</span>
            {/* ✅ Affichage enrichi dans le trigger */}
            {selectedAgency && showDetails && !compact && (
              <div className="text-xs text-gray-500 truncate">
                {getSecondaryInfo(selectedAgency)}
              </div>
            )}
          </div>
          {/* ✅ Badge du nombre de préparations en cours */}
          {selectedAgency?.preparationsCount !== undefined && selectedAgency.preparationsCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {selectedAgency.preparationsCount}
            </Badge>
          )}
        </div>
      </SelectTrigger>
      
      <SelectContent>
        {/* Option "Toutes les agences" */}
        {showAllOption && (
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Toutes les agences</span>
            </div>
          </SelectItem>
        )}
        
        {/* Liste des agences */}
        {filteredAgencies.length > 0 ? (
          filteredAgencies.map((agency) => (
            <SelectItem key={agency.id} value={agency.id}>
              <div className="flex items-center gap-3 w-full">
                {/* Icône et nom */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{agency.name}</span>
                      {/* Badge du code agence */}
                      {agency.code && (
                        <Badge variant="outline" className="text-xs bg-gray-50">
                          {agency.code}
                        </Badge>
                      )}
                      {/* Badge inactif si nécessaire */}
                      {agency.isActive === false && (
                        <Badge variant="secondary" className="text-xs">
                          Inactif
                        </Badge>
                      )}
                    </div>
                    
                    {/* Informations détaillées */}
                    {showDetails && !compact && (
                      <div className="text-sm text-gray-500 space-y-1">
                        {/* Client et ville */}
                        {(agency.client || agency.city) && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span className="truncate">
                              {[agency.client, agency.city].filter(Boolean).join(' • ')}
                            </span>
                          </div>
                        )}
                        
                        {/* Adresse */}
                        {agency.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{agency.address}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Badge nombre de préparations */}
                {agency.preparationsCount !== undefined && (
                  <Badge 
                    variant={agency.preparationsCount > 0 ? "default" : "outline"} 
                    className="text-xs ml-auto flex-shrink-0"
                  >
                    {agency.preparationsCount} 
                    {agency.preparationsCount === 1 ? ' prép.' : ' préps.'}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))
        ) : (
          // ✅ État vide
          <SelectItem value="no-agencies" disabled>
            <div className="flex items-center gap-2 text-gray-500">
              <Building2 className="w-4 h-4" />
              <span>Aucune agence disponible</span>
            </div>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};