// backend/src/utils/preparationHelpers.js
const mongoose = require('mongoose');

/**
 * Assure que les données véhicule sont complètes et compatibles
 * @param {Object} preparation - Document préparation Mongoose
 * @returns {Object} Préparation avec vehicleData sécurisé
 */
const ensureVehicleDataCompatibility = (preparation) => {
  if (!preparation.vehicleData) {
    console.warn(`⚠️ vehicleData manquant pour préparation ${preparation._id}`);
    preparation.vehicleData = {
      licensePlate: 'N/A',
      brand: 'N/A',
      model: 'Véhicule',
      vehicleType: 'particulier'
    };
    return preparation;
  }

  // Corriger les champs manquants ou vides
  if (!preparation.vehicleData.brand || preparation.vehicleData.brand.trim() === '') {
    preparation.vehicleData.brand = 'N/A';
  }

  if (!preparation.vehicleData.model || preparation.vehicleData.model.trim() === '') {
    preparation.vehicleData.model = 'Véhicule';
  }

  if (!preparation.vehicleData.vehicleType) {
    preparation.vehicleData.vehicleType = 'particulier';
  }

  if (!preparation.vehicleData.condition) {
    preparation.vehicleData.condition = 'good';
  }

  if (!preparation.vehicleData.fuelType) {
    preparation.vehicleData.fuelType = 'essence';
  }

  return preparation;
};

/**
 * Formate une préparation pour l'API en assurant la compatibilité
 * @param {Object} preparation - Document préparation Mongoose (populated)
 * @returns {Object} Préparation formatée pour l'API
 */
const formatPreparationResponse = (preparation) => {
  const safePrep = ensureVehicleDataCompatibility(preparation);
  
  return {
    id: safePrep._id,
    vehicle: {
      id: safePrep.vehicle?._id,
      licensePlate: safePrep.vehicleData?.licensePlate || 'N/A',
      brand: safePrep.vehicleData?.brand || 'N/A',
      model: safePrep.vehicleData?.model || 'Véhicule',
      vehicleType: safePrep.vehicleData?.vehicleType || 'particulier',
      year: safePrep.vehicleData?.year,
      fuelType: safePrep.vehicleData?.fuelType || 'essence',
      color: safePrep.vehicleData?.color,
      condition: safePrep.vehicleData?.condition || 'good'
    },
    user: {
      id: safePrep.user._id,
      name: `${safePrep.user.firstName} ${safePrep.user.lastName}`,
      email: safePrep.user.email,
      phone: safePrep.user.phone
    },
    agency: {
      id: safePrep.agency._id,
      name: safePrep.agency.name,
      code: safePrep.agency.code,
      client: safePrep.agency.client,
      address: safePrep.agency.address
    },
    status: safePrep.status,
    progress: safePrep.progress || 0,
    currentDuration: safePrep.currentDuration || 0,
    totalTime: safePrep.totalTime,
    isOnTime: safePrep.isOnTime,
    startTime: safePrep.startTime,
    endTime: safePrep.endTime,
    steps: (safePrep.steps || []).map(step => ({
      step: step.step,
      completed: step.completed,
      completedAt: step.completedAt,
      duration: step.duration,
      notes: step.notes || '',
      photos: step.photos || []
    })),
    issues: safePrep.issues || [],
    notes: safePrep.notes || '',
    priority: safePrep.priority || 'normal',
    createdBy: safePrep.createdBy,
    createdAt: safePrep.createdAt,
    updatedAt: safePrep.updatedAt
  };
};

/**
 * Crée des données véhicule sécurisées à partir des données d'entrée
 * @param {Object} vehicleData - Données véhicule d'entrée
 * @param {Object} existingVehicle - Véhicule existant (optionnel)
 * @returns {Object} Données véhicule normalisées
 */
const createSafeVehicleData = (vehicleData, existingVehicle = null) => {
  const safeData = {
    licensePlate: (vehicleData.licensePlate || '').toUpperCase().trim(),
    brand: vehicleData.brand?.trim() || existingVehicle?.brand || 'N/A',
    model: vehicleData.model?.trim() || existingVehicle?.model || 'Véhicule',
    vehicleType: vehicleData.vehicleType || existingVehicle?.vehicleType || 'particulier',
    year: vehicleData.year || existingVehicle?.year || null,
    fuelType: vehicleData.fuelType || existingVehicle?.fuelType || 'essence',
    color: vehicleData.color?.trim() || existingVehicle?.color || '',
    condition: vehicleData.condition || existingVehicle?.condition || 'good'
  };

  // Validation supplémentaire
  if (!safeData.licensePlate) {
    throw new Error('Plaque d\'immatriculation requise');
  }

  if (safeData.brand === '') {
    safeData.brand = 'N/A';
  }

  if (safeData.model === '') {
    safeData.model = 'Véhicule';
  }

  return safeData;
};

/**
 * Synchronise vehicleData avec les données du véhicule lié
 * @param {Object} preparation - Document préparation
 * @returns {Promise<Object>} Préparation mise à jour
 */
const syncVehicleDataFromVehicle = async (preparation) => {
  if (!preparation.vehicle) {
    console.warn(`⚠️ Aucun véhicule lié pour préparation ${preparation._id}`);
    return preparation;
  }

  try {
    const Vehicle = mongoose.model('Vehicle');
    const vehicle = await Vehicle.findById(preparation.vehicle);
    
    if (!vehicle) {
      console.warn(`⚠️ Véhicule ${preparation.vehicle} non trouvé`);
      return preparation;
    }

    // Mettre à jour vehicleData avec les données du véhicule
    preparation.vehicleData = createSafeVehicleData(preparation.vehicleData, vehicle);
    
    return preparation;
  } catch (error) {
    console.error('❌ Erreur synchronisation vehicleData:', error.message);
    return preparation;
  }
};

/**
 * Valide l'intégrité des données d'une préparation
 * @param {Object} preparation - Document préparation
 * @returns {Object} Résultat de validation { isValid, errors }
 */
const validatePreparationIntegrity = (preparation) => {
  const errors = [];
  
  // Vérifier vehicleData
  if (!preparation.vehicleData) {
    errors.push('vehicleData manquant');
  } else {
    if (!preparation.vehicleData.licensePlate) {
      errors.push('vehicleData.licensePlate manquant');
    }
    if (!preparation.vehicleData.model) {
      errors.push('vehicleData.model manquant');
    }
    if (!preparation.vehicleData.vehicleType) {
      errors.push('vehicleData.vehicleType manquant');
    }
  }

  // Vérifier étapes
  if (!preparation.steps || !Array.isArray(preparation.steps)) {
    errors.push('steps manquant ou invalide');
  }

  // Vérifier statut
  if (!preparation.status) {
    errors.push('status manquant');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Répare automatiquement une préparation avec des données manquantes
 * @param {Object} preparation - Document préparation
 * @returns {Promise<Object>} Préparation réparée
 */
const repairPreparation = async (preparation) => {
  console.log(`🔧 Réparation préparation ${preparation._id}`);
  
  // Assurer compatibilité vehicleData
  const repairedPrep = ensureVehicleDataCompatibility(preparation);
  
  // Synchroniser avec véhicule si disponible
  const syncedPrep = await syncVehicleDataFromVehicle(repairedPrep);
  
  // Valider l'intégrité
  const validation = validatePreparationIntegrity(syncedPrep);
  
  if (!validation.isValid) {
    console.warn(`⚠️ Préparation ${preparation._id} encore invalide:`, validation.errors);
  } else {
    console.log(`✅ Préparation ${preparation._id} réparée avec succès`);
  }
  
  return syncedPrep;
};

module.exports = {
  ensureVehicleDataCompatibility,
  formatPreparationResponse,
  createSafeVehicleData,
  syncVehicleDataFromVehicle,
  validatePreparationIntegrity,
  repairPreparation
};