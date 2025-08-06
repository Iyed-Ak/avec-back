const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    level: process.env.LOG_LEVEL || 'info'
  }),
  
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/app.log'),
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    level: 'info'
  }),
  
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    level: 'error'
  }),
  
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/security.log'),
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 10,
    level: 'warn'
  })
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.label({ label: 'SECURITY' })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [SECURITY] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/security.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

const accessLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/access.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

const logSecurityEvent = (event, details = {}) => {
  const logData = {
    event,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  securityLogger.warn('Security Event', logData);
  
  if (details.severity === 'critical') {
    console.log('\n🚨 ALERTE SÉCURITÉ CRITIQUE 🚨');
    console.log(`Événement: ${event}`);
    console.log(`Détails:`, details);
    console.log('=====================================\n');
  }
};

const logAuthAttempt = (email, ip, success, details = {}) => {
  const logData = {
    event: success ? 'AUTH_SUCCESS' : 'AUTH_FAILURE',
    email,
    ip,
    success,
    timestamp: new Date().toISOString(),
    userAgent: details.userAgent,
    ...details
  };
  
  if (success) {
    securityLogger.info('Authentication Success', logData);
  } else {
    securityLogger.warn('Authentication Failure', logData);
  }
};

const logResourceAccess = (resource, action, user, ip, success = true) => {
  const logData = {
    event: 'RESOURCE_ACCESS',
    resource,
    action,
    user: user?.email || 'anonymous',
    userId: user?._id,
    ip,
    success,
    timestamp: new Date().toISOString()
  };
  
  accessLogger.info('Resource Access', logData);
  
  if (!success) {
    securityLogger.warn('Unauthorized Resource Access', logData);
  }
};

module.exports = {
  logger,
  securityLogger,
  accessLogger,
  logSecurityEvent,
  logAuthAttempt,
  logResourceAccess
};
