// ===================================
// MODÈLE ADMIN (models/Admin.js)
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
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  passwordChangedAt: { type: Date }
});

// Middleware pour hasher le mot de passe avant sauvegarde
adminSchema.pre('save', async function (next) {
  // Ne hasher que si le mot de passe a été modifié
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

module.exports = mongoose.model('Admin', adminSchema);