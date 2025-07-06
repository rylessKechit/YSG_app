// backend/src/routes/admin/schedules/calendar.js - VERSION SIMPLE

const express = require('express');
const Joi = require('joi');
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery, objectId } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION =====
const calendarQuerySchema = Joi.object({
  year: Joi.number().integer().min(2020).max(2030).optional(),
  month: Joi.alternatives().try(
    Joi.number().integer().min(1).max(12),
    Joi.string().pattern(/^\d{4}-\d{2}$/)
  ).optional(),
  view: Joi.string().valid('month', 'week', 'day').default('month'),
  agencies: Joi.alternatives().try(
    Joi.array().items(objectId),
    Joi.string().allow('')
  ).optional(),
  users: Joi.alternatives().try(
    Joi.array().items(objectId),
    Joi.string().allow('')
  ).optional()
});

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/schedules/calendar
 * @desc    Vue calendaire des plannings
 * @access  Admin
 */
router.get('/', validateQuery(calendarQuerySchema), async (req, res) => {
  try {
    let { year, month, view = 'month', agencies = [], users = [] } = req.query;
    
    // Gérer les différents formats de date
    let yearNum, monthNum;
    
    if (typeof month === 'string' && month.includes('-')) {
      [yearNum, monthNum] = month.split('-').map(Number);
    } else {
      yearNum = year || new Date().getFullYear();
      monthNum = month || new Date().getMonth() + 1;
    }

    // Validation des dates
    if (!yearNum || !monthNum || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Année et mois requis (format: year=2025&month=6 ou month=2025-06)'
      });
    }

    // Gérer les filtres
    if (typeof agencies === 'string') {
      agencies = agencies ? agencies.split(',') : [];
    }
    if (typeof users === 'string') {
      users = users ? users.split(',') : [];
    }

    // Calculer les dates du mois
    const startOfMonth = new Date(yearNum, monthNum - 1, 1);
    const endOfMonth = new Date(yearNum, monthNum, 0);
    
    // Pour la vue calendaire, inclure les jours de la semaine précédente/suivante
    const startOfCalendar = new Date(startOfMonth);
    startOfCalendar.setDate(startOfCalendar.getDate() - startOfCalendar.getDay() + 1); // Lundi
    
    const endOfCalendar = new Date(endOfMonth);
    endOfCalendar.setDate(endOfCalendar.getDate() + (7 - endOfCalendar.getDay())); // Dimanche

    // Construire le filtre
    const filter = {
      date: {
        $gte: startOfCalendar,
        $lte: endOfCalendar
      }
    };

    if (agencies.length > 0) filter.agency = { $in: agencies };
    if (users.length > 0) filter.user = { $in: users };

    // Récupérer les plannings
    const schedules = await Schedule.find(filter)
      .populate('user', 'firstName lastName')
      .populate('agency', 'name code')
      .sort({ date: 1, startTime: 1 });

    // ===== FIX TIMEZONE: Gérer les dates en local, pas UTC =====
    const calendarData = [];
    const currentDateIterator = new Date(startOfCalendar); // ✅ FIX: Renommer la variable

    while (currentDateIterator <= endOfCalendar) {
      // ✅ CORRECTION: Utiliser des dates en local timezone
      const dateKey = currentDateIterator.getFullYear() + '-' + 
                     String(currentDateIterator.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(currentDateIterator.getDate()).padStart(2, '0');
      
      // Trouver les plannings de ce jour (comparaison par dateKey, pas par date ISO)
      const daySchedules = schedules.filter(schedule => {
        // ✅ CORRECTION: Comparer les dates en local timezone
        const scheduleDate = new Date(schedule.date);
        const scheduleDateKey = scheduleDate.getFullYear() + '-' + 
                               String(scheduleDate.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(scheduleDate.getDate()).padStart(2, '0');
        return scheduleDateKey === dateKey;
      });

      // Calculer les stats du jour
      const totalHours = daySchedules.reduce((sum, schedule) => {
        if (schedule.startTime && schedule.endTime) {
          const [startHour, startMin] = schedule.startTime.split(':').map(Number);
          const [endHour, endMin] = schedule.endTime.split(':').map(Number);
          const workMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin) - (schedule.breakDuration || 30);
          return sum + (workMinutes > 0 ? workMinutes / 60 : 0);
        }
        return sum;
      }, 0);

      const agencyIds = new Set(daySchedules
        .filter(s => s.agency) // ✅ Filtrer les schedules sans agence
        .map(s => s.agency._id.toString()));

      calendarData.push({
        date: new Date(currentDateIterator.getFullYear(), currentDateIterator.getMonth(), currentDateIterator.getDate()), // ✅ Date locale
        dateKey,
        isCurrentMonth: currentDateIterator.getMonth() === monthNum - 1,
        isToday: dateKey === new Date().getFullYear() + '-' + 
                           String(new Date().getMonth() + 1).padStart(2, '0') + '-' + 
                           String(new Date().getDate()).padStart(2, '0'),
        schedules: daySchedules
          .filter(schedule => schedule.user && schedule.agency) // ✅ Filtrer les schedules avec données manquantes
          .map(schedule => ({
            id: schedule._id,
            user: {
              id: schedule.user._id,
              name: `${schedule.user.firstName} ${schedule.user.lastName}`
            },
            agency: {
              id: schedule.agency._id,
              name: schedule.agency.name,
              code: schedule.agency.code
            },
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            notes: schedule.notes
          })),
        stats: {
          totalSchedules: daySchedules.length,
          totalHours: Math.round(totalHours * 100) / 100,
          agencies: agencyIds.size
        }
      });

      currentDateIterator.setDate(currentDateIterator.getDate() + 1); // ✅ FIX: Utiliser la bonne variable
    }

    // Organiser en semaines
    const weeks = [];
    for (let i = 0; i < calendarData.length; i += 7) {
      weeks.push({
        weekNumber: Math.floor(i / 7) + 1,
        days: calendarData.slice(i, i + 7)
      });
    }

    // Métadonnées
    const metadata = {
      month: {
        year: yearNum,
        month: monthNum,
        name: new Date(yearNum, monthNum - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        totalDays: endOfMonth.getDate(),
        startDate: startOfMonth,
        endDate: endOfMonth
      },
      calendar: {
        startDate: startOfCalendar,
        endDate: endOfCalendar,
        totalDays: calendarData.length
      },
      summary: {
        totalSchedules: schedules.length,
        totalUsers: new Set(schedules
          .filter(s => s.user) // ✅ Filtrer les schedules sans user
          .map(s => s.user._id.toString())).size,
        totalAgencies: new Set(schedules
          .filter(s => s.agency) // ✅ Filtrer les schedules sans agency
          .map(s => s.agency._id.toString())).size
      }
    };

    res.json({
      success: true,
      data: {
        calendar: weeks,
        metadata,
        view,
        filters: { agencies, users }
      }
    });

  } catch (error) {
    console.error('Erreur calendar plannings:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur lors de la génération du calendrier'
    });
  }
});

module.exports = router;