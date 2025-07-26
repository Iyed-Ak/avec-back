// ===================================
// ROUTES ADMIN (routes/admin.js)
// ===================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'mon_secret';

// ===================================
// MIDDLEWARE DE PROTECTION
// ===================================

const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token manquant ou format invalide' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Vérifier que l'admin existe encore
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: 'Admin non trouvé' });
    }

    req.admin = { id: decoded.id, email: admin.email };
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

// ===================================
// ROUTE REGISTER
// ===================================

router.post('/register', async (req, res) => {
  const { email, password, nom, prenom } = req.body;

  // Validation des données d'entrée
  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  // Validation format email basique
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Format d\'email invalide' });
  }

  try {
    // Vérifier si admin existe déjà
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Un admin avec cet email existe déjà' });
    }

    // Créer l'admin - le middleware pre('save') hashera le mot de passe
    const newAdmin = new Admin({ 
      email: email.toLowerCase().trim(),
      password: password, // Sera hashé automatiquement par le middleware
      nom: nom?.trim(),
      prenom: prenom?.trim()
    });
    
    await newAdmin.save();

    // Ne pas renvoyer le mot de passe dans la réponse
    res.status(201).json({ 
      message: 'Admin créé avec succès',
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        nom: newAdmin.nom,
        prenom: newAdmin.prenom
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

  // Validation des données d'entrée
  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  console.log('Tentative de connexion pour:', email);

  try {
    // Chercher l'admin (insensible à la casse pour l'email)
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      console.log('Admin introuvable pour email:', email);
      // Message générique pour éviter l'énumération des comptes
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    console.log('Admin trouvé:', admin.email);

    // Vérifier le mot de passe avec la méthode du modèle
    const isMatch = await admin.comparePassword(password);
    console.log('Vérification mot de passe:', isMatch);

    if (!isMatch) {
      console.log('Mot de passe incorrect pour:', email);
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    // Créer le token JWT avec plus d'informations
    const tokenPayload = {
      id: admin._id,
      email: admin.email,
      role: 'admin'
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { 
      expiresIn: '24h',
      issuer: 'ifc-formation',
      subject: admin._id.toString()
    });

    // Mettre à jour la dernière connexion
    await Admin.findByIdAndUpdate(admin._id, { 
      lastLogin: new Date()
    });

    console.log('Connexion réussie pour:', email);

    // Réponse avec token et informations admin (sans mot de passe)
    res.json({
      message: 'Connexion réussie',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        nom: admin.nom,
        prenom: admin.prenom,
        role: 'admin'
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
    const admin = await Admin.findById(req.admin.id).select('-password');
    res.json({
      message: 'Token valide',
      admin: {
        id: admin._id,
        email: admin.email,
        nom: admin.nom,
        prenom: admin.prenom,
        role: 'admin'
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
    const admins = await Admin.find({}).select('-password').sort({ createdAt: -1 });
    
    res.json({
      message: 'Liste des admins',
      admins: admins.map(admin => ({
        id: admin._id,
        email: admin.email,
        nom: admin.nom,
        prenom: admin.prenom,
        createdAt: admin.createdAt,
        lastLogin: admin.lastLogin
      })),
      total: admins.length
    });
  } catch (err) {
    console.error('Erreur récupération liste admins:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ===================================
// ROUTE SUPPRESSION ADMIN
// ===================================

router.delete('/delete', requireAdmin, async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: 'Email requis en paramètre' });
  }

  // Empêcher l'auto-suppression
  if (email.toLowerCase() === req.admin.email.toLowerCase()) {
    return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
  }

  try {
    const adminToDelete = await Admin.findOne({ email: email.toLowerCase() });
    if (!adminToDelete) {
      return res.status(404).json({ message: 'Admin non trouvé' });
    }

    await Admin.deleteOne({ email: email.toLowerCase() });
    
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
    const admin = await Admin.findById(req.admin.id);
    
    // Vérifier le mot de passe actuel avec la méthode du modèle
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }

    // Assigner le nouveau mot de passe - le middleware pre('save') le hashera
    admin.password = newPassword;
    admin.passwordChangedAt = new Date();
    await admin.save();

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
  // Le logout est principalement géré côté client (suppression du token)
  // Mais on peut enregistrer l'événement
  console.log('Logout admin:', req.admin.email);
  res.json({ message: 'Déconnexion réussie' });
});

module.exports = router;