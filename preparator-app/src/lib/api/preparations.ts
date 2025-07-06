// preparator-app/src/lib/api/preparations.ts
// ✅ MODIFICATION: API avec support du workflow flexible

import { apiClient } from './client';

export interface StartPreparationData {
  licensePlate: string;
  brand: string;
  model: string;
  agencyId?: string;
  notes?: string;
}

export interface CompleteStepData {
  step: string;
  photo: File;
  notes?: string;
  stepType: string; // Pour le middleware backend
}

export interface CompletePreparationData {
  notes?: string;
  skipRemainingSteps?: boolean; // ✅ Nouveau paramètre
}

export interface ReportIssueData {
  type: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  photo?: File;
}

export const preparationApi = {
  // Récupérer la préparation en cours
  async getCurrent() {
    try {
      const response = await apiClient.get('/preparations/current');
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API getCurrent:', error);
      throw new Error(error.response?.data?.message || 'Erreur réseau');
    }
  },

  // Démarrer une nouvelle préparation
  async start(vehicleData: StartPreparationData) {
    try {
      const response = await apiClient.post('/preparations/start', vehicleData);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API start:', error);
      throw new Error(error.response?.data?.message || 'Erreur réseau');
    }
  },

  // ✅ MODIFICATION: Compléter une étape avec photo
  async completeStep(preparationId: string, stepData: CompleteStepData) {
    try {
      // Créer un FormData pour envoyer la photo
      const formData = new FormData();
      formData.append('step', stepData.step);
      formData.append('stepType', stepData.stepType);
      formData.append('photo', stepData.photo);
      
      if (stepData.notes) {
        formData.append('notes', stepData.notes);
      }

      console.log('📸 Envoi FormData:', {
        step: stepData.step,
        stepType: stepData.stepType,
        hasPhoto: !!stepData.photo,
        photoSize: stepData.photo.size,
        notes: stepData.notes
      });

      const response = await apiClient.put(
        `/preparations/${preparationId}/step`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000 // 30 secondes pour l'upload
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API completeStep:', error);
      throw new Error(error.response?.data?.message || 'Erreur lors de l\'upload');
    }
  },

  // ✅ MODIFICATION: Terminer préparation (même partiellement)
  async complete(preparationId: string, data: CompletePreparationData = {}) {
    try {
      const requestData = {
        notes: data.notes || '',
        skipRemainingSteps: data.skipRemainingSteps !== false // Par défaut true
      };

      console.log('🏁 Finalisation préparation:', requestData);

      const response = await apiClient.post(
        `/preparations/${preparationId}/complete`, 
        requestData
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API complete:', error);
      throw new Error(error.response?.data?.message || 'Erreur réseau');
    }
  },

  // Signaler un incident
  async reportIssue(preparationId: string, issueData: ReportIssueData) {
    try {
      const formData = new FormData();
      formData.append('type', issueData.type);
      formData.append('description', issueData.description);
      formData.append('severity', issueData.severity || 'medium');
      
      if (issueData.photo) {
        formData.append('photo', issueData.photo);
      }

      const response = await apiClient.post(
        `/preparations/${preparationId}/issue`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API reportIssue:', error);
      throw new Error(error.response?.data?.message || 'Erreur réseau');
    }
  },

  // Récupérer mes préparations
  async getMyPreparations() {
    try {
      const response = await apiClient.get('/preparations/my-preparations');
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API getMyPreparations:', error);
      throw new Error(error.response?.data?.message || 'Erreur réseau');
    }
  },

  // Récupérer les statistiques
  async getMyStats() {
    try {
      const response = await apiClient.get('/preparations/my-stats');
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API getMyStats:', error);
      throw new Error(error.response?.data?.message || 'Erreur réseau');
    }
  },

  // Récupérer les véhicules disponibles
  async getAvailableVehicles() {
    try {
      const response = await apiClient.get('/preparations/available-vehicles');
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API getAvailableVehicles:', error);
      throw new Error(error.response?.data?.message || 'Erreur réseau');
    }
  },

  // ✅ NOUVEAU: Récupérer les agences de l'utilisateur
  async getUserAgencies() {
    try {
      const response = await apiClient.get('/preparations/user-agencies');
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API getUserAgencies:', error);
      throw new Error(error.response?.data?.message || 'Erreur réseau');
    }
  },

  // ✅ NOUVEAU: Historique d'un véhicule
  async getVehicleHistory(licensePlate: string) {
    try {
      const response = await apiClient.get(`/preparations/vehicle-history/${licensePlate}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur API getVehicleHistory:', error);
      throw new Error(error.response?.data?.message || 'Erreur réseau');
    }
  }
};