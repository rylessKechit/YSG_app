// admin-app/src/hooks/useValidationOptimized.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useValidateSchedule } from '@/hooks/api/useSchedules';
import { ScheduleCreateData } from '@/types/schedule';

interface ValidationState {
  isValidating: boolean;
  conflicts: any[];
  warnings: any[];
  suggestions: any[];
  isValid: boolean;
}

interface UseValidationOptimizedOptions {
  debounceMs?: number;
  validateOnMount?: boolean;
  autoValidate?: boolean;
}

export function useValidationOptimized(
  scheduleData: Partial<ScheduleCreateData>,
  options: UseValidationOptimizedOptions = {}
) {
  const {
    debounceMs = 500,
    validateOnMount = false,
    autoValidate = true
  } = options;

  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    conflicts: [],
    warnings: [],
    suggestions: [],
    isValid: true
  });

  const validateSchedule = useValidateSchedule();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastValidationRef = useRef<string>('');

  // Fonction pour créer une clé unique des données à valider
  const createValidationKey = useCallback((data: Partial<ScheduleCreateData>) => {
    return JSON.stringify({
      userId: data.userId,
      agencyId: data.agencyId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      breakStart: data.breakStart,
      breakEnd: data.breakEnd
    });
  }, []);

  // Fonction de validation avec debounce
  const performValidation = useCallback(async (data: ScheduleCreateData) => {
    const validationKey = createValidationKey(data);
    
    // Éviter les validations en double
    if (lastValidationRef.current === validationKey) {
      return;
    }
    
    lastValidationRef.current = validationKey;
    setValidationState(prev => ({ ...prev, isValidating: true }));

    try {
      console.log('🔍 Validation des données:', data);
      
      const result = await validateSchedule.mutateAsync(data);
      
      if (result.data) {
        setValidationState({
          isValidating: false,
          conflicts: result.data.conflicts || [],
          warnings: result.data.warnings || [],
          suggestions: result.data.suggestions || [],
          isValid: result.data.isValid || false
        });
      }
    } catch (error) {
      console.error('Erreur validation:', error);
      setValidationState(prev => ({
        ...prev,
        isValidating: false,
        conflicts: [{
          type: 'validation_error',
          severity: 'warning',
          message: 'Erreur lors de la validation'
        }],
        isValid: false
      }));
    }
  }, [validateSchedule, createValidationKey]);

  // Validation avec debounce
  const debouncedValidation = useCallback((data: Partial<ScheduleCreateData>) => {
    // Vérifier que tous les champs requis sont présents
    if (!data.userId || !data.agencyId || !data.date || !data.startTime || !data.endTime) {
      // Réinitialiser l'état si des champs manquent
      setValidationState({
        isValidating: false,
        conflicts: [],
        warnings: [],
        suggestions: [],
        isValid: true
      });
      return;
    }

    // Annuler la validation précédente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Programmer une nouvelle validation
    timeoutRef.current = setTimeout(() => {
      performValidation(data as ScheduleCreateData);
    }, debounceMs);
  }, [performValidation, debounceMs]);

  // Validation manuelle (pour les boutons)
  const validateNow = useCallback(async (data?: Partial<ScheduleCreateData>) => {
    const dataToValidate = data || scheduleData;
    
    if (!dataToValidate.userId || !dataToValidate.agencyId || 
        !dataToValidate.date || !dataToValidate.startTime || !dataToValidate.endTime) {
      return false;
    }

    await performValidation(dataToValidate as ScheduleCreateData);
    return validationState.isValid;
  }, [scheduleData, performValidation, validationState.isValid]);

  // Effet pour la validation automatique
  useEffect(() => {
    if (!autoValidate) return;

    debouncedValidation(scheduleData);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [scheduleData, debouncedValidation, autoValidate]);

  // Validation au montage si demandée
  useEffect(() => {
    if (validateOnMount && autoValidate) {
      debouncedValidation(scheduleData);
    }
  }, [validateOnMount, autoValidate, debouncedValidation, scheduleData]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...validationState,
    validateNow,
    clearValidation: () => setValidationState({
      isValidating: false,
      conflicts: [],
      warnings: [],
      suggestions: [],
      isValid: true
    })
  };
}