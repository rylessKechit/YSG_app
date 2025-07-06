// components/preparations/PreparationIssues.tsx
'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, CheckCircle, Camera, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Issue } from '@/lib/types';

interface PreparationIssuesProps {
  issues: Issue[];
}

export function PreparationIssues({ issues }: PreparationIssuesProps) {
  if (!issues || issues.length === 0) {
    return null;
  }

  const getIssueTypeLabel = (type: string) => {
    switch (type) {
      case 'damage': return 'Dommage';
      case 'cleanliness': return 'Propreté';
      case 'missing_item': return 'Élément manquant';
      case 'mechanical': return 'Mécanique';
      case 'other': return 'Autre';
      default: return type;
    }
  };

  const getIssueTypeIcon = (type: string) => {
    switch (type) {
      case 'damage': return '🔨';
      case 'cleanliness': return '🧹';
      case 'missing_item': return '❓';
      case 'mechanical': return '⚙️';
      case 'other': return '📝';
      default: return '⚠️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return 'Élevée';
      case 'medium': return 'Moyenne';
      case 'low': return 'Faible';
      default: return severity;
    }
  };

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <span>Incidents signalés</span>
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            {issues.length} incident{issues.length > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {issues.map((issue, index) => (
          <div
            key={issue.id || index}
            className={`
              p-4 rounded-lg border-2 transition-all duration-200
              ${issue.resolved 
                ? 'border-green-200 bg-green-50' 
                : 'border-orange-200 bg-orange-50'
              }
            `}
          >
            {/* En-tête de l'incident */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start space-x-3">
                <div className="text-2xl mt-1">
                  {getIssueTypeIcon(issue.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {getIssueTypeLabel(issue.type)}
                    </h3>
                    <Badge className={getSeverityColor(issue.severity)}>
                      {getSeverityLabel(issue.severity)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {issue.description}
                  </p>
                </div>
              </div>
              
              {issue.resolved ? (
                <Badge className="bg-green-100 text-green-800 border-green-200 shrink-0">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Résolu
                </Badge>
              ) : (
                <Badge className="bg-orange-100 text-orange-800 border-orange-200 shrink-0">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  En attente
                </Badge>
              )}
            </div>

            {/* Détails temporels */}
            <div className="space-y-2 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-1 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    Signalé le {format(new Date(issue.reportedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </span>
                </div>
                
                {issue.resolved && issue.resolvedAt && (
                  <div className="text-green-700 text-sm">
                    Résolu le {format(new Date(issue.resolvedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </div>
                )}
              </div>

              {/* Photos de l'incident */}
              {issue.photos && issue.photos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Camera className="h-4 w-4" />
                    <span>{issue.photos.length} photo{issue.photos.length > 1 ? 's' : ''} jointe{issue.photos.length > 1 ? 's' : ''}</span>
                  </div>
                  
                  {/* Miniatures des photos */}
                  <div className="flex flex-wrap gap-2">
                    {issue.photos.slice(0, 4).map((photoUrl, photoIndex) => (
                      <div key={photoIndex} className="relative">
                        <img
                          src={photoUrl}
                          alt={`Photo incident ${index + 1}-${photoIndex + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        />
                        {issue.photos && issue.photos.length > 4 && photoIndex === 3 && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-medium">
                              +{issue.photos.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Résumé des incidents */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-orange-600">
                {issues.length}
              </p>
              <p className="text-sm text-gray-600">Total incidents</p>
            </div>
            
            <div>
              <p className="text-2xl font-bold text-green-600">
                {issues.filter(i => i.resolved).length}
              </p>
              <p className="text-sm text-gray-600">Résolus</p>
            </div>
            
            <div>
              <p className="text-2xl font-bold text-red-600">
                {issues.filter(i => i.severity === 'high').length}
              </p>
              <p className="text-sm text-gray-600">Critiques</p>
            </div>
            
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {issues.reduce((sum, issue) => sum + (issue.photos?.length || 0), 0)}
              </p>
              <p className="text-sm text-gray-600">Photos</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}