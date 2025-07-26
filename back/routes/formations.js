const express = require('express');
const router = express.Router();
const Formation = require('../models/Formation');

// ✅ GET toutes les formations
router.get('/', async (req, res) => {
  try {
    const formations = await Formation.find();
    res.json(formations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ GET formation par ID
router.get('/:id', async (req, res) => {
  try {
    const formation = await Formation.findById(req.params.id);
    if (!formation) return res.status(404).json({ message: 'Formation non trouvée' });
    res.json(formation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ POST créer une nouvelle formation
router.post('/', async (req, res) => {
  const newFormation = new Formation(req.body);
  try {
    const saved = await newFormation.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ✅ PUT mise à jour d'une formation
router.put('/:id', async (req, res) => {
  try {
    const updated = await Formation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Formation non trouvée' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ✅ DELETE suppression d'une formation
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Formation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Formation non trouvée' });
    res.json({ message: 'Formation supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
