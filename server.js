require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'users.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Middleware
app.use(cors());
app.use(express.json());
// Automatically serve all static HTML/CSS/JS/JPG files in the directory
app.use(express.static(__dirname));

// Helper function to read the physical users.json file
function readUsers() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, '[]');
  }
  const data = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(data || '[]');
}

// Helper function to write to the physical users.json file
function writeUsers(users) {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

// API: Handle Signups
app.post('/api/signup', (req, res) => {
  const { name, email, pass } = req.body;
  if (!name || !email || !pass) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const users = readUsers();
  
  // Check if email already exists
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'An account with this email already exists!' });
  }

  // Save new user
  users.push({ name, email, pass });
  writeUsers(users);

  res.status(201).json({ message: 'User created successfully!', user: { name, email } });
});

// API: Handle Logins
app.post('/api/login', (req, res) => {
  const { email, pass } = req.body;
  if (!email || !pass) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const users = readUsers();
  const user = users.find(u => u.email === email && u.pass === pass);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  res.status(200).json({ message: 'Login successful!', user: { name: user.name, email: user.email } });
});

// API: Handle Password Updates
app.post('/api/update-password', (req, res) => {
  const { email, oldPass, newPass } = req.body;
  if (!email || !oldPass || !newPass) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.email === email && u.pass === oldPass);

  if (userIndex === -1) {
    return res.status(401).json({ error: 'Invalid current password.' });
  }

  users[userIndex].pass = newPass;
  writeUsers(users);

  res.status(200).json({ message: 'Password updated successfully!' });
});

// ── Orders Database Helpers ──
function readOrders() {
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, '[]');
  }
  const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
  return JSON.parse(data || '[]');
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

// API: Place an Order
app.post('/api/orders', async (req, res) => {
  const { userEmail, order } = req.body;
  if (!userEmail || !order) return res.status(400).json({ error: 'Missing order details.' });

  const orders = readOrders();
  order.id = 'ORD-' + Date.now();
  order.userEmail = userEmail;
  order.status = 'Awaiting Confirmation';
  order.date = new Date().toISOString();

  orders.push(order);
  writeOrders(orders);

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

  res.status(201).json({ message: 'Order placed successfully!', orderId: order.id });
});


// API: Get My Orders
app.get('/api/my-orders', (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Email required.' });
  
  const orders = readOrders().filter(o => o.userEmail === email);
  res.status(200).json(orders);
});

// API: Admin Get All Orders
app.get('/api/all-orders', (req, res) => {
  const adminEmail = req.query.adminEmail;
  if (adminEmail !== 'kotha.madesh@gmail.com') return res.status(403).json({ error: 'Admin access required.' });
  
  res.status(200).json(readOrders());
});

// API: Admin Update Order Status
app.post('/api/update-order-status', (req, res) => {
  const { adminEmail, orderId, status } = req.body;
  if (adminEmail !== 'kotha.madesh@gmail.com') return res.status(403).json({ error: 'Admin access required.' });
  
  const orders = readOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return res.status(404).json({ error: 'Order not found.' });
  
  orders[idx].status = status;
  writeOrders(orders);
  res.status(200).json({ message: 'Order status updated successfully!' });
});

// ── Nodemailer Transporter ──
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// API: Contact Form → Send Email to Owner
app.post('/api/contact', async (req, res) => {
  const { name, phone, email, interest, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ error: 'Name and message are required.' });
  }

  const interestLine = interest ? `<tr><td><strong>Interested In:</strong></td><td>${interest}</td></tr>` : '';
  const phoneLine    = phone    ? `<tr><td><strong>Phone:</strong></td><td>${phone}</td></tr>` : '';
  const emailLine    = email    ? `<tr><td><strong>Email:</strong></td><td>${email}</td></tr>` : '';

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

// Start the server
app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`Backend Server Running!`);
  console.log(`Website is now hosted at: http://localhost:${PORT}`);
  console.log(`Users database file:      ${DB_FILE}`);
  console.log(`=============================================`);
});
