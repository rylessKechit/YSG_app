// backend/src/types/preparation.js

/**
 * Types et interfaces pour les préparations
 */

const { PREPARATION_STATUS, PREPARATION_STEPS } = require('../utils/constants');

/**
 * Structure d'une étape de préparation
 */
const PreparationStep = {
  step: String, // Valeur de PREPARATION_STEPS
  completed: Boolean,
  completedAt: Date,
  notes: String,
  photos: [String] // URLs Cloudinary
};

/**
 * Structure d'un historique de changement d'agence
 */
const AgencyChangeHistory = {
  fromAgency: {
    id: String,
    name: String,
    code: String
  },
  toAgency: {
    id: String,
    name: String,
    code: String
  },
  changedBy: {
    id: String,
    name: String,
    email: String
  },
  reason: String,
  changedAt: Date
};

/**
 * Structure d'un problème/incident
 */
const PreparationIssue = {
  type: String, // 'damage', 'missing_item', 'technical', 'other'
  severity: String, // 'low', 'medium', 'high', 'critical'
  description: String,
  photos: [String],
  reportedAt: Date,
  resolvedAt: Date,
  resolution: String
};

/**
 * Structure d'une modification admin
 */
const AdminModification = {
  modifiedBy: {
    id: String,
    name: String,
    email: String
  },
  modifiedAt: Date,
  type: String, // 'steps_modification', 'agency_change', 'status_change'
  previousSteps: [{
    step: String,
    completed: Boolean,
    notes: String
  }],
  newSteps: [{
    step: String,
    completed: Boolean,
    notes: String
  }],
  adminNotes: String,
  changes: {
    added: [Object],
    removed: [Object],
    modified: [Object]
  }
};

/**
 * Structure complète d'une préparation
 */
const PreparationStructure = {
  // Relations
  user: 'ObjectId', // Référence vers User
  agency: 'ObjectId', // Référence vers Agency
  vehicle: 'ObjectId', // Référence vers Vehicle
  
  // Statut et timing
  status: String, // Valeur de PREPARATION_STATUS
  startTime: Date,
  endTime: Date,
  totalTime: Number, // en minutes
  
  // Étapes
  steps: [PreparationStep],
  
  // Historique et tracking
  agencyHistory: [AgencyChangeHistory],
  adminModifications: [AdminModification], // AJOUT
  issues: [PreparationIssue],
  notes: String,
  
  // Métadonnées
  createdAt: Date,
  updatedAt: Date,
  
  // Propriétés virtuelles (calculées)
  progress: Number, // Pourcentage de complétion
  currentDuration: Number, // Durée actuelle en minutes
  isOnTime: Boolean // Respect du délai de 30min
};

/**
 * Filtres pour la recherche de préparations
 */
const PreparationFilters = {
  // Pagination
  page: Number,
  limit: Number,
  
  // Recherche textuelle
  search: String,
  
  // Filtres principaux
  user: String, // ID utilisateur
  agency: String, // ID agence
  status: String, // Statut ou 'all'
  
  // Filtres temporels
  startDate: Date,
  endDate: Date,
  
  // Tri
  sort: String, // Champ de tri
  order: String // 'asc' ou 'desc'
};

/**
 * Statistiques des préparations
 */
const PreparationStats = {
  global: {
    totalPreparations: Number,
    averageTime: Number, // en minutes
    onTimeRate: Number, // pourcentage
    completionRate: Number // pourcentage
  },
  byStatus: {
    pending: Number,
    in_progress: Number,
    completed: Number,
    cancelled: Number
  },
  byAgency: [{
    agency: {
      id: String,
      name: String,
      code: String
    },
    count: Number,
    averageTime: Number,
    onTimeRate: Number
  }],
  topUsers: [{
    user: {
      id: String,
      name: String,
      email: String
    },
    count: Number,
    averageTime: Number,
    onTimeRate: Number
  }]
};

/**
 * Réponse API pour la liste des préparations
 */
const PreparationListResponse = {
  success: Boolean,
  data: {
    preparations: [{
      id: String,
      vehicle: {
        id: String,
        licensePlate: String,
        model: String,
        brand: String
      },
      user: {
        id: String,
        name: String,
        email: String
      },
      agency: {
        id: String,
        name: String,
        code: String,
        client: String
      },
      status: String,
      progress: Number,
      duration: Number,
      totalTime: Number,
      isOnTime: Boolean,
      startTime: Date,
      endTime: Date,
      steps: [{
        step: String,
        completed: Boolean,
        completedAt: Date,
        notes: String,
        photosCount: Number
      }],
      issues: [PreparationIssue],
      notes: String,
      createdAt: Date,
      updatedAt: Date
    }],
    pagination: {
      page: Number,
      limit: Number,
      total: Number,
      pages: Number,
      hasNext: Boolean,
      hasPrev: Boolean
    },
    filters: PreparationFilters,
    stats: {
      total: Number,
      pending: Number,
      inProgress: Number,
      completed: Number,
      cancelled: Number
    }
  }
};

/**
 * Réponse API pour le détail d'une préparation
 */
const PreparationDetailResponse = {
  success: Boolean,
  data: {
    preparation: {
      id: String,
      vehicle: {
        id: String,
        licensePlate: String,
        model: String,
        brand: String,
        year: Number,
        color: String,
        condition: String
      },
      user: {
        id: String,
        name: String,
        email: String,
        phone: String
      },
      agency: {
        id: String,
        name: String,
        code: String,
        client: String,
        address: String
      },
      status: String,
      progress: Number,
      duration: Number,
      totalTime: Number,
      isOnTime: Boolean,
      startTime: Date,
      endTime: Date,
      steps: [{
        step: String,
        completed: Boolean,
        completedAt: Date,
        notes: String,
        photos: [String]
      }],
      issues: [PreparationIssue],
      notes: String,
      agencyHistory: [AgencyChangeHistory],
      createdAt: Date,
      updatedAt: Date
    }
  }
};

/**
 * Réponse API pour la modification d'agence
 */
const UpdateAgencyResponse = {
  success: Boolean,
  message: String,
  data: {
    preparation: {
      id: String,
      agency: {
        id: String,
        name: String,
        code: String,
        client: String
      },
      agencyHistory: [AgencyChangeHistory]
    },
    change: AgencyChangeHistory
  }
};

/**
 * Réponse API pour les statistiques
 */
const PreparationStatsResponse = {
  success: Boolean,
  data: {
    stats: PreparationStats,
    period: {
      startDate: Date,
      endDate: Date
    },
    filters: {
      agency: String
    }
  }
};

module.exports = {
  PreparationStep,
  AgencyChangeHistory,
  AdminModification,
  PreparationIssue,
  PreparationStructure,
  PreparationFilters,
  PreparationStats,
  PreparationListResponse,
  PreparationDetailResponse,
  UpdateAgencyResponse,
  PreparationStatsResponse
};