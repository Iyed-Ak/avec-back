const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const path = require('path');

// Charger les variables d'environnement
dotenv.config();

// Importer les middlewares de sécurité
const { globalLimiter, speedLimiter } = require('./middleware/rateLimiter');
const { mongoSanitization, xssSanitization, cleanStrings } = require('./middleware/sanitization');
const { accessLogMiddleware, securityLogMiddleware, authLogMiddleware } = require('./middleware/securityLogger');
const { monitoringMiddleware, metricsMiddleware } = require('./middleware/monitoring');
const { logger } = require('./config/logger');

const app = express();
const port = process.env.PORT || 3000;

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));
// ===================================
// MIDDLEWARE DE SÉCURITÉ HELMET RENFORCÉ
// ===================================

app.use(helmet({
  // Content Security Policy renforcée
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        process.env.NODE_ENV === 'development' ? "'unsafe-inline'" : null,
        process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : null,
        "https://cdnjs.cloudflare.com"
      ].filter(Boolean),
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Nécessaire pour Angular
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:"
      ],
      connectSrc: [
        "'self'",
        process.env.NODE_ENV === 'development' ? "http://localhost:3000" : null,
        process.env.NODE_ENV === 'development' ? "http://localhost:4200" : null,
        process.env.NODE_ENV === 'development' ? "ws://localhost:4200" : null
      ].filter(Boolean),
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false,
  
  // Strict Transport Security renforcé
  hsts: {
    maxAge: 31536000, // 1 an
    includeSubDomains: true,
    preload: true
  },
  
  // Masquer les technologies utilisées
  hidePoweredBy: true,
  
  // X-Frame-Options (protection clickjacking)
  frameguard: { action: 'deny' },
  
  // X-Content-Type-Options (protection MIME sniffing)
  noSniff: true,
  
  // Referrer Policy stricte
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  
  dnsPrefetchControl: { allow: false },
  
  ieNoOpen: true,
  
  permittedCrossDomainPolicies: false
}));

// ===================================
// CORS SÉCURISÉ ET STRICT
// ===================================

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:4200',
      'http://localhost:3000'
    ];
    
    if (process.env.NODE_ENV === 'production') {
      if (!origin) {
        return callback(new Error('Origin manquant - accès refusé par CORS'));
      }
      if (!allowedOrigins.includes(origin)) {
        logger.warn('CORS violation', { origin, allowedOrigins });
        return callback(new Error('Non autorisé par CORS'));
      }
    } else {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    }
    
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-CSRF-Token'
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // Cache preflight 24h
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// ===================================
// MIDDLEWARES DE SÉCURITÉ GLOBAUX
// ===================================

app.use(globalLimiter);
app.use(speedLimiter);
app.use(monitoringMiddleware);

// Logging de sécurité
app.use(accessLogMiddleware);
app.use(securityLogMiddleware);
app.use(authLogMiddleware);

app.use(express.json({ 
  limit: process.env.MAX_FILE_SIZE || '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      logger.warn('JSON invalide reçu', { ip: req.ip, error: e.message });
      throw new Error('JSON invalide');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_FILE_SIZE || '10mb',
  parameterLimit: 100 // Limiter le nombre de paramètres
}));

app.use(mongoSanitization);
app.use(cleanStrings);
app.use(xssSanitization);

// Middleware pour les métriques de sécurité
app.use(metricsMiddleware);

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
  console.error('Erreur globale:', err);
  
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
  console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
  console.log(`🛡️ Helmet activé - Headers de sécurité configurés`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
});
