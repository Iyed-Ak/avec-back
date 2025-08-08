const express = require('express');
const router = express.Router();
const Inscription = require('../models/Inscription');
const { validateInscription, validateMongoId } = require('../middleware/validation');
const { inscriptionLimiter } = require('../middleware/rateLimiting');

const adminRoutes = require('./admin');
const requireAdmin = adminRoutes.requireAdmin || ((req, res, next) => {
  const jwt = require('jsonwebtoken');
  const Admin = require('../models/Admin');
  const JWT_SECRET = process.env.JWT_SECRET || 'mon_secret';
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant ou format invalide' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token invalide' });
    }
    
    try {
      const admin = await Admin.findById(decoded.id);
      if (!admin || !admin.isActive) {
        return res.status(401).json({ message: 'Admin non trouvé ou désactivé' });
      }
      req.admin = admin;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Erreur d\'authentification' });
    }
  });
});

// GET - récupérer toutes les inscriptions (ADMIN SEULEMENT)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const inscriptions = await Inscription.find().sort({ createdAt: -1 });
    
    const { logDataAccess } = require('../config/logger');
    logDataAccess(req.admin._id, 'READ_ALL', 'Inscription', {
      count: inscriptions.length
    });
    
    res.json(inscriptions);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des inscriptions' });
  }
});

// ➤ GET inscription par ID (ADMIN SEULEMENT)
router.get('/:id', requireAdmin, validateMongoId, async (req, res) => {
  try {
    const inscription = await Inscription.findById(req.params.id);
    if (!inscription) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }
    
    const { logDataAccess } = require('../config/logger');
    logDataAccess(req.admin._id, 'READ', 'Inscription', {
      inscriptionId: inscription._id
    });
    
    res.status(200).json(inscription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération' });
  }
});

// ➤ POST ajouter une inscription (PUBLIC avec rate limiting)
router.post('/', inscriptionLimiter, validateInscription, async (req, res) => {
  try {
    const newInscription = new Inscription(req.body);
    const savedInscription = await newInscription.save();
    
    // Log de la nouvelle inscription
    const { logSecurityEvent } = require('../config/logger');
    logSecurityEvent('NEW_INSCRIPTION', {
      inscriptionId: savedInscription._id,
      userEmail: savedInscription.user.email,
      formation: savedInscription.formation.name,
      ip: req.ip
    });
    
    res.status(201).json({ message: 'Inscription reçue', inscription: savedInscription });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' });
  }
});

// ➤ PUT modifier une inscription (ADMIN SEULEMENT)
router.put('/:id', requireAdmin, validateMongoId, validateInscription, async (req, res) => {
  try {
    const updatedInscription = await Inscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedInscription) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }
    
    const { logDataAccess } = require('../config/logger');
    logDataAccess(req.admin._id, 'UPDATE', 'Inscription', {
      inscriptionId: updatedInscription._id
    });
    
    res.status(200).json(updatedInscription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour' });
  }
});

// ➤ DELETE supprimer une inscription (ADMIN SEULEMENT)
router.delete('/:id', requireAdmin, validateMongoId, async (req, res) => {
  try {
    const deletedInscription = await Inscription.findByIdAndDelete(req.params.id);
    if (!deletedInscription) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }
    
    const { logDataAccess } = require('../config/logger');
    logDataAccess(req.admin._id, 'DELETE', 'Inscription', {
      inscriptionId: deletedInscription._id
    });
    
    res.status(200).json({ message: 'Inscription supprimée' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression' });
  }
});

module.exports = router;
