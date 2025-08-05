# 🛡️ Documentation de Sécurité - Backend IFC Formation

## Vue d'ensemble

Ce document décrit les mesures de sécurité implémentées dans le backend Node.js/Express de l'application IFC Formation. Les améliorations suivent les recommandations **OWASP Top 10** et les meilleures pratiques de sécurité Node.js.

## 📋 Table des matières

1. [Rate Limiting](#rate-limiting)
2. [Sanitisation des entrées](#sanitisation)
3. [Monitoring et logging](#monitoring)
4. [Hardening système](#hardening)
5. [Authentification et autorisation](#auth)
6. [Protection des données](#data-protection)
7. [Configuration de sécurité](#security-config)
8. [Tests de sécurité](#security-tests)

## 🚦 Rate Limiting

### Qu'est-ce que le Rate Limiting ?

Le **Rate Limiting** est une technique qui limite le nombre de requêtes qu'un client peut effectuer vers le serveur dans une période donnée. Cela prévient :

- **Attaques par force brute** (tentatives de connexion répétées)
- **Attaques DDoS** (déni de service distribué)
- **Abus d'API** (utilisation excessive des ressources)
- **Scraping automatisé** des données

### Implémentation

```javascript
// Limiteur général : 100 requêtes par 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite par IP
  message: 'Trop de requêtes, réessayez dans 15 minutes'
});

// Limiteur strict pour login admin : 5 tentatives par 15 minutes
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true // Ne compte que les échecs
});

// Limiteur pour inscriptions : 10 par heure
const inscriptionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10
});
```

### Configuration

- **Routes publiques** : 100 req/15min par IP
- **Connexion admin** : 5 tentatives/15min par IP
- **Inscriptions** : 10 inscriptions/heure par IP
- **Ralentissement progressif** : Délai croissant après 50 requêtes

## 🧹 Sanitisation des entrées

### Qu'est-ce que la Sanitisation ?

La **sanitisation** est le processus de nettoyage et validation des données d'entrée pour supprimer ou neutraliser les éléments dangereux. Elle prévient :

- **Attaques XSS** (Cross-Site Scripting)
- **Injection SQL/NoSQL**
- **Injection de commandes**
- **Traversée de répertoires**

### Types de validation implémentés

#### 1. Validation syntaxique
```javascript
// Email valide
body('email').isEmail().normalizeEmail()

// Mot de passe fort
body('password')
  .isLength({ min: 8, max: 128 })
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
```

#### 2. Validation sémantique
```javascript
// Nom avec caractères autorisés uniquement
body('nom').matches(/^[a-zA-ZÀ-ÿ\s-']+$/)

// Téléphone au format valide
body('telephone').matches(/^[+]?[0-9\s-()]{8,20}$/)
```

#### 3. Sanitisation XSS
```javascript
// Suppression des balises HTML dangereuses
const sanitizeXSS = (req, res, next) => {
  // Nettoie automatiquement req.body, req.query, req.params
  sanitizeObject(req.body);
  next();
};
```

#### 4. Protection MongoDB
```javascript
// Prévient l'injection NoSQL
app.use(mongoSanitize());
```

### Schémas de validation

- **Admin** : Email, mot de passe fort, nom/prénom alphanumériques
- **Formation** : Titre, descriptions avec limites de caractères
- **Inscription** : Données personnelles validées, email vérifié
- **IDs MongoDB** : Validation du format ObjectId

## 📊 Monitoring et Logging

### Qu'est-ce que le Monitoring ?

Le **monitoring** est la surveillance continue des activités du système pour détecter et répondre aux menaces de sécurité en temps réel. Il permet :

- **Détection d'intrusions**
- **Analyse des comportements suspects**
- **Audit des accès aux données**
- **Alertes de sécurité automatiques**

### Système de logging Winston

#### Configuration des logs
```javascript
// Logs séparés par niveau
- error.log      // Erreurs uniquement
- combined.log   // Tous les logs
- security.log   // Événements de sécurité
```

#### Types d'événements loggés

1. **Authentification**
   ```javascript
   logAuthAttempt(email, ip, success, details)
   ```

2. **Accès aux données**
   ```javascript
   logDataAccess(adminId, action, resource, details)
   ```

3. **Activités suspectes**
   ```javascript
   logSuspiciousActivity(type, ip, details)
   ```

4. **Rate limiting**
   ```javascript
   logRateLimitHit(ip, endpoint, details)
   ```

### Détection d'activités suspectes

Le système détecte automatiquement :
- **Tentatives d'injection SQL/NoSQL**
- **Payloads XSS**
- **Traversée de répertoires**
- **Commandes système**
- **User-agents suspects** (outils de hacking)
- **Headers malveillants**

## 🔒 Hardening Système

### Qu'est-ce que le Hardening ?

Le **hardening** (durcissement) consiste à sécuriser le système en :
- Configurant des **headers de sécurité**
- Gérant les **variables d'environnement** sensibles
- Appliquant le **principe du moindre privilège**
- Désactivant les **fonctionnalités non nécessaires**

### Headers de sécurité Helmet

```javascript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 an
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
})
```

### Protection contre la surcharge

```javascript
// Détection de surcharge serveur
if (toobusy()) {
  return res.status(503).json({
    error: 'Serveur temporairement surchargé'
  });
}
```

### Validation des variables d'environnement

```javascript
const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Variables manquantes:', missingEnvVars);
  process.exit(1);
}
```

## 🔐 Authentification et Autorisation

### JWT sécurisé

- **Secret fort** : Minimum 32 caractères aléatoires
- **Expiration** : 24h par défaut
- **Validation stricte** : Vérification issuer/subject
- **Logging** : Toutes les tentatives d'authentification

### Contrôle d'accès

- **Routes publiques** : Formations (lecture), Inscriptions (création)
- **Routes admin** : Gestion formations, gestion inscriptions, administration
- **Routes super-admin** : Création/suppression d'admins

### Hachage des mots de passe

```javascript
// bcrypt avec 12 rounds (très sécurisé)
const saltRounds = 12;
this.password = await bcrypt.hash(this.password, saltRounds);
```

## 🛡️ Protection des données

### Chiffrement
- **Mots de passe** : bcrypt avec salt de 12 rounds
- **Tokens JWT** : Signés avec secret fort
- **Communications** : HTTPS recommandé en production

### Validation des données
- **Taille limitée** : Payloads max 10MB
- **Types validés** : Schémas stricts pour chaque endpoint
- **Sanitisation** : Suppression automatique des éléments dangereux

### Audit trail
- **Toutes les actions admin** sont loggées
- **Accès aux données** tracés avec timestamp
- **Tentatives d'intrusion** enregistrées

## ⚙️ Configuration de sécurité

### Variables d'environnement requises

```bash
# Obligatoires
JWT_SECRET=secret_fort_minimum_32_caracteres
MONGO_URI=mongodb://localhost:27017/ifc-formation

# Optionnelles
NODE_ENV=production
LOG_LEVEL=info
FRONTEND_URL=https://votre-domaine.com
```

### CORS sécurisé

```javascript
const corsOptions = {
  origin: [
    'http://localhost:4200',  // Dev
    process.env.FRONTEND_URL  // Production
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  maxAge: 86400 // Cache 24h
};
```

## 🧪 Tests de sécurité

### Tests recommandés

1. **Test d'authentification**
   ```bash
   # Tester route protégée sans token
   curl -X GET http://localhost:3000/api/formations -H "Content-Type: application/json"
   # Doit retourner 401
   ```

2. **Test de rate limiting**
   ```bash
   # Faire 6 tentatives de connexion rapides
   for i in {1..6}; do
     curl -X POST http://localhost:3000/api/admin/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@test.com","password":"wrong"}'
   done
   # La 6ème doit être bloquée (429)
   ```

3. **Test de sanitisation XSS**
   ```bash
   curl -X POST http://localhost:3000/api/inscriptions \
     -H "Content-Type: application/json" \
     -d '{"user":{"name":"<script>alert(1)</script>","email":"test@test.com"}}'
   # Le script doit être supprimé
   ```

4. **Test d'injection NoSQL**
   ```bash
   curl -X POST http://localhost:3000/api/admin/login \
     -H "Content-Type: application/json" \
     -d '{"email":{"$ne":""},"password":{"$ne":""}}'
   # Doit être bloqué par la sanitisation
   ```

### Outils de test recommandés

- **OWASP ZAP** : Scanner de vulnérabilités web
- **Burp Suite** : Test d'intrusion manuel
- **npm audit** : Vérification des dépendances
- **Snyk** : Analyse de sécurité du code

## 🚨 Réponse aux incidents

### Alertes automatiques

Le système génère des alertes pour :
- **Tentatives de connexion multiples échouées**
- **Payloads malveillants détectés**
- **Dépassement des limites de rate limiting**
- **Erreurs système critiques**

### Actions recommandées

1. **Surveillance des logs** : Vérifier quotidiennement `security.log`
2. **Mise à jour régulière** : Dépendances et système
3. **Backup sécurisé** : Base de données chiffrée
4. **Tests de pénétration** : Audit sécurité périodique

## 📞 Contact sécurité

Pour signaler une vulnérabilité de sécurité :
- **Email** : security@ifc-formation.com
- **Délai de réponse** : 48h maximum
- **Divulgation responsable** : Merci de nous contacter avant publication

---

*Dernière mise à jour : Août 2025*
*Version : 1.0*
