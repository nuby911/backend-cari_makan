import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Starting migration...');

    // 1. Create Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) CHECK (role IN ('admin', 'kasir')) DEFAULT 'kasir',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Users table created or exists.');

    // 2. Create Promos Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS promos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'nominal')) NOT NULL,
        discount_value INT NOT NULL,
        min_order_price INT DEFAULT 0,
        expiry_date TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Promos table created or exists.');

    // 3. Create Foods Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS foods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        price INT NOT NULL,
        discount_price INT DEFAULT 0,
        category VARCHAR(50) CHECK (category IN ('makanan', 'minuman', 'cemilan', 'desert')) NOT NULL,
        image_url TEXT NOT NULL,
        description TEXT,
        is_available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Foods table created or exists.');

    // 4. Create Orders Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        table_number VARCHAR(10),
        order_type VARCHAR(20) DEFAULT 'dine_in',
        subtotal_price INT NOT NULL,
        discount_amount INT DEFAULT 0,
        total_price INT NOT NULL,
        payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'paid', 'failed', 'expired')) DEFAULT 'pending',
        order_status VARCHAR(20) CHECK (order_status IN ('received', 'cooking', 'done')) DEFAULT 'received',
        transaction_id VARCHAR(100) UNIQUE,
        promo_code_used VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Orders table created or exists.');

    // 5. Create Order Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id) ON DELETE CASCADE,
        food_id INT REFERENCES foods(id),
        qty INT NOT NULL CHECK (qty >= 1),
        notes TEXT
      );
    `);
    console.log('Order items table created or exists.');

    // SEEDING DATA
    console.log('Seeding initial data...');
    
    // Seed Users
    const { rows: users } = await client.query('SELECT * FROM users');
    if (users.length === 0) {
      const adminPass = await bcrypt.hash('admin123', 10);
      const kasirPass = await bcrypt.hash('kasir123', 10);
      await client.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3), ($4, $5, $6)',
        ['admin', adminPass, 'admin', 'kasir', kasirPass, 'kasir']
      );
      console.log('Seeded default admin & kasir users.');
    }

    // Seed Promos
    const { rows: promos } = await client.query('SELECT * FROM promos');
    if (promos.length === 0) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      await client.query(
        'INSERT INTO promos (title, code, discount_type, discount_value, min_order_price, expiry_date) VALUES ($1, $2, $3, $4, $5, $6)',
        ['Diskon Akhir Pekan', 'WEEKEND10', 'percentage', 10, 50000, nextMonth]
      );
      console.log('Seeded default promo.');
    }

    // Seed Foods
    const { rows: foods } = await client.query('SELECT * FROM foods');
    if (foods.length === 0) {
      await client.query(
        'INSERT INTO foods (name, price, category, image_url, description) VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)',
        [
          'Nasi Goreng Spesial', 25000, 'makanan', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'Nasi goreng dengan telur, sosis, dan ayam suwir.',
          'Es Teh Manis', 5000, 'minuman', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'Es teh manis segar pelepas dahaga.'
        ]
      );
      console.log('Seeded default foods.');
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during migration:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

migrate();
