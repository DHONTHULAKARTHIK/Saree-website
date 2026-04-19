require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('./models/User');
const Order = require('./models/Order');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saree_website';

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    // Migrate Users
    const usersPath = path.join(__dirname, 'users.json');
    if (fs.existsSync(usersPath)) {
      const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      console.log(`Found ${users.length} users in users.json. Migrating...`);
      for (const u of users) {
        try {
          await User.updateOne({ email: u.email }, u, { upsert: true });
        } catch (err) {
          console.error(`Failed to migrate user ${u.email}:`, err.message);
        }
      }
      console.log('Users migration finished.');
    }

    // Migrate Orders
    const ordersPath = path.join(__dirname, 'orders.json');
    if (fs.existsSync(ordersPath)) {
      const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
      console.log(`Found ${orders.length} orders in orders.json. Migrating...`);
      for (const o of orders) {
        try {
          // Convert date string back to Date object if it exists
          if (o.date) o.date = new Date(o.date);
          await Order.updateOne({ id: o.id }, o, { upsert: true });
        } catch (err) {
          console.error(`Failed to migrate order ${o.id}:`, err.message);
        }
      }
      console.log('Orders migration finished.');
    }

    console.log('Migration complete! You can now safely delete users.json and orders.json (after backing them up).');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
