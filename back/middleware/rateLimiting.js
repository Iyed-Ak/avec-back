const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// ===================================
// ===================================

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par windowMs
  message: {
    error: 'Trop de requêtes depuis cette IP, veuillez réessayer dans 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Retourne les headers `RateLimit-*`
  legacyHeaders: false, // Désactive les headers `X-RateLimit-*`
  handler: (req, res) => {
    console.log(`Rate limit dépassé pour IP: ${req.ip} sur ${req.path}`);
    res.status(429).json({
      error: 'Trop de requêtes depuis cette IP, veuillez réessayer dans 15 minutes.',
      retryAfter: '15 minutes'
    });
  }
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limite chaque IP à 5 tentatives de connexion par windowMs
  message: {
    error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Ne compte pas les connexions réussies
  handler: (req, res) => {
    console.log(`Tentatives de connexion admin bloquées pour IP: ${req.ip}`);
    res.status(429).json({
      error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
      retryAfter: '15 minutes'
    });
  }
});

const inscriptionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // limite chaque IP à 10 inscriptions par heure
  message: {
    error: 'Trop d\'inscriptions depuis cette IP, veuillez réessayer dans 1 heure.',
    retryAfter: '1 heure'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`Limite d'inscriptions dépassée pour IP: ${req.ip}`);
    res.status(429).json({
      error: 'Trop d\'inscriptions depuis cette IP, veuillez réessayer dans 1 heure.',
      retryAfter: '1 heure'
    });
  }
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Commence à ralentir après 50 requêtes
  delayMs: 500, // Ajoute 500ms de délai par requête après delayAfter
  maxDelayMs: 20000, // Délai maximum de 20 secondes
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  onLimitReached: (req, res, options) => {
    console.log(`Ralentissement activé pour IP: ${req.ip}`);
  }
});

module.exports = {
  generalLimiter,
  adminLoginLimiter,
  inscriptionLimiter,
  speedLimiter
};
