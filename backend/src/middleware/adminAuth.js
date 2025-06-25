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
        message: ERROR_MESSAGES.TOKEN_REQUIRED
      });
    }

    // Vérifier que l'utilisateur a le rôle admin
    if (req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: ERROR_MESSAGES.ADMIN_REQUIRED
      });
    }

    next();

  } catch (error) {
    console.error('Erreur vérification admin:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
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
        message: ERROR_MESSAGES.TOKEN_REQUIRED
      });
    }

    // Seuls les préparateurs peuvent accéder (pas les admins pour ces routes spécifiques)
    if (req.user.role !== USER_ROLES.PREPARATEUR) {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux préparateurs'
      });
    }

    next();

  } catch (error) {
    console.error('Erreur vérification préparateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
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
        message: ERROR_MESSAGES.TOKEN_REQUIRED
      });
    }

    // Vérifier que c'est un rôle valide
    const validRoles = Object.values(USER_ROLES);
    if (!validRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Rôle utilisateur invalide'
      });
    }

    next();

  } catch (error) {
    console.error('Erreur vérification utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

/**
 * Middleware conditionnel basé sur le rôle
 * Permet différents niveaux d'accès selon le rôle
 */
const conditionalAuth = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: ERROR_MESSAGES.TOKEN_REQUIRED
        });
      }

      // Vérifier que le rôle est dans la liste autorisée
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.ACCESS_DENIED
        });
      }

      next();

    } catch (error) {
      console.error('Erreur vérification conditionnelle:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  };
};

module.exports = {
  adminAuth,
  preparateurAuth,
  anyUserAuth,
  conditionalAuth
};