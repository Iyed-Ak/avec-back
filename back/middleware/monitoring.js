const { logSecurityEvent } = require('../config/logger');

let securityMetrics = {
  loginAttempts: 0,
  failedLogins: 0,
  blockedRequests: 0,
  suspiciousActivities: 0,
  rateLimitHits: 0,
  lastReset: Date.now()
};

const ALERT_THRESHOLDS = {
  FAILED_LOGINS_PER_MINUTE: 10,
  SUSPICIOUS_ACTIVITIES_PER_MINUTE: 5,
  RATE_LIMIT_HITS_PER_MINUTE: 20,
  BLOCKED_REQUESTS_PER_MINUTE: 15
};

setInterval(() => {
  const now = Date.now();
  const timeDiff = now - securityMetrics.lastReset;
  
  if (timeDiff >= 60000) { // 1 minute
    checkAlertThresholds();
    
    securityMetrics = {
      loginAttempts: 0,
      failedLogins: 0,
      blockedRequests: 0,
      suspiciousActivities: 0,
      rateLimitHits: 0,
      lastReset: now
    };
  }
}, 60000);

const checkAlertThresholds = () => {
  if (securityMetrics.failedLogins >= ALERT_THRESHOLDS.FAILED_LOGINS_PER_MINUTE) {
    triggerAlert('HIGH_FAILED_LOGIN_RATE', {
      count: securityMetrics.failedLogins,
      threshold: ALERT_THRESHOLDS.FAILED_LOGINS_PER_MINUTE,
      severity: 'critical'
    });
  }
  
  if (securityMetrics.suspiciousActivities >= ALERT_THRESHOLDS.SUSPICIOUS_ACTIVITIES_PER_MINUTE) {
    triggerAlert('HIGH_SUSPICIOUS_ACTIVITY_RATE', {
      count: securityMetrics.suspiciousActivities,
      threshold: ALERT_THRESHOLDS.SUSPICIOUS_ACTIVITIES_PER_MINUTE,
      severity: 'high'
    });
  }
  
  if (securityMetrics.rateLimitHits >= ALERT_THRESHOLDS.RATE_LIMIT_HITS_PER_MINUTE) {
    triggerAlert('HIGH_RATE_LIMIT_HIT_RATE', {
      count: securityMetrics.rateLimitHits,
      threshold: ALERT_THRESHOLDS.RATE_LIMIT_HITS_PER_MINUTE,
      severity: 'medium'
    });
  }
  
  if (securityMetrics.blockedRequests >= ALERT_THRESHOLDS.BLOCKED_REQUESTS_PER_MINUTE) {
    triggerAlert('HIGH_BLOCKED_REQUEST_RATE', {
      count: securityMetrics.blockedRequests,
      threshold: ALERT_THRESHOLDS.BLOCKED_REQUESTS_PER_MINUTE,
      severity: 'high'
    });
  }
};

const triggerAlert = (alertType, details) => {
  const alert = {
    type: alertType,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  logSecurityEvent('SECURITY_ALERT', alert);
  
  console.log('\n🚨 ALERTE SÉCURITÉ 🚨');
  console.log(`Type: ${alertType}`);
  console.log(`Sévérité: ${details.severity?.toUpperCase()}`);
  console.log(`Détails:`, details);
  console.log(`Timestamp: ${alert.timestamp}`);
  console.log('=====================================\n');
  
  simulateWebhookAlert(alert);
};

const simulateWebhookAlert = (alert) => {
  if (alert.severity === 'critical') {
    console.log('📡 WEBHOOK SIMULÉ - Alerte critique envoyée');
    console.log('URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL');
    console.log('Payload:', JSON.stringify({
      text: `🚨 Alerte sécurité critique: ${alert.type}`,
      attachments: [{
        color: 'danger',
        fields: [
          { title: 'Type', value: alert.type, short: true },
          { title: 'Sévérité', value: alert.severity, short: true },
          { title: 'Timestamp', value: alert.timestamp, short: false }
        ]
      }]
    }, null, 2));
    console.log('=====================================\n');
  }
};

const monitoringMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  const detectAttackPatterns = () => {
    const url = req.originalUrl || req.url;
    const userAgent = req.get('User-Agent') || '';
    const body = JSON.stringify(req.body || {});
    
    const attackPatterns = {
      sqlInjection: /(\bunion\b.*\bselect\b|\bor\b.*=.*\bor\b|'.*or.*'|".*or.*")/gi,
      xss: /(<script|javascript:|onload=|onerror=|onclick=)/gi,
      pathTraversal: /(\.\.\/)|(\.\.\\)/g,
      commandInjection: /(;|\||&|`|\$\(|\${)/g,
      nosqlInjection: /(\$where|\$ne|\$gt|\$lt|\$regex)/gi
    };
    
    for (const [attackType, pattern] of Object.entries(attackPatterns)) {
      if (pattern.test(url) || pattern.test(body) || pattern.test(userAgent)) {
        securityMetrics.suspiciousActivities++;
        
        logSecurityEvent('ATTACK_PATTERN_DETECTED', {
          attackType,
          url,
          ip: req.ip,
          userAgent,
          pattern: pattern.toString(),
          severity: 'high'
        });
        
        return true;
      }
    }
    
    return false;
  };
  
  const detectMaliciousBots = () => {
    const userAgent = req.get('User-Agent') || '';
    const maliciousBotPatterns = [
      /sqlmap/gi,
      /nikto/gi,
      /nessus/gi,
      /burp/gi,
      /acunetix/gi,
      /netsparker/gi,
      /w3af/gi
    ];
    
    for (const pattern of maliciousBotPatterns) {
      if (pattern.test(userAgent)) {
        securityMetrics.blockedRequests++;
        
        logSecurityEvent('MALICIOUS_BOT_DETECTED', {
          userAgent,
          ip: req.ip,
          url: req.originalUrl || req.url,
          severity: 'critical'
        });
        
        return true;
      }
    }
    
    return false;
  };
  
  const isAttack = detectAttackPatterns();
  const isMaliciousBot = detectMaliciousBots();
  
  if (isMaliciousBot) {
    return res.status(403).json({
      error: 'Accès refusé',
      code: 'MALICIOUS_BOT_DETECTED'
    });
  }
  
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    if (req.originalUrl === '/api/admin/login' && req.method === 'POST') {
      securityMetrics.loginAttempts++;
      if (res.statusCode !== 200) {
        securityMetrics.failedLogins++;
      }
    }
    
    if (res.statusCode === 429) {
      securityMetrics.rateLimitHits++;
    }
    
    if (res.statusCode === 403 || res.statusCode === 401) {
      securityMetrics.blockedRequests++;
    }
    
    if (responseTime > 5000) {
      logSecurityEvent('SLOW_REQUEST_DETECTED', {
        url: req.originalUrl || req.url,
        responseTime,
        ip: req.ip,
        method: req.method,
        severity: 'medium'
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

const getSecurityMetrics = () => {
  return {
    ...securityMetrics,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };
};

const metricsMiddleware = (req, res, next) => {
  if (req.originalUrl === '/api/admin/security-metrics' && req.admin) {
    return res.json(getSecurityMetrics());
  }
  next();
};

module.exports = {
  monitoringMiddleware,
  metricsMiddleware,
  getSecurityMetrics,
  triggerAlert
};
