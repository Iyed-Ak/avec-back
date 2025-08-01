// ===================================
// MODÈLE ADMIN AVEC RÔLES (models/Admin.js)
// ===================================

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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

// Middleware pour hasher le mot de passe avant sauvegarde
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour vérifier si c'est un super admin
adminSchema.methods.isSuperAdmin = function() {
  return this.role === 'superAdmin';
};

// Méthode pour vérifier les permissions
adminSchema.methods.canDeleteAdmin = function() {
  return this.role === 'superAdmin';
};

adminSchema.methods.canCreateAdmin = function() {
  return this.role === 'superAdmin';
};

module.exports = mongoose.model('Admin', adminSchema);