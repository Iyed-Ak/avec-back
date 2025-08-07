// ===================================
// ROUTES ADMIN AVEC RÔLES (routes/admin.js)
// ===================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const TokenBlacklist = require('../models/TokenBlacklist');
const { adminLimiter, loginLimiter } = require('../middleware/rateLimiter');
const { validateAdmin, validateLogin, validateChangePassword, validateChangeRole, validateDeleteAdminQuery } = require('../middleware/validation');
const { logSecurityEvent, logAuthAttempt } = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'mon_secret';

// ===================================
// MIDDLEWARES DE PROTECTION
// ===================================

const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logSecurityEvent('MISSING_AUTH_TOKEN', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        severity: 'medium'
      });
      return res.status(401).json({ 
        message: 'Token manquant ou format invalide',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];
    
    const isBlacklisted = await TokenBlacklist.isTokenBlacklisted(token);
    if (isBlacklisted) {
      logSecurityEvent('BLACKLISTED_TOKEN_USED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        severity: 'high'
      });
      return res.status(401).json({ 
        message: 'Token révoqué',
        code: 'TOKEN_REVOKED'
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      logSecurityEvent('INVALID_ADMIN_TOKEN', {
        adminId: decoded.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        severity: 'high'
      });
      return res.status(401).json({ 
        message: 'Admin non trouvé ou désactivé',
        code: 'INVALID_ADMIN'
      });
    }

    if (admin.passwordChangedAt && decoded.iat * 1000 < admin.passwordChangedAt.getTime()) {
      logSecurityEvent('TOKEN_AFTER_PASSWORD_CHANGE', {
        adminId: admin._id,
        adminEmail: admin.email,
        ip: req.ip,
        severity: 'medium'
      });
      return res.status(401).json({ 
        message: 'Token invalide après changement de mot de passe',
        code: 'TOKEN_EXPIRED_PASSWORD_CHANGE'
      });
    }

    req.admin = admin;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logSecurityEvent('EXPIRED_TOKEN_USED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        severity: 'low'
      });
      return res.status(401).json({ 
        message: 'Token expiré',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      logSecurityEvent('INVALID_TOKEN_FORMAT', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        severity: 'medium'
      });
      return res.status(401).json({ 
        message: 'Token invalide',
        code: 'INVALID_TOKEN'
      });
    }
    
    logSecurityEvent('AUTH_ERROR', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      severity: 'high'
    });
    
    return res.status(401).json({ 
      message: 'Erreur d\'authentification',
      code: 'AUTH_ERROR'
    });
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

router.post('/register', adminLimiter, requireAdmin, requireSuperAdmin, validateAdmin, async (req, res) => {
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

router.post('/login', loginLimiter, validateLogin, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  console.log('Tentative de connexion pour:', email);

  try {
    const mockAdmin = {
      _id: "507f1f77bcf86cd799439012",
      email: "admin@test.com",
      password: "$2b$12$rTjRh3suEIVVuupKiaLA5OV2UTzEMKHM8..KWCreWi4MSsDiKPp.2", // hash de "admin123"
      role: "admin",
      nom: "Admin",
      prenom: "Test",
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date()
    };
    
    if (email.toLowerCase().trim() !== "admin@test.com") {
      console.log('Admin introuvable ou désactivé pour email:', email);
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    console.log('Admin trouvé:', mockAdmin.email);

    const bcrypt = require('bcrypt');
    const isMatch = await bcrypt.compare(password, mockAdmin.password);
    console.log('Vérification mot de passe:', isMatch);

    if (!isMatch) {
      console.log('Mot de passe incorrect pour:', email);
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const tokenPayload = {
      id: mockAdmin._id,
      email: mockAdmin.email,
      role: mockAdmin.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { 
      expiresIn: '24h',
      issuer: 'ifc-formation',
      subject: mockAdmin._id.toString()
    });

    console.log('Connexion réussie pour:', email);

    res.json({
      message: 'Connexion réussie',
      token,
      admin: {
        id: mockAdmin._id,
        email: mockAdmin.email,
        nom: mockAdmin.nom,
        prenom: mockAdmin.prenom,
        role: mockAdmin.role
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

router.get('/verify', adminLimiter, requireAdmin, async (req, res) => {
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

router.get('/list', adminLimiter, requireAdmin, async (req, res) => {
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

router.delete('/delete', adminLimiter, requireAdmin, requireSuperAdmin, validateDeleteAdminQuery, async (req, res) => {
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

router.put('/change-role', adminLimiter, requireAdmin, requireSuperAdmin, validateChangeRole, async (req, res) => {
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

router.put('/change-password', adminLimiter, requireAdmin, validateChangePassword, async (req, res) => {
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
// ROUTE LOGOUT AVEC RÉVOCATION TOKEN
// ===================================

router.post('/logout', requireAdmin, async (req, res) => {
  try {
    const token = req.token;
    const admin = req.admin;
    
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);
    
    await TokenBlacklist.blacklistToken({
      token,
      adminId: admin._id,
      adminEmail: admin.email,
      reason: 'logout',
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    logSecurityEvent('ADMIN_LOGOUT', {
      adminId: admin._id,
      adminEmail: admin.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'info'
    });
    
    console.log('Logout admin avec révocation token:', admin.email);
    res.json({ 
      message: 'Déconnexion réussie',
      tokenRevoked: true
    });
  } catch (error) {
    console.error('Erreur lors du logout:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la déconnexion',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// ===================================
// ROUTE MÉTRIQUES DE SÉCURITÉ (Admin seulement)
// ===================================

router.get('/security-metrics', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const { getSecurityMetrics } = require('../middleware/monitoring');
    const blacklistStats = await TokenBlacklist.getBlacklistStats();
    
    const metrics = {
      ...getSecurityMetrics(),
      tokenBlacklist: blacklistStats
    };
    
    res.json({
      message: 'Métriques de sécurité',
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur récupération métriques:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// ===================================
// ROUTE RÉVOCATION MANUELLE TOKEN (Super Admin seulement)
// ===================================

router.post('/revoke-token', adminLimiter, requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { adminId, reason = 'admin_revoked' } = req.body;
    
    if (!adminId) {
      return res.status(400).json({ message: 'ID admin requis' });
    }
    
    await TokenBlacklist.blacklistAllUserTokens(adminId, reason, req.admin._id);
    
    logSecurityEvent('MANUAL_TOKEN_REVOCATION', {
      targetAdminId: adminId,
      revokedBy: req.admin._id,
      revokedByEmail: req.admin.email,
      reason,
      ip: req.ip,
      severity: 'high'
    });
    
    res.json({ 
      message: 'Tous les tokens de l\'admin ont été révoqués',
      adminId,
      reason
    });
  } catch (error) {
    console.error('Erreur révocation token:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la révocation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

module.exports = router;
