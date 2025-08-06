const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Trop de requêtes depuis cette IP, réessayez dans 15 minutes.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[SECURITY] Rate limit global dépassé - IP: ${req.ip} - ${new Date().toISOString()}`);
    res.status(429).json({
      error: 'Trop de requêtes depuis cette IP, réessayez dans 15 minutes.',
      retryAfter: 15 * 60
    });
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    error: 'Trop de tentatives de connexion échouées. Réessayez dans 15 minutes.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[SECURITY ALERT] Tentatives de login multiples bloquées - IP: ${req.ip} - Email: ${req.body?.email} - ${new Date().toISOString()}`);
    res.status(429).json({
      error: 'Trop de tentatives de connexion échouées. Réessayez dans 15 minutes.',
      retryAfter: 15 * 60
    });
  }
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: {
    error: 'Limite de requêtes admin dépassée, réessayez dans 15 minutes.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[SECURITY] Rate limit admin dépassé - IP: ${req.ip} - User: ${req.admin?.email} - ${new Date().toISOString()}`);
    res.status(429).json({
      error: 'Limite de requêtes admin dépassée, réessayez dans 15 minutes.',
      retryAfter: 15 * 60
    });
  }
});

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    error: 'Limite de requêtes publiques dépassée, réessayez dans 15 minutes.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[SECURITY] Rate limit public dépassé - IP: ${req.ip} - ${new Date().toISOString()}`);
    res.status(429).json({
      error: 'Limite de requêtes publiques dépassée, réessayez dans 15 minutes.',
      retryAfter: 15 * 60
    });
  }
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 10, // Ralentir après 10 requêtes
  delayMs: 500, // Délai de 500ms par requête supplémentaire
  maxDelayMs: 5000, // Délai maximum de 5 secondes
  onLimitReached: (req, res, options) => {
    console.log(`[SECURITY] Speed limit atteint - IP: ${req.ip} - ${new Date().toISOString()}`);
  }
});

module.exports = {
  globalLimiter,
  loginLimiter,
  adminLimiter,
  publicLimiter,
  speedLimiter
};
