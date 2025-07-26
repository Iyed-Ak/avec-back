const mongoose = require('mongoose');

const formationSchema = new mongoose.Schema({
  image: String,
  name: String,
  shortDescription: String,
  fullDescription: String,
  duration: String,
  price: String,
  freq: String,
  cert: String,
  images: [String],
  goals: [String],
  content: [String],
  benefits: [String],
  faq: [
    {
      question: String,
      answer: String,
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Formation', formationSchema);
