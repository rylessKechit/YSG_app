// backend/src/middleware/auth.js
// ✅ Middleware d'authentification complet et corrigé

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ERROR_MESSAGES } = require('../utils/constants');

/**
 * Middleware principal d'authentification
 * Vérifie le token JWT et charge les données utilisateur
 */
const auth = async (req, res, next) => {
  try {
    // Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_REQUIRED || 'Token d\'authentification requis'
      });
    }

    // Vérifier le format "Bearer TOKEN"
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_INVALID || 'Format de token invalide'
      });
    }

    // Extraire le token
    const token = authHeader.substring(7); // Enlever "Bearer "
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_REQUIRED || 'Token manquant'
      });
    }

    // Vérifier la présence de la clé secrète
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET non défini dans les variables d\'environnement');
      return res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur de configuration serveur'
      });
    }

    // Décoder et vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_INVALID || 'Token invalide'
      });
    }

    // Récupérer l'utilisateur depuis la base de données
    const user = await User.findById(decoded.userId)
      .populate('agencies', 'name code client workingHours isActive')
      .select('-password'); // Exclure le mot de passe

    if (!user) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND || 'Utilisateur non trouvé'
      });
    }

    // Vérifier que l'utilisateur est actif
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.ACCOUNT_DISABLED || 'Compte désactivé'
      });
    }

    // Attacher les informations utilisateur à la requête
    req.user = {
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      agencies: user.agencies || [],
      isActive: user.isActive,
      fullUser: user // Référence complète si nécessaire
    };

    console.log(`✅ Utilisateur authentifié: ${user.email} (${user.role})`);
    next();

  } catch (error) {
    console.error('❌ Erreur authentification:', error);

    // Gestion spécifique des erreurs JWT
    if (error.name === 'JsonWebTokenError') {
      console.error('Token JWT invalide:', {
        message: error.message,
        hasSecret: !!process.env.JWT_SECRET,
        jwtSecretLength: process.env.JWT_SECRET?.length || 0
      });
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_INVALID || 'Token invalide'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_EXPIRED || 'Token expiré'
      });
    }

    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_INVALID || 'Token non encore valide'
      });
    }

    // Erreur générique
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
};

/**
 * Middleware d'authentification optionnelle
 * Charge les données utilisateur si un token est fourni, sinon continue
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Pas de token, on continue sans utilisateur
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next();
    }

    // Essayer de décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .populate('agencies', 'name code client workingHours isActive')
      .select('-password');

    if (user && user.isActive) {
      req.user = {
        userId: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        agencies: user.agencies || [],
        isActive: user.isActive,
        fullUser: user
      };
    }

    next();

  } catch (error) {
    // En cas d'erreur avec le token optionnel, on continue sans utilisateur
    console.log('Token optionnel invalide, continuation sans auth');
    next();
  }
};

/**
 * Middleware pour vérifier l'accès à une agence spécifique
 */
const checkAgencyAccess = (req, res, next) => {
  try {
    const agencyId = req.params.agencyId || req.body.agencyId || req.query.agencyId;
    
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'agence requis'
      });
    }

    // Les admins ont accès à toutes les agences
    if (req.user.role === 'admin') {
      return next();
    }

    // Vérifier que le préparateur a accès à cette agence
    const hasAccess = req.user.agencies.some(
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
    console.error('Erreur vérification accès agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
};

/**
 * Middleware pour vérifier que l'utilisateur peut accéder aux données d'un autre utilisateur
 */
const checkUserAccess = (req, res, next) => {
  try {
    const targetUserId = req.params.userId || req.body.userId || req.query.userId;
    
    // Les admins peuvent accéder à tous les utilisateurs
    if (req.user.role === 'admin') {
      return next();
    }

    // Les utilisateurs peuvent seulement accéder à leurs propres données
    if (req.user.userId.toString() !== targetUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED || 'Accès refusé'
      });
    }

    next();

  } catch (error) {
    console.error('Erreur vérification accès utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
};

/**
 * Middleware pour générer un token JWT
 * Utilitaire pour la génération de tokens
 */
const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET non défini');
  }

  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d',
      issuer: 'ysg-backend',
      audience: 'ysg-app'
    }
  );
};

/**
 * Middleware pour rafraîchir un token
 */
const refreshToken = async (req, res, next) => {
  try {
    // Le middleware auth doit avoir été exécuté avant
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    // Générer un nouveau token
    const newToken = generateToken(req.user.userId);
    
    // Ajouter le nouveau token à la réponse
    req.newToken = newToken;
    
    next();
  } catch (error) {
    console.error('Erreur rafraîchissement token:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
};

module.exports = {
  auth,
  optionalAuth,
  checkAgencyAccess,
  checkUserAccess,
  generateToken,
  refreshToken
};