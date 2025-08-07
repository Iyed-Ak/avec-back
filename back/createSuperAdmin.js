// scripts/createSuperAdmin.js
// Script pour créer le premier Super Admin

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Schéma Admin (copié du modèle)
const adminSchema = new mongoose.Schema({
  nom: { type: String },
  prenom: { type: String },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'superAdmin'], 
    default: 'admin' 
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  passwordChangedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
});

const Admin = mongoose.model('Admin', adminSchema);

async function createSuperAdmin() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/votre-db');
    console.log('Connecté à MongoDB');

    // Données du Super Admin
    const superAdminData = {
      nom: 'Super',
      prenom: 'Admin',
      email: 'superadmin@example.com', // Changez cet email
      password: 'SuperAdmin123!', // Changez ce mot de passe
      role: 'superAdmin',
      isActive: true
    };

    // Vérifier si un Super Admin existe déjà
    const existingSuperAdmin = await Admin.findOne({ role: 'superAdmin', isActive: true });
    if (existingSuperAdmin) {
      console.log('Un Super Admin existe déjà:', existingSuperAdmin.email);
      process.exit(0);
    }

    // Hasher le mot de passe
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(superAdminData.password, saltRounds);

    // Créer le Super Admin
    const superAdmin = new Admin({
      ...superAdminData,
      password: hashedPassword
    });

    await superAdmin.save();

    console.log('✅ Super Admin créé avec succès !');
    console.log('Email:', superAdminData.email);
    console.log('Mot de passe:', superAdminData.password);
    console.log('⚠️  CHANGEZ LE MOT DE PASSE APRÈS LA PREMIÈRE CONNEXION !');

  } catch (error) {
    console.error('❌ Erreur lors de la création du Super Admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
    process.exit(0);
  }
}

createSuperAdmin();