// components/preparations/PreparationViewer.tsx
'use client';

import React from 'react';
import { PreparationHeader } from './PreparationHeader';
import { PreparationStepsList } from './PreparationStepsList';
import { PreparationPhotos } from './PreparationPhotos';
import { PreparationSummary } from './PreparationSummary';
import { PreparationIssues } from './PreparationIssues';
import type { Preparation } from '@/lib/types';

interface PreparationViewerProps {
  preparation: Preparation;
}

export function PreparationViewer({ preparation }: PreparationViewerProps) {
  return (
    <div className="space-y-6">
      {/* En-tête avec infos véhicule et préparateur */}
      <PreparationHeader preparation={preparation} />

      {/* Résumé et statistiques */}
      <PreparationSummary preparation={preparation} />

      {/* Liste des étapes réalisées */}
      <PreparationStepsList steps={preparation.steps} />

      {/* Galerie de toutes les photos */}
      <PreparationPhotos preparation={preparation} />

      {/* Incidents si présents */}
      {preparation.issues && preparation.issues.length > 0 && (
        <PreparationIssues issues={preparation.issues} />
      )}
    </div>
  );
}