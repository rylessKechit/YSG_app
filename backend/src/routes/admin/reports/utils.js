// backend/src/routes/admin/reports/utils.js - UTILITAIRES COMMUNS
const ERROR_MESSAGES = {
  INVALID_PERIOD: 'Période invalide',
  INVALID_DATE_RANGE: 'Plage de dates invalide',
  NO_DATA: 'Aucune donnée disponible pour la période sélectionnée',
  SERVER_ERROR: 'Erreur interne du serveur',
  MODEL_NOT_FOUND: 'Modèle de données non disponible'
};

// ================================
// CALCULS DE DATES
// ================================

const getDateRange = (period, startDate, endDate) => {
  const now = new Date();
  let start, end;

  if (period === 'custom' && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        end = now;
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        end = now;
        break;
      case 'year':
        start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        end = now;
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        end = now;
    }
  }

  return { start, end };
};

// ================================
// CHARGEMENT SÉCURISÉ DES MODÈLES
// ================================

const loadModels = () => {
  const models = {};
  
  try {
    models.User = require('../../../models/User');
  } catch (error) {
    console.warn('⚠️ Model User non trouvé');
    models.User = null;
  }

  try {
    models.Agency = require('../../../models/Agency');
  } catch (error) {
    console.warn('⚠️ Model Agency non trouvé');
    models.Agency = null;
  }

  try {
    models.Timesheet = require('../../../models/Timesheet');
  } catch (error) {
    console.warn('⚠️ Model Timesheet non trouvé');
    models.Timesheet = null;
  }

  try {
    models.Preparation = require('../../../models/Preparation');
  } catch (error) {
    console.warn('⚠️ Model Preparation non trouvé');
    models.Preparation = null;
  }

  return models;
};

// ================================
// DONNÉES SIMULÉES (fallback)
// ================================

const generateMockData = (type, period) => {
  const { start, end } = getDateRange(period);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  switch (type) {
    case 'quick-metrics':
      return {
        punctuality: {
          rate: 85.5 + Math.random() * 10,
          trend: (Math.random() - 0.5) * 10
        },
        performance: {
          averageTime: 20 + Math.random() * 10,
          trend: (Math.random() - 0.5) * 5
        },
        activity: {
          totalHours: days * 8 * (0.8 + Math.random() * 0.4),
          trend: (Math.random() - 0.5) * 20
        }
      };
    
    case 'punctuality':
      const agencies = ['Paris Centre', 'Orly', 'Charles de Gaulle'];
      return {
        periode: {
          debut: start.toISOString().split('T')[0],
          fin: end.toISOString().split('T')[0],
          jours: days
        },
        global: {
          totalPointages: days * 20,
          ponctuelArrivees: Math.floor(days * 20 * 0.85),
          retards: Math.floor(days * 20 * 0.15),
          tauxPonctualite: 85.5,
          retardMoyen: 8.2,
          evolution: 2.3,
          objectif: 90
        },
        parAgence: agencies.map((name, index) => ({
          agenceId: `agency_${index + 1}`,
          nom: name,
          code: name.replace(/\s+/g, '').toUpperCase(),
          totalPointages: Math.floor(days * 7),
          ponctuelArrivees: Math.floor(days * 6),
          retards: Math.floor(days * 1),
          taux: 85 + Math.random() * 10,
          retardMoyen: 5 + Math.random() * 10,
          statut: Math.random() > 0.5 ? 'bon' : 'moyen'
        })),
        tendances: {
          parJourSemaine: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'].map(jour => ({
            jour,
            totalPointages: Math.floor(Math.random() * 20 + 10),
            retards: Math.floor(Math.random() * 5),
            taux: 80 + Math.random() * 15
          }))
        }
      };
    
    case 'performance':
      return {
        periode: {
          debut: start.toISOString().split('T')[0],
          fin: end.toISOString().split('T')[0]
        },
        global: {
          totalPreparations: days * 15,
          tempsMoyenGlobal: 22.5,
          objectifTemps: 25,
          tauxRespectObjectif: 78.5
        },
        parAgence: agencies.map((name, index) => ({
          agenceId: `agency_${index + 1}`,
          nom: name,
          totalPreparations: Math.floor(days * 5),
          tempsMoyen: 20 + Math.random() * 10,
          tempsMoyenObjectif: 25,
          tauxReussiteObjectif: 70 + Math.random() * 20,
          efficacite: Math.random() > 0.5 ? 'bon' : 'moyen'
        }))
      };
    
    case 'activity':
      return {
        periode: {
          debut: start.toISOString().split('T')[0],
          fin: end.toISOString().split('T')[0]
        },
        volumetrie: {
          totalJoursOuvres: days,
          joursAvecActivite: Math.floor(days * 0.8),
          totalHeures: days * 8 * 0.85,
          moyenneHeuresParJour: 6.8
        },
        repartition: {
          parAgence: agencies.map((name, index) => ({
            agenceId: `agency_${index + 1}`,
            nom: name,
            totalHeures: Math.floor(Math.random() * 100 + 50),
            pourcentageTotal: Math.floor(Math.random() * 40 + 20),
            moyenneParJour: Math.floor(Math.random() * 8 + 4),
            picActivite: `${Math.floor(Math.random() * 4 + 8)}h00`
          }))
        }
      };
    
    default:
      return null;
  }
};

// ================================
// VALIDATION DES PARAMÈTRES
// ================================

const validateFilters = (filters) => {
  const errors = [];
  
  if (filters.period === 'custom') {
    if (!filters.startDate || !filters.endDate) {
      errors.push('Dates de début et fin requises pour période personnalisée');
    } else {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      
      if (start >= end) {
        errors.push('La date de fin doit être postérieure à la date de début');
      }
      
      const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        errors.push('La période ne peut pas dépasser 365 jours');
      }
    }
  }
  
  return errors;
};

module.exports = {
  ERROR_MESSAGES,
  getDateRange,
  loadModels,
  generateMockData,
  validateFilters
};