const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ERROR_MESSAGES } = require('../utils/constants');

/**
 * Middleware d'authentification JWT - VERSION CORRIGÉE
 * Vérifie la validité du token et charge les données utilisateur
 */
const auth = async (req, res, next) => {
  try {
    console.log('🔍 Auth middleware - JWT_SECRET exists:', !!process.env.JWT_SECRET);
    
    // Récupérer le token depuis l'header Authorization
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token manquant ou format invalide');
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_REQUIRED
      });
    }

    // Extraire le token (format: "Bearer TOKEN")
    const token = authHeader.substring(7); // Plus sûr que replace
    console.log('🎫 Token reçu:', token.substring(0, 20) + '...');
    
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_REQUIRED
      });
    }

    // VÉRIFICATION CRITIQUE - JWT_SECRET doit exister
    if (!process.env.JWT_SECRET) {
      console.error('💥 ERREUR CRITIQUE: JWT_SECRET manquant dans .env !');
      return res.status(500).json({
        success: false,
        message: 'Configuration serveur manquante'
      });
    }

    console.log('🔐 Vérification token avec JWT_SECRET...');
    
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token décodé:', { userId: decoded.userId, role: decoded.role });
    
    // Charger l'utilisateur depuis la base de données
    const user = await User.findById(decoded.userId)
      .populate('agencies', 'name code client')
      .select('-password');

    if (!user) {
      console.log('❌ Utilisateur non trouvé:', decoded.userId);
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND
      });
    }

    // Vérifier que l'utilisateur est actif
    if (!user.isActive) {
      console.log('❌ Utilisateur inactif:', user.email);
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.USER_INACTIVE
      });
    }

    // Ajouter les données utilisateur à la requête
    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      agencies: user.agencies,
      fullUser: user // Pour accès complet si nécessaire
    };

    console.log('✅ Auth réussie pour:', user.email);
    next();

  } catch (error) {
    console.error('💥 Erreur authentification:', error.name, error.message);

    // Gérer les différents types d'erreurs JWT
    if (error.name === 'JsonWebTokenError') {
      console.error('🔐 JWT Error details:', {
        message: error.message,
        jwtSecretExists: !!process.env.JWT_SECRET,
        jwtSecretLength: process.env.JWT_SECRET?.length || 0
      });
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_INVALID
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_EXPIRED
      });
    }

    // Erreur générique
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
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
    
    if (!authHeader) {
      return next(); // Pas de token, on continue sans utilisateur
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .populate('agencies', 'name code client')
      .select('-password');

    if (user && user.isActive) {
      req.user = {
        userId: user._id,
        email: user.email,
        role: user.role,
        agencies: user.agencies,
        fullUser: user
      };
    }

    next();

  } catch (error) {
    // En cas d'erreur avec le token optionnel, on continue sans utilisateur
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
        message: ERROR_MESSAGES.ACCESS_DENIED
      });
    }

    next();

  } catch (error) {
    console.error('Erreur vérification accès agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
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
        message: ERROR_MESSAGES.ACCESS_DENIED
      });
    }

    next();

  } catch (error) {
    console.error('Erreur vérification accès utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

module.exports = {
  auth,
  optionalAuth,
  checkAgencyAccess,
  checkUserAccess
};