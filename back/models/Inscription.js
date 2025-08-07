const mongoose = require('mongoose');

const inscriptionSchema = new mongoose.Schema({
  formation: {
    name: String,
    description: String,
    duration: String
  },
  user: {
    name: String,
    prenom: String,
    email: String,
    telephone: String,
    gouvernorat: String,
    ville: String,
    codePostal: String
  },
  photo: String, // base64 image string
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Inscription', inscriptionSchema);
