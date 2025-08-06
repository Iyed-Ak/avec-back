const morgan = require('morgan');
const { logger, securityLogger, logSecurityEvent, logAuthAttempt, logResourceAccess } = require('../config/logger');

const morganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

const accessLogMiddleware = morgan(morganFormat, {
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  }
});

const securityLogMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  const requestInfo = {
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    timestamp: new Date().toISOString(),
    sessionId: req.sessionID,
    headers: {
      authorization: req.get('Authorization') ? '[PRESENT]' : '[ABSENT]',
      'x-forwarded-for': req.get('X-Forwarded-For'),
      'x-real-ip': req.get('X-Real-IP')
    }
  };
  
  const suspiciousPatterns = [
    /\.\.\//g, // Path traversal
    /<script/gi, // XSS
    /union.*select/gi, // SQL injection
    /javascript:/gi, // JavaScript injection
    /\$where/gi, // NoSQL injection
    /\$ne/gi, // NoSQL injection
    /eval\(/gi, // Code injection
    /exec\(/gi // Command injection
  ];
  
  const urlString = req.originalUrl || req.url;
  const bodyString = JSON.stringify(req.body || {});
  
  let suspiciousActivity = false;
  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(urlString) || pattern.test(bodyString)) {
      suspiciousActivity = true;
      logSecurityEvent('SUSPICIOUS_PATTERN_DETECTED', {
        pattern: pattern.toString(),
        url: urlString,
        ip: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        severity: 'high'
      });
    }
  });
  
  const sensitiveFiles = [
    '.env', 'config', 'admin', 'backup', '.git', 'database',
    'passwd', 'shadow', 'htaccess', 'web.config'
  ];
  
  sensitiveFiles.forEach(file => {
    if (urlString.toLowerCase().includes(file)) {
      logSecurityEvent('SENSITIVE_FILE_ACCESS_ATTEMPT', {
        file,
        url: urlString,
        ip: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        severity: 'critical'
      });
    }
  });
  
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    const responseInfo = {
      statusCode: res.statusCode,
      responseTime,
      contentLength: res.get('Content-Length')
    };
    
    if (res.statusCode === 401) {
      logSecurityEvent('UNAUTHORIZED_ACCESS', {
        ...requestInfo,
        ...responseInfo,
        severity: 'medium'
      });
    }
    
    if (res.statusCode === 403) {
      logSecurityEvent('FORBIDDEN_ACCESS', {
        ...requestInfo,
        ...responseInfo,
        severity: 'medium'
      });
    }
    
    if (res.statusCode >= 500) {
      logSecurityEvent('SERVER_ERROR', {
        ...requestInfo,
        ...responseInfo,
        severity: 'high'
      });
    }
    
    if (suspiciousActivity) {
      logSecurityEvent('SUSPICIOUS_REQUEST', {
        ...requestInfo,
        ...responseInfo,
        severity: 'high'
      });
    }
    
    if (urlString.startsWith('/api/admin')) {
      const user = req.admin || null;
      logResourceAccess('admin', req.method, user, requestInfo.ip, res.statusCode < 400);
    }
    
    if (urlString.startsWith('/api/formations') && req.method !== 'GET') {
      const user = req.admin || null;
      logResourceAccess('formations', req.method, user, requestInfo.ip, res.statusCode < 400);
    }
    
    if (urlString.startsWith('/api/inscriptions') && req.method !== 'GET') {
      const user = req.admin || null;
      logResourceAccess('inscriptions', req.method, user, requestInfo.ip, res.statusCode < 400);
    }
    
    if (process.env.NODE_ENV === 'development') {
      logger.info('Request processed', {
        ...requestInfo,
        ...responseInfo
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

const authLogMiddleware = (req, res, next) => {
  if (req.originalUrl === '/api/admin/login' && req.method === 'POST') {
    const originalSend = res.send;
    res.send = function(data) {
      const success = res.statusCode === 200;
      const email = req.body?.email || 'unknown';
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      logAuthAttempt(email, ip, success, {
        userAgent,
        statusCode: res.statusCode
      });
      
      if (!success) {
        logSecurityEvent('LOGIN_FAILURE', {
          email,
          ip,
          userAgent,
          statusCode: res.statusCode,
          severity: 'medium'
        });
      }
      
      return originalSend.call(this, data);
    };
  }
  
  next();
};

module.exports = {
  accessLogMiddleware,
  securityLogMiddleware,
  authLogMiddleware
};
