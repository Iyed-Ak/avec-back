const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

// Connexion MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connexion à MongoDB réussie'))
.catch(err => {
  console.error('❌ Échec de connexion à MongoDB', err);
  process.exit(1);
});

// Lecture du fichier db.json
const data = JSON.parse(fs.readFileSync('db.json', 'utf-8'));

// Définir un schéma générique pour les collections
const inscriptionSchema = new mongoose.Schema({}, { strict: false });
const formationSchema = new mongoose.Schema({}, { strict: false });

// Définir les modèles
const Inscription = mongoose.model('Inscription', inscriptionSchema);
const Formation = mongoose.model('Formation', formationSchema);

async function importData() {
  try {
    // Vider les collections si elles existent déjà
    await Inscription.deleteMany();
    await Formation.deleteMany();

    // Insérer les données
    if (data.inscriptions) {
      await Inscription.insertMany(data.inscriptions);
      console.log(`✅ ${data.inscriptions.length} inscriptions importées`);
    }

    if (data.formations) {
      await Formation.insertMany(data.formations);
      console.log(`✅ ${data.formations.length} formations importées`);
    }

    process.exit();
  } catch (error) {
    console.error('❌ Erreur lors de l’importation :', error);
    process.exit(1);
  }
}

importData();
