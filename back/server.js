const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const path = require('path');



// Charger les variables d'environnement
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public'))); // ✅ ceci permet de servir les fichiers statiques
// ===================================
// MIDDLEWARE DE SÉCURITÉ HELMET
// ===================================

app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Nécessaire pour Angular en dev
        "'unsafe-eval'",   // Nécessaire pour Angular en dev
        "https://cdnjs.cloudflare.com"
      ],
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
        "http://localhost:3000",
        "http://localhost:4200",
        "ws://localhost:4200" // WebSocket pour Angular dev
      ],
      Formation: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Désactivé pour compatibilité
  
  // Strict Transport Security (HTTPS uniquement)
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
  
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// ===================================
// CORS SÉCURISÉ
// ===================================

const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origin (applications mobiles, Postman)
    const allowedOrigins = [
      'http://localhost:4200',
      'http://localhost:3000',
      'https://votre-domaine.com' // Remplacer par votre domaine en production
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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

app.use(express.json({ limit: '10mb' })); // Limiter taille payload
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware pour logs de sécurité
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

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