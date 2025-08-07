const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const validator = require('validator');

const xssOptions = {
  whiteList: {
    p: [],
    br: [],
    strong: [],
    em: [],
    u: [],
    ol: [],
    ul: [],
    li: []
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script']
};

const mongoSanitization = (req, res, next) => {
  try {
    const sanitizeObject = (obj) => {
      if (obj && typeof obj === 'object') {
        for (const key in obj) {
          if (key.startsWith('$') || key.includes('.')) {
            console.log(`[SECURITY] Tentative NoSQL injection détectée - IP: ${req.ip} - Clé: ${key} - ${new Date().toISOString()}`);
            delete obj[key];
          } else if (typeof obj[key] === 'object') {
            sanitizeObject(obj[key]);
          }
        }
      }
    };

    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);
    
    next();
  } catch (error) {
    console.error('[SECURITY] Erreur sanitisation:', error);
    next();
  }
};

const xssSanitization = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      const original = obj;
      const sanitized = xss(obj, xssOptions);
      if (original !== sanitized) {
        console.log(`[SECURITY] Tentative XSS détectée - IP: ${req.ip} - Original: ${original.substring(0, 100)} - ${new Date().toISOString()}`);
      }
      return sanitized;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const cleanEmail = validator.escape(email.toLowerCase().trim());
  
  if (!validator.isEmail(cleanEmail)) {
    return false;
  }
  
  if (cleanEmail.length > 254) {
    return false;
  }
  
  return cleanEmail;
};

const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return false;
  }
  
  if (password.length < 6) {
    return false;
  }
  
  if (password.length > 128) {
    return false;
  }
  
  return true;
};

const validateObjectId = (id) => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  return validator.isMongoId(id);
};

const validateCommonInputs = (req, res, next) => {
  if (req.params.id && !validateObjectId(req.params.id)) {
    return res.status(400).json({ 
      message: 'ID invalide',
      error: 'INVALID_OBJECT_ID'
    });
  }
  
  if (req.body.email) {
    const validEmail = validateEmail(req.body.email);
    if (!validEmail) {
      return res.status(400).json({ 
        message: 'Format d\'email invalide',
        error: 'INVALID_EMAIL'
      });
    }
    req.body.email = validEmail;
  }
  
  if (req.body.password && !validatePassword(req.body.password)) {
    return res.status(400).json({ 
      message: 'Mot de passe invalide (6-128 caractères requis)',
      error: 'INVALID_PASSWORD'
    });
  }
  
  next();
};

const cleanStrings = (req, res, next) => {
  const cleanString = (str) => {
    if (typeof str !== 'string') return str;
    
    let cleaned = str.replace(/[\x00-\x1F\x7F]/g, '');
    
    if (cleaned.length > 10000) {
      cleaned = cleaned.substring(0, 10000);
      console.log(`[SECURITY] Chaîne tronquée pour éviter DoS - IP: ${req.ip} - ${new Date().toISOString()}`);
    }
    
    return cleaned.trim();
  };
  
  const cleanObject = (obj) => {
    if (typeof obj === 'string') {
      return cleanString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(cleanObject);
    }
    
    if (obj && typeof obj === 'object') {
      const cleaned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cleaned[key] = cleanObject(obj[key]);
        }
      }
      return cleaned;
    }
    
    return obj;
  };
  
  if (req.body) {
    req.body = cleanObject(req.body);
  }
  
  next();
};

module.exports = {
  mongoSanitization,
  xssSanitization,
  validateEmail,
  validatePassword,
  validateObjectId,
  validateCommonInputs,
  cleanStrings
};
