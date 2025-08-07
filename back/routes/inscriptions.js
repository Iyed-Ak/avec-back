const express = require('express');
const router = express.Router();
const Inscription = require('../models/Inscription'); // Modèle Mongoose

// GET - récupérer toutes les inscriptions
router.get('/', async (req, res) => {
  try {
    const inscriptions = await Inscription.find();
    res.json(inscriptions);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des inscriptions' });
  }
});

// ➤ GET inscription par ID
router.get('/:id', async (req, res) => {
  try {
    const inscription = await Inscription.findById(req.params.id);
    if (!inscription) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }
    res.status(200).json(inscription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération' });
  }
});

// ➤ POST ajouter une inscription
router.post('/', async (req, res) => {
  try {
    const newInscription = new Inscription(req.body);
    const savedInscription = await newInscription.save();
    res.status(201).json({ message: 'Inscription reçue', inscription: savedInscription });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' });
  }
});

// ➤ PUT modifier une inscription
router.put('/:id', async (req, res) => {
  try {
    const updatedInscription = await Inscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedInscription) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }
    res.status(200).json(updatedInscription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour' });
  }
});

// ➤ DELETE supprimer une inscription
router.delete('/:id', async (req, res) => {
  try {
    const deletedInscription = await Inscription.findByIdAndDelete(req.params.id);
    if (!deletedInscription) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }
    res.status(200).json({ message: 'Inscription supprimée' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression' });
  }
});

module.exports = router;
