const winston = require('winston');
const path = require('path');

// ===================================
// ===================================

const logsDir = path.join(__dirname, '../logs');

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'ifc-backend' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.label({ label: 'SECURITY' })
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    })
  ]
});

const logSecurityEvent = (event, details = {}) => {
  securityLogger.info({
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

const logAuthAttempt = (email, ip, success, details = {}) => {
  logSecurityEvent('AUTH_ATTEMPT', {
    email,
    ip,
    success,
    userAgent: details.userAgent,
    ...details
  });
};

const logRateLimitHit = (ip, endpoint, details = {}) => {
  logSecurityEvent('RATE_LIMIT_HIT', {
    ip,
    endpoint,
    timestamp: new Date().toISOString(),
    ...details
  });
};

const logSuspiciousActivity = (type, ip, details = {}) => {
  securityLogger.warn({
    event: 'SUSPICIOUS_ACTIVITY',
    type,
    ip,
    timestamp: new Date().toISOString(),
    ...details
  });
};

const logDataAccess = (adminId, action, resource, details = {}) => {
  logSecurityEvent('DATA_ACCESS', {
    adminId,
    action,
    resource,
    timestamp: new Date().toISOString(),
    ...details
  });
};

const httpLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    if (res.statusCode >= 400) {
      if (res.statusCode === 401 || res.statusCode === 403) {
        logSecurityEvent('UNAUTHORIZED_ACCESS', logData);
      } else if (res.statusCode === 429) {
        logRateLimitHit(req.ip, req.url, logData);
      } else {
        logger.error('HTTP Error', logData);
      }
    } else {
      logger.info('HTTP Request', logData);
    }
  });
  
  next();
};

const fs = require('fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = {
  logger,
  securityLogger,
  httpLogger,
  logSecurityEvent,
  logAuthAttempt,
  logRateLimitHit,
  logSuspiciousActivity,
  logDataAccess
};
