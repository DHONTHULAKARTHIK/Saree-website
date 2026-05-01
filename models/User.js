const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  pass: { type: String, required: true },
  addresses: { type: Array, default: [] },
  savedCart: { type: Array, default: [] },
  referralCode: { type: String, unique: true, sparse: true },
  referralCount: { type: Number, default: 0 },
  referredBy: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
