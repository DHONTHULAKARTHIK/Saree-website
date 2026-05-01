require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const BCRYPT_ROUNDS = 10;

const app = express();
const PORT = process.env.PORT || 3000;
const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');
const Review = require('./models/Review');
const Razorpay = require('razorpay');

// ── Razorpay Instance ──
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ── Nodemailer Transporter (declared early so all routes can use it) ──
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saree_website';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());
// Automatically serve all static HTML/CSS/JS/JPG files in the directory
app.use(express.static(__dirname, { dotfiles: 'allow' }));

// ── Request Logger ──
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toLocaleTimeString('en-IN')}] ${req.method} ${req.path}`);
  }
  next();
});

// Files are no longer used as the primary database, but we keep the logic for migration if needed.

// ── In-memory store for password reset codes (email → { code, expiry }) ──
const resetCodes = new Map();

// API: Forgot Password – Generate & email a 6-digit code
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'No account found with that email address.' });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    resetCodes.set(email, { code, expiry });

    // Send code via email
    await transporter.sendMail({
      from: `"Lakshmanna Pure Silk Sarees" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🔑 Your Password Reset Code – ${code}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: auto; border: 1px solid #c9973a; border-radius: 10px; overflow: hidden;">
          <div style="background: #1a0a00; padding: 20px 30px; text-align: center;">
            <h2 style="color: #f5d08a; margin: 0;">🔑 Password Reset</h2>
            <p style="color: rgba(255,255,255,0.6); margin: 4px 0 0;">Lakshmanna Pure Silk Sarees</p>
          </div>
          <div style="background: #fdf6ec; padding: 28px 30px; text-align: center;">
            <p style="margin: 0 0 10px; color: #333;">Use the code below to reset your password:</p>
            <div style="font-size: 2.4rem; font-weight: 700; letter-spacing: 10px; color: #1a0a00; background: #f5d08a; padding: 16px 24px; border-radius: 10px; display: inline-block; margin: 10px 0;">
              ${code}
            </div>
            <p style="color: #888; font-size: 13px; margin-top: 16px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          </div>
          <div style="background:#1a0a00; padding:12px 30px; text-align:center;">
            <p style="color:rgba(255,255,255,0.4); font-size:12px; margin:0;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
      `
    });

    console.log(`  → Reset code sent to ${email}`);
    res.status(200).json({ message: 'Reset code sent successfully.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send reset code. Please try again.' });
  }
});

// API: Verify Reset Code
app.post('/api/verify-reset-code', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' });

  const entry = resetCodes.get(email);
  if (!entry) return res.status(400).json({ error: 'No reset code found. Please request a new one.' });
  if (Date.now() > entry.expiry) {
    resetCodes.delete(email);
    return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
  }
  if (entry.code !== code.trim()) {
    return res.status(400).json({ error: 'Incorrect code. Please try again.' });
  }

  res.status(200).json({ message: 'Code verified.' });
});

// API: Reset Password (after code verified)
app.post('/api/reset-password', async (req, res) => {
  const { email, newPass } = req.body;
  if (!email || !newPass) return res.status(400).json({ error: 'Email and new password are required.' });

  // Make sure the code was verified (still in map and not expired)
  const entry = resetCodes.get(email);
  if (!entry || Date.now() > entry.expiry) {
    return res.status(400).json({ error: 'Session expired. Please restart the reset process.' });
  }

  try {
    const hashedPass = await bcrypt.hash(newPass, BCRYPT_ROUNDS);
    const user = await User.findOneAndUpdate({ email }, { pass: hashedPass }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    resetCodes.delete(email); // Invalidate code after use
    console.log(`  → Password reset for ${email}`);
    res.status(200).json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});



// API: Handle Signups (A – bcrypt hash)
app.post('/api/signup', async (req, res) => {
  const { name, email, pass } = req.body;
  if (!name || !email || !pass) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists!' });
    }

    const hashedPass = await bcrypt.hash(pass, BCRYPT_ROUNDS);

    // DD – Generate unique referral code (6 uppercase alphanumeric chars)
    let referralCode;
    let tries = 0;
    do {
      referralCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      tries++;
    } while (await User.findOne({ referralCode }) && tries < 10);

    // DD – If a referral code was used, credit the referrer
    let referredBy = '';
    if (req.body.referralCode) {
      const referrer = await User.findOneAndUpdate(
        { referralCode: req.body.referralCode.trim().toUpperCase() },
        { $inc: { referralCount: 1 } },
        { new: true }
      );
      if (referrer) referredBy = referrer.email;
    }

    const newUser = await User.create({ name, email, pass: hashedPass, referralCode, referredBy });
    res.status(201).json({ message: 'User created successfully!', user: { name: newUser.name, email: newUser.email } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// API: Handle Logins (A – bcrypt with graceful plain-text migration)
app.post('/api/login', async (req, res) => {
  const { email, pass } = req.body;
  if (!email || !pass) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    let match = false;

    // Try bcrypt first (accounts created/updated after migration)
    try { match = await bcrypt.compare(pass, user.pass); } catch { match = false; }

    // Fallback: plain-text comparison for old accounts — silently upgrade
    if (!match && pass === user.pass) {
      match = true;
      const hashed = await bcrypt.hash(pass, BCRYPT_ROUNDS);
      await User.findOneAndUpdate({ email }, { pass: hashed });
      console.log(`  → Migrated plain-text password to bcrypt for ${email}`);
    }

    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
    res.status(200).json({ message: 'Login successful!', user: { name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// API: Update Profile Name (N)
app.post('/api/update-profile', async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'Email and name are required.' });
  try {
    const user = await User.findOneAndUpdate({ email }, { name }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.status(200).json({ message: 'Profile updated.', user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// DD – Get referral info for profile dashboard
app.get('/api/referral-info', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required.' });
  try {
    const user = await User.findOne({ email }, 'referralCode referralCount referredBy');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.status(200).json({
      code: user.referralCode || null,
      count: user.referralCount || 0,
      referredBy: user.referredBy || ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch referral info.' });
  }
});

// DD – Validate a referral code (used during signup)
app.get('/api/validate-referral', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Code required.' });
  try {
    const user = await User.findOne({ referralCode: code.trim().toUpperCase() }, 'name');
    if (!user) return res.status(404).json({ error: 'Invalid referral code.' });
    res.status(200).json({ valid: true, referrerName: user.name });
  } catch (err) {
    res.status(500).json({ error: 'Validation failed.' });
  }
});

// API: Handle Password Updates (A – bcrypt with graceful plain-text migration)
app.post('/api/update-password', async (req, res) => {
  const { email, oldPass, newPass } = req.body;
  if (!email || !oldPass || !newPass) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid current password.' });

    // Try bcrypt first, fallback to plain-text for old accounts
    let match = false;
    try { match = await bcrypt.compare(oldPass, user.pass); } catch { match = false; }
    if (!match) match = (oldPass === user.pass); // plain-text fallback

    if (!match) return res.status(401).json({ error: 'Invalid current password.' });
    const hashed = await bcrypt.hash(newPass, BCRYPT_ROUNDS);
    await User.findOneAndUpdate({ email }, { pass: hashed });
    res.status(200).json({ message: 'Password updated successfully!' });
  } catch (err) {
    console.error('Password update error:', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// API: Get User Addresses
app.get('/api/addresses', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required.' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.status(200).json(user.addresses || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch addresses.' });
  }
});

// API: Update User Addresses
app.post('/api/addresses', async (req, res) => {
  const { email, addresses } = req.body;
  if (!email || !Array.isArray(addresses)) return res.status(400).json({ error: 'Invalid data.' });

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { addresses },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.status(200).json({ message: 'Addresses updated successfully!', addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update addresses.' });
  }
});

// ── PAYMENT API: Step 1 – Create a Razorpay Order ──
app.post('/api/create-payment', async (req, res) => {
  const { amount } = req.body;  // amount in INR (rupees, not paise)
  console.log(`  → Creating Razorpay order for ₹${amount}`);
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount.' });
  }

  try {
    const options = {
      amount: Math.round(amount * 100),  // Razorpay needs paise
      currency: 'INR',
      receipt: 'receipt_' + Date.now()
    };
    const order = await razorpay.orders.create(options);
    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    res.status(500).json({ error: 'Failed to initiate payment.' });
  }
});

// ── PAYMENT API: Step 2 – Verify Payment & Save Order ──
app.post('/api/verify-payment', async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userEmail,
    order      // { items, total, address }
  } = req.body;

  console.log(`  → Verifying payment: ${razorpay_payment_id} for ${userEmail}`);

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order) {
    console.log('  ✗ Missing payment details in request body');
    return res.status(400).json({ error: 'Missing payment details.' });
  }

  // ── Verify HMAC signature ──
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
  }

  // ── Signature valid → Save Order ──
  try {
    order.id = 'ORD-' + Date.now();
    order.userEmail = userEmail || 'Guest Customer';
    order.status = 'Awaiting Confirmation';
    order.date = new Date();
    order.paymentId = razorpay_payment_id;
    order.razorpayOrderId = razorpay_order_id;
    order.paymentStatus = 'Paid';

    const newOrder = await Order.create(order);

    // ── Send order notification email to owner ──
    try {
      const itemsHTML = order.items.map(i =>
        `<tr>
          <td style="padding:6px 10px;">${i.name}</td>
          <td style="padding:6px 10px; text-align:center;">${i.qty}</td>
          <td style="padding:6px 10px; text-align:right;">₹${(i.price * i.qty).toLocaleString('en-IN')}</td>
        </tr>`
      ).join('');

      const htmlBody = `
        <div style="font-family: Georgia, serif; max-width: 620px; margin: auto; border: 1px solid #c9973a; border-radius: 10px; overflow: hidden;">
          <div style="background: #1a0a00; padding: 20px 30px; text-align: center;">
            <h2 style="color: #f5d08a; margin: 0;">💳 New Paid Order Received!</h2>
            <p style="color: rgba(255,255,255,0.6); margin: 4px 0 0;">Lakshmanna Pure Silk Sarees</p>
          </div>
          <div style="background: #fdf6ec; padding: 25px 30px;">
            <p style="margin:0 0 6px;"><strong>Order ID:</strong> ${order.id}</p>
            <p style="margin:0 0 6px;"><strong>Customer:</strong> ${order.userEmail}</p>
            <p style="margin:0 0 6px;"><strong>Razorpay Payment ID:</strong> ${razorpay_payment_id}</p>
            <p style="margin:0 0 18px;"><strong>Date:</strong> ${new Date(order.date).toLocaleString('en-IN')}</p>

            <table style="width:100%; border-collapse:collapse; font-size:14px; background:#fff; border-radius:6px; overflow:hidden;">
              <thead>
                <tr style="background:#1a0a00; color:#f5d08a;">
                  <th style="padding:8px 10px; text-align:left;">Item</th>
                  <th style="padding:8px 10px; text-align:center;">Qty</th>
                  <th style="padding:8px 10px; text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>${itemsHTML}</tbody>
            </table>

            <div style="text-align:right; margin-top:12px; font-size:16px;">
              <strong>Total: ₹${order.total.toLocaleString('en-IN')}</strong>
            </div>

            <hr style="border: 1px solid #e0c87a; margin: 18px 0;"/>
            <p style="font-size:14px; color:#555;"><strong>📍 Delivery Address:</strong></p>
            <p style="background:#fff; border-left:4px solid #c9973a; padding:10px 14px; border-radius:6px; color:#333; white-space:pre-wrap;">${order.address}</p>

            <div style="background:#e8f5e9; border-left:4px solid #4caf50; padding:10px 14px; border-radius:6px; margin-top:12px;">
              <strong style="color:#2e7d32;">✅ Payment Received</strong>
              <p style="margin:4px 0 0; font-size:13px; color:#388e3c;">Payment ID: ${razorpay_payment_id}</p>
            </div>
          </div>
          <div style="background:#1a0a00; padding:12px 30px; text-align:center;">
            <p style="color:rgba(255,255,255,0.4); font-size:12px; margin:0;">Log in to the Admin Portal to Accept or Reject this order.</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"Lakshmanna Sarees Website" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `💳 Paid Order ${order.id} – ₹${order.total.toLocaleString('en-IN')} from ${order.userEmail}`,
        html: htmlBody
      });
    } catch (mailErr) {
      console.error('Order email failed:', mailErr.message);
      // Still confirm the order even if email fails
    }

    // ── Send confirmation email to customer (if not a guest) ──
    if (userEmail && userEmail !== 'Guest Customer') {
      try {
        await transporter.sendMail({
          from: `"Lakshmanna Pure Silk Sarees" <${process.env.EMAIL_USER}>`,
          to: userEmail,
          subject: `✅ Order Confirmed – ${order.id}`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 620px; margin: auto; border: 1px solid #c9973a; border-radius: 10px; overflow: hidden;">
              <div style="background: #1a0a00; padding: 20px 30px; text-align: center;">
                <h2 style="color: #f5d08a; margin: 0;">✅ Thank You for Your Order!</h2>
                <p style="color: rgba(255,255,255,0.6); margin: 4px 0 0;">Lakshmanna Pure Silk Sarees</p>
              </div>
              <div style="background: #fdf6ec; padding: 25px 30px;">
                <p>Dear Customer,</p>
                <p>Your order has been placed successfully. We'll notify you once it's confirmed.</p>
                <p style="margin:0 0 6px;"><strong>Order ID:</strong> ${order.id}</p>
                <p style="margin:0 0 6px;"><strong>Total Paid:</strong> ₹${order.total.toLocaleString('en-IN')}</p>
                <p style="margin:0 0 18px;"><strong>Payment:</strong> Online (Razorpay)</p>
                <p style="font-size:13px; color:#666;">You can track your order status by visiting <strong>My Profile → My Orders</strong> on our website.</p>
              </div>
              <div style="background:#1a0a00; padding:12px 30px; text-align:center;">
                <p style="color:rgba(255,255,255,0.4); font-size:12px; margin:0;">Lakshmanna Pure Silk Sarees · Dharmavaram</p>
              </div>
            </div>
          `
        });
      } catch (custMailErr) {
        console.error('Customer confirmation email failed:', custMailErr.message);
      }
    }

    res.status(201).json({ message: 'Payment verified & order placed!', orderId: newOrder.id });
  } catch (err) {
    console.error('Order save error after payment:', err);
    res.status(500).json({ error: 'Payment received but failed to save order. Please contact us.' });
  }
});

// Orders file logic kept for migration reference

// API: Place an Order (legacy / COD fallback — kept for admin use)
app.post('/api/orders', async (req, res) => {
  const { userEmail, order } = req.body;
  if (!userEmail || !order) return res.status(400).json({ error: 'Missing order details.' });

  try {
    order.id = 'ORD-' + Date.now();
    order.userEmail = userEmail;
    order.status = 'Awaiting Confirmation';
    order.date = new Date();
    order.paymentStatus = 'COD';

    const newOrder = await Order.create(order);

    // ── Send order notification email to owner ──
    try {
      const itemsHTML = order.items.map(i =>
        `<tr>
        <td style="padding:6px 10px;">${i.name}</td>
        <td style="padding:6px 10px; text-align:center;">${i.qty}</td>
        <td style="padding:6px 10px; text-align:right;">₹${(i.price * i.qty).toLocaleString('en-IN')}</td>
      </tr>`
      ).join('');

      const htmlBody = `
      <div style="font-family: Georgia, serif; max-width: 620px; margin: auto; border: 1px solid #c9973a; border-radius: 10px; overflow: hidden;">
        <div style="background: #1a0a00; padding: 20px 30px; text-align: center;">
          <h2 style="color: #f5d08a; margin: 0;">🛒 New Order Received!</h2>
          <p style="color: rgba(255,255,255,0.6); margin: 4px 0 0;">Lakshmanna Pure Silk Sarees</p>
        </div>
        <div style="background: #fdf6ec; padding: 25px 30px;">
          <p style="margin:0 0 6px;"><strong>Order ID:</strong> ${order.id}</p>
          <p style="margin:0 0 6px;"><strong>Customer:</strong> ${userEmail}</p>
          <p style="margin:0 0 18px;"><strong>Date:</strong> ${new Date(order.date).toLocaleString('en-IN')}</p>

          <table style="width:100%; border-collapse:collapse; font-size:14px; background:#fff; border-radius:6px; overflow:hidden;">
            <thead>
              <tr style="background:#1a0a00; color:#f5d08a;">
                <th style="padding:8px 10px; text-align:left;">Item</th>
                <th style="padding:8px 10px; text-align:center;">Qty</th>
                <th style="padding:8px 10px; text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
          </table>

          <div style="text-align:right; margin-top:12px; font-size:16px;">
            <strong>Total: ₹${order.total.toLocaleString('en-IN')}</strong>
          </div>

          <hr style="border: 1px solid #e0c87a; margin: 18px 0;"/>
          <p style="font-size:14px; color:#555;"><strong>📍 Delivery Address:</strong></p>
          <p style="background:#fff; border-left:4px solid #c9973a; padding:10px 14px; border-radius:6px; color:#333; white-space:pre-wrap;">${order.address}</p>
        </div>
        <div style="background:#1a0a00; padding:12px 30px; text-align:center;">
          <p style="color:rgba(255,255,255,0.4); font-size:12px; margin:0;">Log in to the Admin Portal to Accept or Reject this order.</p>
        </div>
      </div>
    `;

      await transporter.sendMail({
        from: `"Lakshmanna Sarees Website" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `🛒 New Order ${order.id} – ₹${order.total.toLocaleString('en-IN')} from ${userEmail}`,
        html: htmlBody
      });
    } catch (mailErr) {
      console.error('Order email failed:', mailErr.message);
      // Still confirm the order even if email fails
    }

    // ── Send confirmation email to customer (if not a guest) ──
    if (userEmail && userEmail !== 'Guest Customer') {
      try {
        await transporter.sendMail({
          from: `"Lakshmanna Pure Silk Sarees" <${process.env.EMAIL_USER}>`,
          to: userEmail,
          subject: `✅ Order Confirmed – ${order.id} (Cash on Delivery)`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 620px; margin: auto; border: 1px solid #c9973a; border-radius: 10px; overflow: hidden;">
              <div style="background: #1a0a00; padding: 20px 30px; text-align: center;">
                <h2 style="color: #f5d08a; margin: 0;">✅ Order Placed – COD</h2>
                <p style="color: rgba(255,255,255,0.6); margin: 4px 0 0;">Lakshmanna Pure Silk Sarees</p>
              </div>
              <div style="background: #fdf6ec; padding: 25px 30px;">
                <p>Dear Customer,</p>
                <p>Your Cash on Delivery order has been placed. You'll pay when it arrives at your door.</p>
                <p style="margin:0 0 6px;"><strong>Order ID:</strong> ${order.id}</p>
                <p style="margin:0 0 6px;"><strong>Total (COD):</strong> ₹${order.total.toLocaleString('en-IN')}</p>
                <p style="margin:0 0 18px;"><strong>Payment:</strong> Cash on Delivery</p>
                <p style="font-size:13px; color:#666;">Track your order via <strong>My Profile → My Orders</strong> on our website.</p>
              </div>
              <div style="background:#1a0a00; padding:12px 30px; text-align:center;">
                <p style="color:rgba(255,255,255,0.4); font-size:12px; margin:0;">Lakshmanna Pure Silk Sarees · Dharmavaram</p>
              </div>
            </div>
          `
        });
      } catch (custMailErr) {
        console.error('Customer COD confirmation email failed:', custMailErr.message);
      }
    }

    res.status(201).json({ message: 'Order placed successfully!', orderId: newOrder.id });
  } catch (err) {
    console.error('Order placement error:', err);
    res.status(500).json({ error: 'Failed to place order.' });
  }
});


// API: Get My Orders
app.get('/api/my-orders', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Email required.' });

  try {
    const orders = await Order.find({ userEmail: email }).sort({ date: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// API: Admin Get All Orders (B – admin secret token)
app.get('/api/all-orders', async (req, res) => {
  const token = req.query.token || req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  try {
    const orders = await Order.find().sort({ date: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// API: Admin Update Order Status (P – full lifecycle)
app.post('/api/update-order-status', async (req, res) => {
  const { token, orderId, status } = req.body;
  if (token !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Admin access required.' });
  const allowed = ['Accepted', 'Rejected', 'Dispatched', 'Delivered'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

  try {
    const order = await Order.findOneAndUpdate(
      { id: orderId },
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // ── Notify customer of status change ──
    if (order.userEmail && order.userEmail !== 'Guest Customer') {
      const emoji = status === 'Accepted' ? '🎉' : status === 'Rejected' ? '❌' : '🔄';
      const colour = status === 'Accepted' ? '#2e7d32' : status === 'Rejected' ? '#c62828' : '#555';
      const bgCol = status === 'Accepted' ? '#e8f5e9' : status === 'Rejected' ? '#ffebee' : '#fff3e0';
      try {
        await transporter.sendMail({
          from: `"Lakshmanna Pure Silk Sarees" <${process.env.EMAIL_USER}>`,
          to: order.userEmail,
          subject: `${emoji} Your Order ${order.id} has been ${status}`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 620px; margin: auto; border: 1px solid #c9973a; border-radius: 10px; overflow: hidden;">
              <div style="background: #1a0a00; padding: 20px 30px; text-align: center;">
                <h2 style="color: #f5d08a; margin: 0;">${emoji} Order ${status}</h2>
                <p style="color: rgba(255,255,255,0.6); margin: 4px 0 0;">Lakshmanna Pure Silk Sarees</p>
              </div>
              <div style="background: #fdf6ec; padding: 25px 30px;">
                <p>Dear Customer,</p>
                <div style="background:${bgCol}; border-left:4px solid ${colour}; padding:12px 16px; border-radius:6px; margin-bottom:16px;">
                  <strong style="color:${colour};">Your order has been <u>${status}</u>.</strong>
                </div>
                <p style="margin:0 0 6px;"><strong>Order ID:</strong> ${order.id}</p>
                <p style="margin:0 0 18px;"><strong>Total:</strong> ₹${order.total.toLocaleString('en-IN')}</p>
                ${status === 'Rejected' ? '<p style="color:#c62828; font-size:13px;">If you have questions, please contact us via the Contact page on our website.</p>' : '<p style="font-size:13px; color:#666;">Thank you for shopping with us! Your saree will be dispatched shortly.</p>'}
              </div>
              <div style="background:#1a0a00; padding:12px 30px; text-align:center;">
                <p style="color:rgba(255,255,255,0.4); font-size:12px; margin:0;">Lakshmanna Pure Silk Sarees · Dharmavaram</p>
              </div>
            </div>
          `
        });
      } catch (notifyErr) {
        console.error('Status notification email failed:', notifyErr.message);
      }
    }

    res.status(200).json({ message: 'Order status updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// ── Nodemailer Transporter is declared near the top of server.js ──

// API: Contact Form → Send Email to Owner
app.post('/api/contact', async (req, res) => {
  const { name, phone, email, interest, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ error: 'Name and message are required.' });
  }

  const interestLine = interest ? `<tr><td><strong>Interested In:</strong></td><td>${interest}</td></tr>` : '';
  const phoneLine = phone ? `<tr><td><strong>Phone:</strong></td><td>${phone}</td></tr>` : '';
  const emailLine = email ? `<tr><td><strong>Email:</strong></td><td>${email}</td></tr>` : '';

  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: auto; border: 1px solid #c9973a; border-radius: 10px; overflow: hidden;">
      <div style="background: #1a0a00; padding: 20px 30px; text-align: center;">
        <h2 style="color: #f5d08a; margin: 0;">📩 New Contact Message</h2>
        <p style="color: rgba(255,255,255,0.6); margin: 4px 0 0;">Lakshmanna Pure Silk Sarees – Website Enquiry</p>
      </div>
      <div style="background: #fdf6ec; padding: 25px 30px;">
        <table style="width:100%; border-collapse:collapse; font-size:15px;">
          <tr><td style="padding:8px 0;"><strong>Name:</strong></td><td>${name}</td></tr>
          ${phoneLine}
          ${emailLine}
          ${interestLine}
        </table>
        <hr style="border: 1px solid #e0c87a; margin: 18px 0;"/>
        <p style="font-size:14px; color:#555;"><strong>Message:</strong></p>
        <p style="background:#fff; border-left: 4px solid #c9973a; padding: 12px 16px; border-radius: 6px; color: #333; font-size:15px; white-space: pre-wrap;">${message}</p>
      </div>
      <div style="background: #1a0a00; padding: 12px 30px; text-align: center;">
        <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0;">Sent via lakshmanna-sarees.com contact form</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Lakshmanna Sarees Website" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: email || process.env.EMAIL_USER,
      subject: `📩 New Enquiry from ${name} – Lakshmanna Sarees`,
      html: htmlBody
    });
    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: 'Failed to send email. Please try again later.' });
  }
});

// CC: Newsletter subscribe
const newsletterEmails = new Set(); // In-memory; persists until server restart
app.post('/api/newsletter-subscribe', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email.' });
  if (newsletterEmails.has(email.toLowerCase())) {
    return res.status(409).json({ error: 'Already subscribed!' });
  }
  newsletterEmails.add(email.toLowerCase());
  console.log(`  → Newsletter subscription: ${email}`);
  res.status(200).json({ message: 'Subscribed successfully!' });
});

app.get('/api/newsletter-list', (req, res) => {
  const token = req.query.token;
  if (token !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Admin only.' });
  res.status(200).json([...newsletterEmails]);
});

// U: Admin – Get all registered users

app.get('/api/all-users', async (req, res) => {
  const token = req.query.token || req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Admin access required.' });
  try {
    const users = await User.find({}, 'name email createdAt').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// G: Validate coupon code

const COUPONS = {
  'SILK10': { type: 'pct', value: 10, description: '10% off' },
  'SILK20': { type: 'pct', value: 20, description: '20% off' },
  'NEWUSER': { type: 'flat', value: 500, description: '₹500 off' },
  'SPECIAL15': { type: 'pct', value: 15, description: '15% off' },
};
app.post('/api/validate-coupon', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided.' });
  const coupon = COUPONS[code.trim().toUpperCase()];
  if (!coupon) return res.status(404).json({ error: `"${code}" is not a valid coupon code.` });
  res.status(200).json({ code: code.toUpperCase(), ...coupon });
});

// O: Save cart to DB for logged-in users
app.post('/api/save-cart', async (req, res) => {
  const { email, cart } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required.' });
  try {
    await User.findOneAndUpdate({ email }, { savedCart: cart }, { new: true });
    res.status(200).json({ message: 'Cart saved.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save cart.' });
  }
});

app.get('/api/load-cart', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required.' });
  try {
    const user = await User.findOne({ email });
    res.status(200).json({ cart: user?.savedCart || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load cart.' });
  }
});

// API: Cancel Order
app.post('/api/cancel-order', async (req, res) => {
  const { email, orderId } = req.body;
  if (!email || !orderId) return res.status(400).json({ error: 'Email and Order ID required.' });
  try {
    const order = await Order.findOne({ id: orderId, userEmail: email });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.status !== 'Awaiting Confirmation') return res.status(400).json({ error: 'Order cannot be cancelled at this stage.' });

    order.status = 'Cancelled';
    await order.save();
    res.status(200).json({ message: 'Order cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel order.' });
  }
});

// API: Get Reviews
app.get('/api/reviews/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId }).sort({ date: -1 });
    res.status(200).json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

// API: Add Review
app.post('/api/add-review', async (req, res) => {
  const { productId, userEmail, userName, rating, comment } = req.body;
  if (!productId || !userEmail || !rating || !comment) return res.status(400).json({ error: 'Missing required fields.' });
  try {
    const newReview = await Review.create({ productId, userEmail, userName, rating, comment });
    res.status(201).json({ message: 'Review added successfully.', review: newReview });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add review.' });
  }
});

// Start the server

app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`Backend Server Running!`);
  console.log(`Website is now hosted at: http://localhost:${PORT}`);
  console.log(`MongoDB connection string: ${MONGODB_URI}`);
  console.log(`Razorpay Key ID: ${process.env.RAZORPAY_KEY_ID}`);
  console.log(`=============================================`);
});
