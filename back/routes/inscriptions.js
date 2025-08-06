const express = require('express');
const router = express.Router();
const Inscription = require('../models/Inscription');
const { publicLimiter, adminLimiter } = require('../middleware/rateLimiter');
const { validateInscription, validateInscriptionUpdate, validateIdParam } = require('../middleware/validation');

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const TokenBlacklist = require('../models/TokenBlacklist');
const { logSecurityEvent } = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'mon_secret';

const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Authentification requise pour cette action',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];
    
    const isBlacklisted = await TokenBlacklist.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ 
        message: 'Token révoqué',
        code: 'TOKEN_REVOKED'
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(401).json({ 
        message: 'Admin non trouvé ou désactivé',
        code: 'INVALID_ADMIN'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expiré',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Token invalide',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(401).json({ 
      message: 'Erreur d\'authentification',
      code: 'AUTH_ERROR'
    });
  }
};

// GET - récupérer toutes les inscriptions (ADMIN SEULEMENT)
router.get('/', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const inscriptions = await Inscription.find();
    res.json(inscriptions);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des inscriptions' });
  }
});

// ➤ GET inscription par ID (ADMIN SEULEMENT)
router.get('/:id', adminLimiter, requireAdmin, validateIdParam, async (req, res) => {
  try {
    const inscription = await Inscription.findById(req.params.id);
    if (!inscription) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }
    res.status(200).json(inscription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération' });
  }
});

// ➤ POST ajouter une inscription (PUBLIC avec rate limiting)
router.post('/', publicLimiter, validateInscription, async (req, res) => {
  try {
    const newInscription = new Inscription(req.body);
    const savedInscription = await newInscription.save();
    
    logSecurityEvent('INSCRIPTION_CREATED', {
      inscriptionId: savedInscription._id,
      userEmail: savedInscription.user.email,
      formationName: savedInscription.formation.name,
      ip: req.ip,
      severity: 'info'
    });
    
    res.status(201).json({ 
      message: 'Inscription reçue avec succès', 
      inscription: savedInscription 
    });
  } catch (error) {
    console.error('Erreur création inscription:', error);
    res.status(400).json({ 
      message: 'Erreur lors de l\'inscription',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur de validation'
    });
  }
});

// ➤ PUT modifier une inscription (ADMIN SEULEMENT)
router.put('/:id', adminLimiter, requireAdmin, validateIdParam, validateInscriptionUpdate, async (req, res) => {
  try {
    const updatedInscription = await Inscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedInscription) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }
    
    logSecurityEvent('INSCRIPTION_UPDATED', {
      inscriptionId: updatedInscription._id,
      userEmail: updatedInscription.user.email,
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      ip: req.ip,
      severity: 'info'
    });
    
    res.status(200).json(updatedInscription);
  } catch (error) {
    console.error('Erreur mise à jour inscription:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la mise à jour',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur de validation'
    });
  }
});

// ➤ DELETE supprimer une inscription (ADMIN SEULEMENT)
router.delete('/:id', adminLimiter, requireAdmin, validateIdParam, async (req, res) => {
  try {
    const deletedInscription = await Inscription.findByIdAndDelete(req.params.id);
    if (!deletedInscription) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }
    
    logSecurityEvent('INSCRIPTION_DELETED', {
      inscriptionId: deletedInscription._id,
      userEmail: deletedInscription.user.email,
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      ip: req.ip,
      severity: 'medium'
    });
    
    res.status(200).json({ 
      message: 'Inscription supprimée',
      deletedInscription: {
        id: deletedInscription._id,
        userEmail: deletedInscription.user.email
      }
    });
  } catch (error) {
    console.error('Erreur suppression inscription:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur'
    });
  }
});

module.exports = router;
