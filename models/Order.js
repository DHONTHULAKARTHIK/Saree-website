const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userEmail: { type: String, required: true },
  items: [{
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    img: { type: String },
  }],
  total: { type: Number, required: true },
  address: { type: String, required: true },
  status: { type: String, default: 'Awaiting Confirmation' },
  date: { type: Date, default: Date.now },
  paymentId:     { type: String, default: '' },
  razorpayOrderId: { type: String, default: '' },
  paymentStatus: { type: String, default: 'Pending' }  // Pending | Paid | Failed
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
