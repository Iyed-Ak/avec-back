const helmet = require('helmet');
const toobusy = require('toobusy-js');
const { mongoSanitize, sanitizeXSS } = require('./validation');
const { generalLimiter, speedLimiter } = require('./rateLimiting');
const { httpLogger, logSuspiciousActivity } = require('../config/logger');

// ===================================
// ===================================

const helmetConfig = helmet({
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
        process.env.NODE_ENV === 'development' ? "http://localhost:3000" : "",
        process.env.NODE_ENV === 'development' ? "http://localhost:4200" : "",
        process.env.NODE_ENV === 'development' ? "ws://localhost:4200" : ""
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
  
  dnsPrefetchControl: { allow: false },
  
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
      payment: ["'none'"],
      usb: ["'none'"]
    }
  }
});

const serverLoadProtection = (req, res, next) => {
  if (toobusy()) {
    logSuspiciousActivity('SERVER_OVERLOAD', req.ip, {
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(503).json({
      error: 'Serveur temporairement surchargé, veuillez réessayer plus tard.',
      retryAfter: '30 seconds'
    });
  }
  next();
};

const suspiciousActivityDetection = (req, res, next) => {
  const suspiciousPatterns = [
    /(\b(union|select|insert|delete|update|drop|create|alter|exec|execute)\b)/i,
    /<script[^>]*>.*?<\/script>/gi,
    /\.\.[\/\\]/,
    /(php:\/\/|file:\/\/|data:\/\/)/i,
    /(\b(cmd|exec|system|shell_exec|passthru|eval)\b)/i
  ];
  
  const checkForSuspiciousContent = (obj, path = '') => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        for (let pattern of suspiciousPatterns) {
          if (pattern.test(obj[key])) {
            logSuspiciousActivity('MALICIOUS_PAYLOAD', req.ip, {
              pattern: pattern.toString(),
              payload: obj[key].substring(0, 200), // Limiter la taille du log
              field: `${path}.${key}`,
              url: req.url,
              method: req.method,
              userAgent: req.get('User-Agent')
            });
            
            return res.status(400).json({
              error: 'Contenu suspect détecté dans la requête.',
              message: 'Votre requête contient des éléments qui pourraient être malveillants.'
            });
          }
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        const result = checkForSuspiciousContent(obj[key], `${path}.${key}`);
        if (result) return result;
      }
    }
  };
  
  if (req.body && typeof req.body === 'object') {
    const result = checkForSuspiciousContent(req.body, 'body');
    if (result) return result;
  }
  
  if (req.query && typeof req.query === 'object') {
    const result = checkForSuspiciousContent(req.query, 'query');
    if (result) return result;
  }
  
  if (req.params && typeof req.params === 'object') {
    const result = checkForSuspiciousContent(req.params, 'params');
    if (result) return result;
  }
  
  next();
};

const requestSizeLimit = (req, res, next) => {
  const maxSizes = {
    'application/json': 10 * 1024 * 1024, // 10MB pour JSON (images base64)
    'application/x-www-form-urlencoded': 1 * 1024 * 1024, // 1MB pour form data
    'text/plain': 1 * 1024 * 1024, // 1MB pour text
    'default': 5 * 1024 * 1024 // 5MB par défaut
  };
  
  const contentType = req.get('Content-Type') || 'default';
  const baseType = contentType.split(';')[0];
  const maxSize = maxSizes[baseType] || maxSizes.default;
  
  const contentLength = parseInt(req.get('Content-Length') || '0');
  
  if (contentLength > maxSize) {
    logSuspiciousActivity('OVERSIZED_REQUEST', req.ip, {
      contentLength,
      maxSize,
      contentType: baseType,
      url: req.url,
      method: req.method
    });
    
    return res.status(413).json({
      error: 'Requête trop volumineuse',
      message: `La taille de la requête dépasse la limite autorisée de ${Math.round(maxSize / 1024 / 1024)}MB`
    });
  }
  
  next();
};

const validateHeaders = (req, res, next) => {
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url'
  ];
  
  for (let header of suspiciousHeaders) {
    if (req.get(header)) {
      logSuspiciousActivity('SUSPICIOUS_HEADER', req.ip, {
        header,
        value: req.get(header),
        url: req.url,
        method: req.method
      });
    }
  }
  
  const userAgent = req.get('User-Agent') || '';
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /burp/i,
    /nmap/i,
    /masscan/i
  ];
  
  for (let pattern of suspiciousUserAgents) {
    if (pattern.test(userAgent)) {
      logSuspiciousActivity('SUSPICIOUS_USER_AGENT', req.ip, {
        userAgent,
        url: req.url,
        method: req.method
      });
      
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Votre client n\'est pas autorisé à accéder à cette ressource.'
      });
    }
  }
  
  next();
};

const applySecurityMiddlewares = (app) => {
  app.use(serverLoadProtection);
  
  app.use(validateHeaders);
  
  app.use(requestSizeLimit);
  
  app.use(helmetConfig);
  
  app.use(generalLimiter);
  
  app.use(speedLimiter);
  
  app.use(httpLogger);
  
  // app.use(mongoSanitize); // Temporairement désactivé pour compatibilité
  
  app.use(sanitizeXSS);
  
  app.use(suspiciousActivityDetection);
};

module.exports = {
  helmetConfig,
  serverLoadProtection,
  suspiciousActivityDetection,
  requestSizeLimit,
  validateHeaders,
  applySecurityMiddlewares
};
