// ===================================
// ROUTES ADMIN AVEC RÔLES (routes/admin.js)
// ===================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'mon_secret';

// ===================================
// MIDDLEWARES DE PROTECTION
// ===================================

const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token manquant ou format invalide' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Admin non trouvé ou désactivé' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide' });
    }
    return res.status(401).json({ message: 'Erreur d\'authentification' });
  }
};

const requireSuperAdmin = async (req, res, next) => {
  if (!req.admin || !req.admin.isSuperAdmin()) {
    return res.status(403).json({ message: 'Accès refusé - Super Admin requis' });
  }
  next();
};

// ===================================
// ROUTE REGISTER (Super Admin seulement)
// ===================================

router.post('/register', requireAdmin, requireSuperAdmin, async (req, res) => {
  const { email, password, nom, prenom, role = 'admin' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Format d\'email invalide' });
  }

  if (!['admin', 'superAdmin'].includes(role)) {
    return res.status(400).json({ message: 'Rôle invalide' });
  }

  try {
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Un admin avec cet email existe déjà' });
    }

    const newAdmin = new Admin({ 
      email: email.toLowerCase().trim(),
      password: password,
      nom: nom?.trim(),
      prenom: prenom?.trim(),
      role: role,
      createdBy: req.admin._id
    });
    
    await newAdmin.save();

    res.status(201).json({ 
      message: 'Admin créé avec succès',
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        nom: newAdmin.nom,
        prenom: newAdmin.prenom,
        role: newAdmin.role
      }
    });
  } catch (err) {
    console.error('Erreur création admin:', err);
    
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }
    
    res.status(500).json({ 
      message: 'Erreur serveur lors de la création',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne'
    });
  }
});

// ===================================
// ROUTE LOGIN
// ===================================

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  console.log('Tentative de connexion pour:', email);

  try {
    const admin = await Admin.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    });
    
    if (!admin) {
      console.log('Admin introuvable ou désactivé pour email:', email);
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    console.log('Admin trouvé:', admin.email);

    const isMatch = await admin.comparePassword(password);
    console.log('Vérification mot de passe:', isMatch);

    if (!isMatch) {
      console.log('Mot de passe incorrect pour:', email);
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const tokenPayload = {
      id: admin._id,
      email: admin.email,
      role: admin.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { 
      expiresIn: '24h',
      issuer: 'ifc-formation',
      subject: admin._id.toString()
    });

    await Admin.findByIdAndUpdate(admin._id, { 
      lastLogin: new Date()
    });

    console.log('Connexion réussie pour:', email);

    res.json({
      message: 'Connexion réussie',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        nom: admin.nom,
        prenom: admin.prenom,
        role: admin.role
      }
    });

  } catch (err) {
    console.error('Erreur serveur lors du login:', err);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne'
    });
  }
});

// ===================================
// ROUTE VERIFICATION TOKEN
// ===================================

router.get('/verify', requireAdmin, async (req, res) => {
  try {
    res.json({
      message: 'Token valide',
      admin: {
        id: req.admin._id,
        email: req.admin.email,
        nom: req.admin.nom,
        prenom: req.admin.prenom,
        role: req.admin.role
      }
    });
  } catch (err) {
    console.error('Erreur vérification token:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ===================================
// ROUTE LISTE DES ADMINS
// ===================================

router.get('/list', requireAdmin, async (req, res) => {
  try {
    const admins = await Admin.find({ isActive: true })
      .select('-password')
      .populate('createdBy', 'email nom prenom')
      .sort({ createdAt: -1 });
    
    res.json({
      message: 'Liste des admins',
      admins: admins.map(admin => ({
        id: admin._id,
        email: admin.email,
        nom: admin.nom,
        prenom: admin.prenom,
        role: admin.role,
        createdAt: admin.createdAt,
        lastLogin: admin.lastLogin,
        createdBy: admin.createdBy
      })),
      total: admins.length,
      currentUserRole: req.admin.role
    });
  } catch (err) {
    console.error('Erreur récupération liste admins:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ===================================
// ROUTE SUPPRESSION ADMIN (Super Admin seulement)
// ===================================

router.delete('/delete', requireAdmin, requireSuperAdmin, async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: 'Email requis en paramètre' });
  }

  if (email.toLowerCase() === req.admin.email.toLowerCase()) {
    return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
  }

  try {
    const adminToDelete = await Admin.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });
    
    if (!adminToDelete) {
      return res.status(404).json({ message: 'Admin non trouvé' });
    }

    // Soft delete au lieu de hard delete
    await Admin.findByIdAndUpdate(adminToDelete._id, { 
      isActive: false,
      deletedAt: new Date(),
      deletedBy: req.admin._id
    });
    
    res.json({ 
      message: 'Admin supprimé avec succès',
      deletedAdmin: {
        email: adminToDelete.email,
        nom: adminToDelete.nom,
        prenom: adminToDelete.prenom
      }
    });
  } catch (err) {
    console.error('Erreur suppression admin:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la suppression',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne'
    });
  }
});

// ===================================
// ROUTE CHANGEMENT RÔLE (Super Admin seulement)
// ===================================

router.put('/change-role', requireAdmin, requireSuperAdmin, async (req, res) => {
  const { adminId, newRole } = req.body;

  if (!adminId || !newRole) {
    return res.status(400).json({ message: 'ID admin et nouveau rôle requis' });
  }

  if (!['admin', 'superAdmin'].includes(newRole)) {
    return res.status(400).json({ message: 'Rôle invalide' });
  }

  if (adminId === req.admin._id.toString()) {
    return res.status(400).json({ message: 'Vous ne pouvez pas modifier votre propre rôle' });
  }

  try {
    const admin = await Admin.findById(adminId);
    if (!admin || !admin.isActive) {
      return res.status(404).json({ message: 'Admin non trouvé' });
    }

    admin.role = newRole;
    await admin.save();

    res.json({
      message: 'Rôle mis à jour avec succès',
      admin: {
        id: admin._id,
        email: admin.email,
        nom: admin.nom,
        prenom: admin.prenom,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Erreur changement rôle:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ===================================
// ROUTE CHANGEMENT MOT DE PASSE
// ===================================

router.put('/change-password', requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Mot de passe actuel et nouveau requis' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
  }

  try {
    const isCurrentPasswordValid = await req.admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }

    req.admin.password = newPassword;
    req.admin.passwordChangedAt = new Date();
    await req.admin.save();

    console.log('Mot de passe changé pour admin:', req.admin.email);
    res.json({ message: 'Mot de passe mis à jour avec succès' });

  } catch (err) {
    console.error('Erreur changement mot de passe:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ===================================
// ROUTE LOGOUT
// ===================================

router.post('/logout', requireAdmin, async (req, res) => {
  console.log('Logout admin:', req.admin.email);
  res.json({ message: 'Déconnexion réussie' });
});

module.exports = router;