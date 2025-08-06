const Joi = require('joi');
const { validateObjectId } = require('./sanitization');

const formationSchema = Joi.object({
  image: Joi.string().uri().optional().allow(''),
  name: Joi.string().min(2).max(200).required().trim(),
  shortDescription: Joi.string().min(10).max(500).required().trim(),
  fullDescription: Joi.string().min(20).max(5000).required().trim(),
  duration: Joi.string().min(1).max(100).required().trim(),
  price: Joi.string().min(1).max(50).required().trim(),
  freq: Joi.string().min(1).max(100).required().trim(),
  cert: Joi.string().min(1).max(200).required().trim(),
  images: Joi.array().items(Joi.string().uri()).max(10).optional(),
  goals: Joi.array().items(Joi.string().min(5).max(200)).max(20).optional(),
  content: Joi.array().items(Joi.string().min(5).max(500)).max(50).optional(),
  benefits: Joi.array().items(Joi.string().min(5).max(200)).max(20).optional(),
  faq: Joi.array().items(
    Joi.object({
      question: Joi.string().min(5).max(300).required().trim(),
      answer: Joi.string().min(10).max(1000).required().trim()
    })
  ).max(20).optional()
});

const inscriptionSchema = Joi.object({
  formation: Joi.object({
    name: Joi.string().min(2).max(200).required().trim(),
    description: Joi.string().min(10).max(500).optional().trim(),
    duration: Joi.string().min(1).max(100).optional().trim()
  }).required(),
  user: Joi.object({
    name: Joi.string().min(2).max(100).required().trim(),
    prenom: Joi.string().min(2).max(100).required().trim(),
    email: Joi.string().email().required().lowercase().trim(),
    telephone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]{8,20}$/).required().trim(),
    gouvernorat: Joi.string().min(2).max(50).required().trim(),
    ville: Joi.string().min(2).max(50).required().trim(),
    codePostal: Joi.string().pattern(/^\d{4}$/).required().trim()
  }).required(),
  photo: Joi.string().base64().max(5000000).optional() // 5MB max en base64
});

const adminSchema = Joi.object({
  nom: Joi.string().min(2).max(50).optional().trim(),
  prenom: Joi.string().min(2).max(50).optional().trim(),
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('admin', 'superAdmin').optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(6).max(128).required(),
  newPassword: Joi.string().min(6).max(128).required()
});

const changeRoleSchema = Joi.object({
  adminId: Joi.string().custom((value, helpers) => {
    if (!validateObjectId(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }).required(),
  newRole: Joi.string().valid('admin', 'superAdmin').required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().min(1).max(128).required()
});

const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      console.log(`[SECURITY] Validation échouée - IP: ${req.ip} - Erreurs:`, errorDetails);

      return res.status(400).json({
        message: 'Données invalides',
        errors: errorDetails,
        code: 'VALIDATION_ERROR'
      });
    }

    req[property] = value;
    next();
  };
};

const validateParams = (paramSchema) => {
  return validateRequest(paramSchema, 'params');
};

const validateQuery = (querySchema) => {
  return validateRequest(querySchema, 'query');
};

const idParamSchema = Joi.object({
  id: Joi.string().custom((value, helpers) => {
    if (!validateObjectId(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }).required()
});

const deleteAdminQuerySchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim()
});

const validateFormation = validateRequest(formationSchema);
const validateFormationUpdate = validateRequest(formationSchema.fork(['name', 'shortDescription', 'fullDescription', 'duration', 'price', 'freq', 'cert'], (schema) => schema.optional()));
const validateInscription = validateRequest(inscriptionSchema);
const validateInscriptionUpdate = validateRequest(inscriptionSchema.fork(['formation', 'user'], (schema) => schema.optional()));
const validateAdmin = validateRequest(adminSchema);
const validateLogin = validateRequest(loginSchema);
const validateChangePassword = validateRequest(changePasswordSchema);
const validateChangeRole = validateRequest(changeRoleSchema);
const validateIdParam = validateParams(idParamSchema);
const validateDeleteAdminQuery = validateQuery(deleteAdminQuerySchema);

const validateFileSize = (maxSizeBytes = 10 * 1024 * 1024) => { // 10MB par défaut
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSizeBytes) {
      console.log(`[SECURITY] Fichier trop volumineux rejeté - IP: ${req.ip} - Taille: ${contentLength} bytes - ${new Date().toISOString()}`);
      
      return res.status(413).json({
        message: 'Fichier trop volumineux',
        maxSize: `${Math.round(maxSizeBytes / 1024 / 1024)}MB`,
        code: 'FILE_TOO_LARGE'
      });
    }
    
    next();
  };
};

const validateMimeType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      return next();
    }
    
    const mimeType = contentType.split(';')[0].trim();
    
    if (!allowedTypes.includes(mimeType)) {
      console.log(`[SECURITY] Type MIME non autorisé - IP: ${req.ip} - Type: ${mimeType} - ${new Date().toISOString()}`);
      
      return res.status(415).json({
        message: 'Type de contenu non supporté',
        allowedTypes,
        received: mimeType,
        code: 'UNSUPPORTED_MEDIA_TYPE'
      });
    }
    
    next();
  };
};

module.exports = {
  formationSchema,
  inscriptionSchema,
  adminSchema,
  changePasswordSchema,
  changeRoleSchema,
  loginSchema,
  idParamSchema,
  deleteAdminQuerySchema,
  
  validateRequest,
  validateParams,
  validateQuery,
  validateFileSize,
  validateMimeType,
  
  validateFormation,
  validateFormationUpdate,
  validateInscription,
  validateInscriptionUpdate,
  validateAdmin,
  validateLogin,
  validateChangePassword,
  validateChangeRole,
  validateIdParam,
  validateDeleteAdminQuery
};
