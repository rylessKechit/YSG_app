const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { authSchemas } = require('../middleware/validation');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../utils/constants');

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Connexion utilisateur
 * @access  Public
 */
router.post('/login', validateBody(authSchemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Chercher l'utilisateur avec le mot de passe
    const user = await User.findByEmailWithPassword(email.toLowerCase());
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_CREDENTIALS
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_CREDENTIALS
      });
    }

    // Vérifier que l'utilisateur est actif
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.USER_INACTIVE
      });
    }

    // Générer le token JWT
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: 'vehicle-prep-api'
      }
    );

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();

    // Charger les agences pour la réponse
    await user.populate('agencies', 'name code client');

    // Réponse avec les données utilisateur
    res.json({
      success: true,
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.getFullName(),
          role: user.role,
          agencies: user.agencies,
          stats: user.stats,
          lastLogin: user.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Obtenir les informations de l'utilisateur connecté
 * @access  Private
 */
router.get('/me', auth, async (req, res) => {
  try {
    // L'utilisateur est déjà chargé par le middleware auth
    const user = req.user.fullUser;

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.getFullName(),
          role: user.role,
          agencies: user.agencies,
          stats: user.stats,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Rafraîchir le token JWT
 * @access  Private
 */
router.post('/refresh', auth, async (req, res) => {
  try {
    const user = req.user.fullUser;

    // Générer un nouveau token
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    const newToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: 'vehicle-prep-api'
      }
    );

    res.json({
      success: true,
      message: 'Token rafraîchi avec succès',
      data: {
        token: newToken
      }
    });

  } catch (error) {
    console.error('Erreur rafraîchissement token:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion utilisateur
 * @access  Private
 */
router.post('/logout', auth, async (req, res) => {
  try {
    // Dans une implémentation JWT stateless, on pourrait :
    // 1. Ajouter le token à une blacklist
    // 2. Réduire la durée de vie des tokens
    // 3. Ou simplement indiquer au client de supprimer le token

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.LOGOUT_SUCCESS
    });

  } catch (error) {
    console.error('Erreur déconnexion:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/auth/verify
 * @desc    Vérifier la validité du token
 * @access  Private
 */
router.get('/verify', auth, async (req, res) => {
  try {
    // Si le middleware auth passe, le token est valide
    res.json({
      success: true,
      message: 'Token valide',
      data: {
        valid: true,
        userId: req.user.userId,
        role: req.user.role
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token invalide',
      data: {
        valid: false
      }
    });
  }
});

module.exports = router;