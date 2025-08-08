const express = require('express');
const router = express.Router();
const Formation = require('../models/Formation');
const { validateFormation, validateMongoId } = require('../middleware/validation');

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

// ✅ GET toutes les formations
router.get('/', async (req, res) => {
  try {
    const formations = await Formation.find();
    res.json(formations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ GET formation par ID
router.get('/:id', validateMongoId, async (req, res) => {
  try {
    const formation = await Formation.findById(req.params.id);
    if (!formation) return res.status(404).json({ message: 'Formation non trouvée' });
    res.json(formation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ POST créer une nouvelle formation (ADMIN SEULEMENT)
router.post('/', requireAdmin, validateFormation, async (req, res) => {
  const newFormation = new Formation(req.body);
  try {
    const saved = await newFormation.save();
    
    const { logDataAccess } = require('../config/logger');
    logDataAccess(req.admin._id, 'CREATE', 'Formation', {
      formationId: saved._id,
      formationName: saved.name
    });
    
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ✅ PUT mise à jour d'une formation (ADMIN SEULEMENT)
router.put('/:id', requireAdmin, validateMongoId, validateFormation, async (req, res) => {
  try {
    const updated = await Formation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Formation non trouvée' });
    
    const { logDataAccess } = require('../config/logger');
    logDataAccess(req.admin._id, 'UPDATE', 'Formation', {
      formationId: updated._id,
      formationName: updated.name
    });
    
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ✅ DELETE suppression d'une formation (ADMIN SEULEMENT)
router.delete('/:id', requireAdmin, validateMongoId, async (req, res) => {
  try {
    const deleted = await Formation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Formation non trouvée' });
    
    const { logDataAccess } = require('../config/logger');
    logDataAccess(req.admin._id, 'DELETE', 'Formation', {
      formationId: deleted._id,
      formationName: deleted.name
    });
    
    res.json({ message: 'Formation supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
