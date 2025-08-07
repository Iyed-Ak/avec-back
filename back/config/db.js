const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ifc-formation');
    console.log('✅ Connexion à MongoDB réussie');
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB :', error.message);
    console.log('💡 Mode test: Serveur démarré sans base de données');
    console.log('⚠️  Les fonctionnalités nécessitant la DB ne seront pas disponibles');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;

