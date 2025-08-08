const { body, param, query, validationResult } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

// ===================================
// ===================================

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Erreurs de validation:', errors.array());
    return res.status(400).json({
      message: 'Données invalides',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

const sanitizeXSS = (req, res, next) => {
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = xss(obj[key], {
          whiteList: {}, // Aucune balise HTML autorisée
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script']
        });
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  
  next();
};

// ===================================
// ===================================

const validateAdminRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Format d\'email invalide')
    .isLength({ max: 100 })
    .withMessage('Email trop long (max 100 caractères)'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Le mot de passe doit contenir entre 8 et 128 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Le mot de passe doit contenir au moins: 1 minuscule, 1 majuscule, 1 chiffre, 1 caractère spécial'),
  
  body('nom')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Nom trop long (max 50 caractères)')
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage('Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  
  body('prenom')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Prénom trop long (max 50 caractères)')
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage('Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  
  body('role')
    .optional()
    .isIn(['admin', 'superAdmin'])
    .withMessage('Rôle invalide'),
  
  handleValidationErrors
];

const validateAdminLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Format d\'email invalide')
    .isLength({ max: 100 })
    .withMessage('Email trop long'),
  
  body('password')
    .notEmpty()
    .withMessage('Mot de passe requis')
    .isLength({ max: 128 })
    .withMessage('Mot de passe trop long'),
  
  handleValidationErrors
];

const validateFormation = [
  body('name')
    .notEmpty()
    .withMessage('Nom de formation requis')
    .isLength({ max: 200 })
    .withMessage('Nom trop long (max 200 caractères)')
    .trim(),
  
  body('shortDescription')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description courte trop longue (max 500 caractères)')
    .trim(),
  
  body('fullDescription')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description complète trop longue (max 5000 caractères)')
    .trim(),
  
  body('duration')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Durée trop longue (max 100 caractères)')
    .trim(),
  
  body('price')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Prix trop long (max 50 caractères)')
    .trim(),
  
  body('goals')
    .optional()
    .isArray()
    .withMessage('Les objectifs doivent être un tableau'),
  
  body('goals.*')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Chaque objectif doit faire moins de 500 caractères')
    .trim(),
  
  body('content')
    .optional()
    .isArray()
    .withMessage('Le contenu doit être un tableau'),
  
  body('content.*')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Chaque élément de contenu doit faire moins de 1000 caractères')
    .trim(),
  
  handleValidationErrors
];

const validateInscription = [
  body('formation.name')
    .notEmpty()
    .withMessage('Nom de formation requis')
    .isLength({ max: 200 })
    .withMessage('Nom de formation trop long')
    .trim(),
  
  body('user.name')
    .notEmpty()
    .withMessage('Nom requis')
    .isLength({ max: 50 })
    .withMessage('Nom trop long (max 50 caractères)')
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage('Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes')
    .trim(),
  
  body('user.prenom')
    .notEmpty()
    .withMessage('Prénom requis')
    .isLength({ max: 50 })
    .withMessage('Prénom trop long (max 50 caractères)')
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage('Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes')
    .trim(),
  
  body('user.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Format d\'email invalide')
    .isLength({ max: 100 })
    .withMessage('Email trop long (max 100 caractères)'),
  
  body('user.telephone')
    .notEmpty()
    .withMessage('Téléphone requis')
    .matches(/^[+]?[0-9\s-()]{8,20}$/)
    .withMessage('Format de téléphone invalide')
    .trim(),
  
  body('user.gouvernorat')
    .notEmpty()
    .withMessage('Gouvernorat requis')
    .isLength({ max: 50 })
    .withMessage('Gouvernorat trop long')
    .trim(),
  
  body('user.ville')
    .notEmpty()
    .withMessage('Ville requise')
    .isLength({ max: 50 })
    .withMessage('Ville trop longue')
    .trim(),
  
  body('user.codePostal')
    .optional()
    .matches(/^[0-9]{4,10}$/)
    .withMessage('Code postal invalide (4-10 chiffres)')
    .trim(),
  
  body('photo')
    .optional()
    .isLength({ max: 5000000 }) // 5MB en base64
    .withMessage('Photo trop volumineuse (max 5MB)'),
  
  handleValidationErrors
];

const validateMongoId = [
  param('id')
    .isMongoId()
    .withMessage('ID invalide'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  sanitizeXSS,
  validateAdminRegistration,
  validateAdminLogin,
  validateFormation,
  validateInscription,
  validateMongoId,
  mongoSanitize: mongoSanitize({
    replaceWith: '_'
  })
};