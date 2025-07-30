// ===== SERVICE DE DONNÉES POUR RAPPORTS =====
// backend/src/services/reports/dataService.js

const Timesheet = require('../../models/Timesheet');
const User = require('../../models/User');
const Agency = require('../../models/Agency');
const Schedule = require('../../models/Schedule');
const Preparation = require('../../models/Preparation');
const Vehicle = require('../../models/Vehicle');

/**
 * Service pour récupérer et traiter les données des rapports
 */
class DataService {

  /**
   * ✅ Récupérer les préparations du jour par agence
   */
  async getDailyPreparations(date = new Date()) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    try {
      // Récupérer toutes les préparations du jour avec relations complètes
      const preparations = await Preparation.find({
        startTime: { $gte: dayStart, $lte: dayEnd }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .populate({
        path: 'vehicle',
        select: 'licensePlate brand model vehicleType'
      })
      .lean();

      console.log(`🚗 ${preparations.length} préparation(s) trouvée(s) pour le ${date.toLocaleDateString('fr-FR')}`);

      // Grouper par agence
      const preparationsByAgency = {};
      
      preparations.forEach(prep => {
        // Gestion du véhicule (ObjectId ou objet intégré)
        let vehicleInfo = {};
        if (prep.vehicle) {
          if (typeof prep.vehicle === 'object' && prep.vehicle.licensePlate) {
            vehicleInfo = {
              licensePlate: prep.vehicle.licensePlate,
              brand: prep.vehicle.brand,
              model: prep.vehicle.model,
              vehicleType: prep.vehicle.vehicleType || 'particulier'
            };
          } else if (prep.vehicleInfo) {
            vehicleInfo = {
              licensePlate: prep.vehicleInfo.licensePlate,
              brand: prep.vehicleInfo.brand,
              model: prep.vehicleInfo.model,
              vehicleType: prep.vehicleInfo.vehicleType || 'particulier'
            };
          }
        }

        const agencyKey = prep.agency ? prep.agency._id.toString() : 'unknown';
        
        if (!preparationsByAgency[agencyKey]) {
          preparationsByAgency[agencyKey] = {
            agencyInfo: prep.agency || { name: 'Agence inconnue', code: 'N/A', client: 'N/A' },
            preparations: [],
            totalPreparations: 0,
            completedPreparations: 0,
            inProgressPreparations: 0
          };
        }

        const prepData = {
          id: prep._id,
          vehicle: vehicleInfo,
          user: prep.user ? {
            firstName: prep.user.firstName,
            lastName: prep.user.lastName,
            email: prep.user.email
          } : null,
          startTime: prep.startTime,
          endTime: prep.endTime,
          status: prep.status,
          duration: prep.endTime && prep.startTime ? 
            Math.round((new Date(prep.endTime) - new Date(prep.startTime)) / (1000 * 60)) : null,
          stepsCompleted: prep.steps ? prep.steps.filter(s => s.completed).length : 0,
          totalSteps: prep.steps ? prep.steps.length : 0
        };

        preparationsByAgency[agencyKey].preparations.push(prepData);
        preparationsByAgency[agencyKey].totalPreparations++;
        
        if (prep.status === 'completed') {
          preparationsByAgency[agencyKey].completedPreparations++;
        } else if (prep.status === 'in_progress') {
          preparationsByAgency[agencyKey].inProgressPreparations++;
        }
      });

      return preparationsByAgency;
    } catch (error) {
      console.error('❌ Erreur récupération préparations quotidiennes:', error);
      return {};
    }
  }

  /**
   * ✅ Récupérer les préparations hebdomadaires avec statistiques détaillées
   */
  async getWeeklyPreparations(startDate, endDate) {
    try {
      console.log(`🗓️ Récupération préparations semaine: ${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`);

      const preparations = await Preparation.find({
        startTime: { $gte: startDate, $lte: endDate }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .populate({
        path: 'vehicle',
        select: 'licensePlate brand model vehicleType'
      })
      .lean();

      console.log(`🚗 ${preparations.length} préparation(s) trouvée(s) pour la semaine`);

      // Grouper par agence
      const preparationsByAgency = {};
      // Grouper par employé
      const preparationsByEmployee = {};

      preparations.forEach(prep => {
        // Gestion véhicule avec type
        let vehicleInfo = {};
        let vehicleType = 'particulier'; // défaut
        
        if (prep.vehicle) {
          if (typeof prep.vehicle === 'object' && prep.vehicle.licensePlate) {
            vehicleInfo = {
              licensePlate: prep.vehicle.licensePlate,
              brand: prep.vehicle.brand,
              model: prep.vehicle.model,
              vehicleType: prep.vehicle.vehicleType || 'particulier'
            };
            vehicleType = prep.vehicle.vehicleType || 'particulier';
          } else if (prep.vehicleInfo) {
            vehicleInfo = {
              licensePlate: prep.vehicleInfo.licensePlate,
              brand: prep.vehicleInfo.brand,
              model: prep.vehicleInfo.model,
              vehicleType: prep.vehicleInfo.vehicleType || 'particulier'
            };
            vehicleType = prep.vehicleInfo.vehicleType || 'particulier';
          }
        }

        // ✅ Analyser les étapes complétées
        const stepsAnalysis = {
          exterior: false,
          interior: false,
          fuel: false,
          special_wash: false,
        };

        if (prep.steps && Array.isArray(prep.steps)) {
          prep.steps.forEach(step => {
            if (step.completed && stepsAnalysis.hasOwnProperty(step.step)) {
              stepsAnalysis[step.step] = true;
            }
          });
        }

        const prepData = {
          id: prep._id,
          date: prep.startTime.toLocaleDateString('fr-FR'),
          vehicle: vehicleInfo,
          vehicleType, // ✅ Type de véhicule
          agency: prep.agency ? {
            name: prep.agency.name,
            code: prep.agency.code,
            client: prep.agency.client
          } : null,
          user: prep.user ? {
            firstName: prep.user.firstName,
            lastName: prep.user.lastName,
            email: prep.user.email
          } : null,
          startTime: prep.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          endTime: prep.endTime ? prep.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'En cours',
          status: prep.status,
          duration: prep.endTime && prep.startTime ? 
            Math.round((new Date(prep.endTime) - new Date(prep.startTime)) / (1000 * 60)) : null,
          stepsCompleted: prep.steps ? prep.steps.filter(s => s.completed).length : 0,
          totalSteps: prep.steps ? prep.steps.length : 0,
          stepsAnalysis // ✅ Détail des étapes
        };

        // Groupement par agence avec statistiques détaillées
        const agencyKey = prep.agency ? prep.agency._id.toString() : 'unknown';
        if (!preparationsByAgency[agencyKey]) {
          preparationsByAgency[agencyKey] = {
            agencyInfo: prep.agency || { name: 'Agence inconnue', code: 'N/A', client: 'N/A' },
            preparations: [],
            totalPreparations: 0,
            completedPreparations: 0,
            averageDuration: 0,
            totalDuration: 0,
            
            // ✅ Statistiques détaillées par type d'étape
            stepStats: {
              exterior: 0,      // Préparations extérieures
              interior: 0,      // Préparations intérieures  
              fuel: 0,          // Préparations carburant
              special_wash: 0   // Préparations spéciales (lavage)
            },
            
            // ✅ Statistiques par type de véhicule
            vehicleStats: {
              particulier: 0,   // Véhicules particuliers
              utilitaire: 0     // Véhicules utilitaires
            }
          };
        }

        preparationsByAgency[agencyKey].preparations.push(prepData);
        preparationsByAgency[agencyKey].totalPreparations++;
        
        if (prep.status === 'completed') {
          preparationsByAgency[agencyKey].completedPreparations++;
        }
        
        if (prepData.duration) {
          preparationsByAgency[agencyKey].totalDuration += prepData.duration;
        }

        // ✅ Compter les étapes par type
        if (stepsAnalysis.exterior) preparationsByAgency[agencyKey].stepStats.exterior++;
        if (stepsAnalysis.interior) preparationsByAgency[agencyKey].stepStats.interior++;
        if (stepsAnalysis.fuel) preparationsByAgency[agencyKey].stepStats.fuel++;
        if (stepsAnalysis.special_wash) preparationsByAgency[agencyKey].stepStats.special_wash++;

        // ✅ Compter les véhicules par type
        if (vehicleType === 'particulier') {
          preparationsByAgency[agencyKey].vehicleStats.particulier++;
        } else if (vehicleType === 'utilitaire') {
          preparationsByAgency[agencyKey].vehicleStats.utilitaire++;
        }

        // Groupement par employé (seulement ceux qui ont fait au moins une préparation)
        const userKey = prep.user ? prep.user._id.toString() : 'unknown';
        if (prep.user) {
          if (!preparationsByEmployee[userKey]) {
            preparationsByEmployee[userKey] = {
              userInfo: {
                firstName: prep.user.firstName,
                lastName: prep.user.lastName,
                email: prep.user.email
              },
              preparations: [],
              totalPreparations: 0,
              completedPreparations: 0,
              averageDuration: 0,
              totalDuration: 0,
              agenciesWorked: new Set(),
              
              // ✅ Stats employé par type d'étape
              stepStats: {
                exterior: 0,
                interior: 0,
                fuel: 0,
                special_wash: 0
              },
              
              // ✅ Stats employé par type de véhicule
              vehicleStats: {
                particulier: 0,
                utilitaire: 0
              }
            };
          }
          
          preparationsByEmployee[userKey].preparations.push(prepData);
          preparationsByEmployee[userKey].totalPreparations++;
          
          if (prep.status === 'completed') {
            preparationsByEmployee[userKey].completedPreparations++;
          }
          
          if (prepData.duration) {
            preparationsByEmployee[userKey].totalDuration += prepData.duration;
          }
          
          if (prep.agency) {
            preparationsByEmployee[userKey].agenciesWorked.add(prep.agency.name);
          }

          // ✅ Stats employé
          if (stepsAnalysis.exterior) preparationsByEmployee[userKey].stepStats.exterior++;
          if (stepsAnalysis.interior) preparationsByEmployee[userKey].stepStats.interior++;
          if (stepsAnalysis.fuel) preparationsByEmployee[userKey].stepStats.fuel++;
          if (stepsAnalysis.special_wash) preparationsByEmployee[userKey].stepStats.special_wash++;

          if (vehicleType === 'particulier') {
            preparationsByEmployee[userKey].vehicleStats.particulier++;
          } else if (vehicleType === 'utilitaire') {
            preparationsByEmployee[userKey].vehicleStats.utilitaire++;
          }
        }
      });

      // Calculer les moyennes
      Object.values(preparationsByAgency).forEach(agency => {
        if (agency.completedPreparations > 0) {
          agency.averageDuration = Math.round(agency.totalDuration / agency.completedPreparations);
        }
      });

      Object.values(preparationsByEmployee).forEach(employee => {
        if (employee.completedPreparations > 0) {
          employee.averageDuration = Math.round(employee.totalDuration / employee.completedPreparations);
        }
        // Convertir Set en Array pour l'export
        employee.agenciesWorked = Array.from(employee.agenciesWorked);
      });

      return {
        byAgency: preparationsByAgency,
        byEmployee: preparationsByEmployee
      };
    } catch (error) {
      console.error('❌ Erreur récupération préparations hebdomadaires:', error);
      return { byAgency: {}, byEmployee: {} };
    }
  }

  /**
   * ✅ Récupérer toutes les données du jour avec préparations
   */
  async getDailyData(date = new Date()) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    try {
      // 1. Tous les employés actifs avec leurs agences
      const employees = await User.find({ 
        role: 'preparateur',
        isActive: true 
      })
      .populate('agencies', 'name code client')
      .lean();

      // 2. Tous les plannings du jour
      const schedules = await Schedule.find({
        date: { $gte: dayStart, $lte: dayEnd }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .lean();

      // 3. Tous les pointages du jour
      const timesheets = await Timesheet.find({
        date: { $gte: dayStart, $lte: dayEnd }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .populate('schedule')
      .lean();

      // 4. Récupérer les préparations du jour
      const preparationsByAgency = await this.getDailyPreparations(date);

      // 5. Calculer les statistiques
      const stats = this.calculateDailyStats(schedules, timesheets, employees, preparationsByAgency);

      return {
        date: date.toLocaleDateString('fr-FR'),
        employees,
        schedules,
        timesheets,
        preparationsByAgency,
        stats
      };
    } catch (error) {
      console.error('❌ Erreur récupération données quotidiennes:', error);
      throw error;
    }
  }

  /**
   * ✅ Récupérer toutes les données hebdomadaires
   */
  async getWeeklyData(startDate, endDate) {
    try {
      // 1. Récupérer les préparations de la semaine
      const weeklyPreparations = await this.getWeeklyPreparations(startDate, endDate);
      
      // 2. Récupérer les données de pointage pour comparaison
      const timesheets = await Timesheet.find({
        date: { $gte: startDate, $lte: endDate }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .lean();

      const schedules = await Schedule.find({
        date: { $gte: startDate, $lte: endDate }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .lean();

      // 3. Calculer les statistiques hebdomadaires
      const stats = this.calculateWeeklyStats(schedules, timesheets, weeklyPreparations);

      return {
        preparationsByAgency: weeklyPreparations.byAgency,
        preparationsByEmployee: weeklyPreparations.byEmployee,
        stats
      };
    } catch (error) {
      console.error('❌ Erreur récupération données hebdomadaires:', error);
      throw error;
    }
  }

  /**
   * ✅ Calcul des statistiques quotidiennes avec préparations
   */
  calculateDailyStats(schedules, timesheets, employees, preparationsByAgency) {
    const stats = {
      totalEmployes: schedules.length,
      presentsCount: timesheets.filter(ts => ts.startTime).length,
      absentCount: 0,
      retardsCount: 0,
      ponctualiteRate: 0,
      presenceRate: 0,
      heuresMoyennes: 0,
      
      // Statistiques préparations
      totalPreparations: 0,
      preparationsCompleted: 0,
      preparationsInProgress: 0,
      preparationsByAgencyCount: Object.keys(preparationsByAgency).length,
      averagePreparationTime: 0
    };

    // Calculs existants...
    stats.absentCount = stats.totalEmployes - stats.presentsCount;
    stats.presenceRate = stats.totalEmployes > 0 ? 
      Math.round((stats.presentsCount / stats.totalEmployes) * 100) : 0;

    // Calcul retards et ponctualité
    let punctualCount = 0;
    schedules.forEach(schedule => {
      const timesheet = timesheets.find(ts => 
        ts.user._id.toString() === schedule.user._id.toString() &&
        ts.agency._id.toString() === schedule.agency._id.toString()
      );

      if (timesheet && timesheet.startTime && schedule.startTime) {
        const [schedHour, schedMin] = schedule.startTime.split(':').map(Number);
        const scheduledTime = new Date(schedule.date);
        scheduledTime.setHours(schedHour, schedMin, 0, 0);

        const actualTime = new Date(timesheet.startTime);
        const delayMinutes = Math.max(0, (actualTime - scheduledTime) / (1000 * 60));

        if (delayMinutes > 15) {
          stats.retardsCount++;
        } else {
          punctualCount++;
        }
      }
    });

    stats.ponctualiteRate = stats.presentsCount > 0 ? 
      Math.round((punctualCount / stats.presentsCount) * 100) : 0;

    // Calculs préparations
    Object.values(preparationsByAgency).forEach(agency => {
      stats.totalPreparations += agency.totalPreparations;
      stats.preparationsCompleted += agency.completedPreparations;
      stats.preparationsInProgress += agency.inProgressPreparations;
    });

    // Calcul temps moyen préparations
    const completedPreps = [];
    Object.values(preparationsByAgency).forEach(agency => {
      agency.preparations.forEach(prep => {
        if (prep.duration && prep.status === 'completed') {
          completedPreps.push(prep.duration);
        }
      });
    });

    if (completedPreps.length > 0) {
      stats.averagePreparationTime = Math.round(
        completedPreps.reduce((sum, duration) => sum + duration, 0) / completedPreps.length
      );
    }

    return stats;
  }

  /**
   * ✅ Calculer les statistiques hebdomadaires
   */
  calculateWeeklyStats(schedules, timesheets, weeklyPreparations) {
    const stats = {
      totalSchedules: schedules.length,
      totalTimesheets: timesheets.length,
      totalPreparations: 0,
      completedPreparations: 0,
      averagePreparationTime: 0,
      agenciesCount: Object.keys(weeklyPreparations.byAgency).length,
      employeesWithPreparationsCount: Object.keys(weeklyPreparations.byEmployee).length
    };

    // Calculs préparations
    Object.values(weeklyPreparations.byAgency).forEach(agency => {
      stats.totalPreparations += agency.totalPreparations;
      stats.completedPreparations += agency.completedPreparations;
    });

    // Calcul temps moyen
    const allDurations = [];
    Object.values(weeklyPreparations.byEmployee).forEach(employee => {
      employee.preparations.forEach(prep => {
        if (prep.duration && prep.status === 'completed') {
          allDurations.push(prep.duration);
        }
      });
    });

    if (allDurations.length > 0) {
      stats.averagePreparationTime = Math.round(
        allDurations.reduce((sum, duration) => sum + duration, 0) / allDurations.length
      );
    }

    return stats;
  }
}

module.exports = new DataService();