// backend/src/middleware/adminAuth.js
// ✅ Middleware d'autorisation complet et corrigé

const { USER_ROLES, ERROR_MESSAGES } = require('../utils/constants');

/**
 * Middleware pour vérifier les droits administrateur
 * Doit être utilisé APRÈS le middleware auth
 */
const adminAuth = (req, res, next) => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_REQUIRED || 'Authentification requise'
      });
    }

    // Vérifier que l'utilisateur a le rôle admin
    if (req.user.role !== USER_ROLES.ADMIN && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: ERROR_MESSAGES.ADMIN_REQUIRED || 'Droits administrateur requis'
      });
    }

    console.log(`✅ Admin authentifié: ${req.user.email}`);
    next();

  } catch (error) {
    console.error('❌ Erreur vérification admin:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
};

/**
 * Middleware pour vérifier les droits de préparateur
 * Utilisé pour les routes spécifiques aux préparateurs
 */
const preparateurAuth = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_REQUIRED || 'Authentification requise'
      });
    }

    // Seuls les préparateurs peuvent accéder (pas les admins pour ces routes spécifiques)
    if (req.user.role !== USER_ROLES.PREPARATEUR && req.user.role !== 'preparateur') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux préparateurs'
      });
    }

    console.log(`✅ Préparateur authentifié: ${req.user.email}`);
    next();

  } catch (error) {
    console.error('❌ Erreur vérification préparateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
};

/**
 * Middleware pour autoriser admins ET préparateurs
 * Utilisé pour les routes communes
 */
const anyUserAuth = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_REQUIRED || 'Authentification requise'
      });
    }

    // Vérifier que c'est un rôle valide
    const validRoles = ['admin', 'preparateur'];
    if (!validRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Rôle utilisateur invalide'
      });
    }

    console.log(`✅ Utilisateur authentifié: ${req.user.email} (${req.user.role})`);
    next();

  } catch (error) {
    console.error('❌ Erreur vérification utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
};

/**
 * Middleware conditionnel basé sur le rôle
 * Permet différents niveaux d'accès selon le rôle
 * @param {Array} allowedRoles - Rôles autorisés ['admin', 'preparateur']
 */
const conditionalAuth = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: ERROR_MESSAGES.TOKEN_REQUIRED || 'Authentification requise'
        });
      }

      // Vérifier que le rôle est dans la liste autorisée
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.ACCESS_DENIED || `Accès refusé. Rôles autorisés: ${allowedRoles.join(', ')}`
        });
      }

      console.log(`✅ Accès autorisé pour ${req.user.email} (${req.user.role})`);
      next();

    } catch (error) {
      console.error('❌ Erreur vérification conditionnelle:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
      });
    }
  };
};

/**
 * Middleware pour vérifier l'accès aux données d'agence
 * Les admins ont accès à toutes les agences
 * Les préparateurs seulement à leurs agences assignées
 */
const agencyAccessAuth = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_REQUIRED || 'Authentification requise'
      });
    }

    // Les admins ont accès à toutes les agences
    if (req.user.role === 'admin') {
      return next();
    }

    // Pour les préparateurs, vérifier l'accès à l'agence
    const agencyId = req.params.agencyId || req.body.agencyId || req.query.agencyId;
    
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'agence requis'
      });
    }

    // Vérifier que le préparateur a accès à cette agence
    const hasAccess = req.user.agencies?.some(
      agency => agency._id.toString() === agencyId.toString()
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED || 'Accès refusé à cette agence'
      });
    }

    next();

  } catch (error) {
    console.error('❌ Erreur vérification accès agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
};

/**
 * Middleware pour vérifier l'accès aux données utilisateur
 * Les admins peuvent voir tous les utilisateurs
 * Les préparateurs seulement leurs propres données
 */
const userDataAccessAuth = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_REQUIRED || 'Authentification requise'
      });
    }

    // Les admins ont accès à tous les utilisateurs
    if (req.user.role === 'admin') {
      return next();
    }

    // Pour les préparateurs, vérifier qu'ils accèdent à leurs propres données
    const targetUserId = req.params.userId || req.params.id || req.body.userId;
    
    if (targetUserId && req.user.userId.toString() !== targetUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED || 'Accès refusé aux données d\'un autre utilisateur'
      });
    }

    next();

  } catch (error) {
    console.error('❌ Erreur vérification accès données utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
};

module.exports = {
  adminAuth,
  preparateurAuth,
  anyUserAuth,
  conditionalAuth,
  agencyAccessAuth,
  userDataAccessAuth
};