const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { applySecurityMiddlewares } = require('./middleware/security');
const { logger } = require('./config/logger');



// Charger les variables d'environnement
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ===================================
// ===================================

const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error('Variables d\'environnement manquantes:', { missingEnvVars });
  console.error('❌ Variables d\'environnement manquantes:', missingEnvVars);
  console.error('Veuillez configurer ces variables avant de démarrer le serveur.');
  process.exit(1);
}

if (process.env.JWT_SECRET === 'mon_secret' || process.env.JWT_SECRET.length < 32) {
  logger.warn('JWT_SECRET faible détecté - utilisez un secret plus fort en production');
  console.warn('⚠️  JWT_SECRET faible détecté - utilisez un secret plus fort en production');
}

// ===================================
// MIDDLEWARES DE SÉCURITÉ CENTRALISÉS
// ===================================

// Appliquer tous les middlewares de sécurité
applySecurityMiddlewares(app);

app.use(express.static(path.join(__dirname, 'public'))); // ✅ ceci permet de servir les fichiers statiques

// ===================================
// CORS SÉCURISÉ
// ===================================

const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origin (applications mobiles, Postman)
    const allowedOrigins = [
      'http://localhost:4200',
      'http://localhost:3000',
      process.env.FRONTEND_URL || 'https://votre-domaine.com' // Configurable via env
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('Tentative CORS non autorisée', { origin, ip: 'unknown' });
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'X-Requested-With',
    'Accept'
  ],
  maxAge: 86400 // Cache preflight 24h
};

app.use(cors(corsOptions));

// ===================================
// AUTRES MIDDLEWARES
// ===================================

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      logger.warn('JSON invalide reçu', { 
        ip: req.ip, 
        contentType: req.get('Content-Type'),
        error: e.message 
      });
      throw new Error('JSON invalide');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 100 // Limiter le nombre de paramètres
}));

// ===================================
// CONNEXION BASE DE DONNÉES
// ===================================

const connectDB = require('./config/db');
connectDB();

// ===================================
// ROUTES
// ===================================

const formationRoutes = require('./routes/formations');
const inscriptionRoutes = require('./routes/inscriptions');
const adminRoutes = require('./routes/admin');
const Formation = require('./models/Formation');

app.use('/api/formations', formationRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/admin', adminRoutes);

// ===================================
// ROUTE DE TEST
// ===================================

app.get('/', (req, res) => {
  res.json({ 
    message: '✅ Le backend IFC fonctionne',
    security: 'Helmet activé',
    timestamp: new Date().toISOString()
  });
});

// ===================================
// GESTION D'ERREURS GLOBALE
// ===================================

app.use((err, req, res, next) => {
  logger.error('Erreur globale', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Gestion spécifique des erreurs de sécurité
  if (err.message === 'Non autorisé par CORS') {
    return res.status(403).json({ message: 'Accès CORS refusé' });
  }
  
  if (err.message === 'JSON invalide') {
    return res.status(400).json({ message: 'Format de données invalide' });
  }
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Requête trop volumineuse' });
  }
  
  // Ne pas exposer les détails d'erreur en production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ message: 'Erreur serveur interne' });
  } else {
    res.status(500).json({ 
      message: err.message,
      stack: err.stack 
    });
  }
});

// ===================================
// DÉMARRAGE SERVEUR
// ===================================

app.listen(port, () => {
  const startupMessage = `🚀 Serveur IFC lancé sur http://localhost:${port}`;
  const securityMessage = `🛡️ Sécurité renforcée activée:
  - Rate limiting configuré
  - Validation et sanitisation des entrées
  - Monitoring avancé des logs
  - Headers de sécurité Helmet
  - Protection contre les attaques communes`;
  const envMessage = `🌍 Environnement: ${process.env.NODE_ENV || 'development'}`;
  
  console.log(startupMessage);
  console.log(securityMessage);
  console.log(envMessage);
  
  logger.info('Serveur démarré', {
    port,
    environment: process.env.NODE_ENV || 'development',
    securityFeatures: [
      'rate-limiting',
      'input-validation',
      'xss-protection',
      'mongodb-sanitization',
      'advanced-logging',
      'helmet-headers',
      'suspicious-activity-detection'
    ]
  });
});
