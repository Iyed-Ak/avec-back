const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Charger les variables d'environnement depuis le fichier .env
dotenv.config();

// Initialisation de l'application Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware pour autoriser les requêtes externes (Angular) et lire le JSON
app.use(cors());
app.use(express.json());

// Connexion à la base de données MongoDB
const connectDB = require('./config/db');
connectDB();

// Importation des routes
const formationRoutes = require('./routes/formations');
const inscriptionRoutes = require('./routes/inscriptions');
const adminRoutes = require('./routes/admin');
// Déclaration des routes
app.use('/api/formations', formationRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/admin',adminRoutes);
// Route de test
app.get('/', (req, res) => {
  res.send('✅ Le backend IFC fonctionne');
});

// Lancer le serveur
app.listen(port, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
});
