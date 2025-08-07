const express = require('express');
const router = express.Router();
const Formation = require('../models/Formation');
const { publicLimiter, adminLimiter } = require('../middleware/rateLimiter');
const { validateFormation, validateFormationUpdate, validateIdParam } = require('../middleware/validation');

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

// ✅ GET toutes les formations (PUBLIC)
router.get('/', publicLimiter, async (req, res) => {
  try {
    const mockFormations = [
      {
        _id: "507f1f77bcf86cd799439011",
        name: "Formation Test Sécurité",
        shortDescription: "Formation de test pour vérifier les fonctionnalités de sécurité",
        fullDescription: "Cette formation de test permet de vérifier que toutes les mesures de sécurité sont correctement implémentées.",
        duration: "2 jours",
        price: "500€",
        freq: "Mensuelle",
        cert: "Certificat de sécurité"
      }
    ];
    
    console.log(`[INFO] ${mockFormations.length} formations test récupérées - IP: ${req.ip} - ${new Date().toISOString()}`);
    res.json(mockFormations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ GET formation par ID (PUBLIC)
router.get('/:id', publicLimiter, validateIdParam, async (req, res) => {
  try {
    const mockFormation = {
      _id: req.params.id,
      name: "Formation Test Sécurité",
      shortDescription: "Formation de test pour vérifier les fonctionnalités de sécurité",
      fullDescription: "Cette formation de test permet de vérifier que toutes les mesures de sécurité sont correctement implémentées.",
      duration: "2 jours",
      price: "500€",
      freq: "Mensuelle",
      cert: "Certificat de sécurité"
    };
    
    console.log(`[INFO] Formation test récupérée - ID: ${req.params.id} - IP: ${req.ip} - ${new Date().toISOString()}`);
    res.json(mockFormation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ POST créer une nouvelle formation (ADMIN SEULEMENT)
router.post('/', adminLimiter, requireAdmin, validateFormation, async (req, res) => {
  try {
    const newFormation = new Formation(req.body);
    const saved = await newFormation.save();
    
    logSecurityEvent('FORMATION_CREATED', {
      formationId: saved._id,
      formationName: saved.name,
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      ip: req.ip,
      severity: 'info'
    });
    
    res.status(201).json(saved);
  } catch (err) {
    console.error('Erreur création formation:', err);
    res.status(400).json({ 
      message: 'Erreur lors de la création de la formation',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur de validation'
    });
  }
});

// ✅ PUT mise à jour d'une formation (ADMIN SEULEMENT)
router.put('/:id', adminLimiter, requireAdmin, validateIdParam, validateFormationUpdate, async (req, res) => {
  try {
    const updated = await Formation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Formation non trouvée' });
    }
    
    logSecurityEvent('FORMATION_UPDATED', {
      formationId: updated._id,
      formationName: updated.name,
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      ip: req.ip,
      severity: 'info'
    });
    
    res.json(updated);
  } catch (err) {
    console.error('Erreur mise à jour formation:', err);
    res.status(400).json({ 
      message: 'Erreur lors de la mise à jour',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur de validation'
    });
  }
});

// ✅ DELETE suppression d'une formation (ADMIN SEULEMENT)
router.delete('/:id', adminLimiter, requireAdmin, validateIdParam, async (req, res) => {
  try {
    const deleted = await Formation.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Formation non trouvée' });
    }
    
    logSecurityEvent('FORMATION_DELETED', {
      formationId: deleted._id,
      formationName: deleted.name,
      adminId: req.admin._id,
      adminEmail: req.admin.email,
      ip: req.ip,
      severity: 'medium'
    });
    
    res.json({ 
      message: 'Formation supprimée',
      deletedFormation: {
        id: deleted._id,
        name: deleted.name
      }
    });
  } catch (err) {
    console.error('Erreur suppression formation:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur serveur'
    });
  }
});

module.exports = router;
