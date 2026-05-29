const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Create a new pool using the connection string from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon/managed Postgres providers
  }
});

/**
 * Initializes the PostgreSQL database by creating necessary tables if they don't exist.
 */
async function initDB() {
  const client = await pool.connect();
  try {
    console.log('⏳ Initializing PostgreSQL schema...');

    // Execute table creation in a single transaction
    await client.query(`
      -- Vendors Table
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        store_name TEXT DEFAULT '',
        store_slug TEXT UNIQUE DEFAULT '',
        logo_url TEXT DEFAULT '',
        hero_banner TEXT DEFAULT '',
        primary_color TEXT DEFAULT '#6C63FF',
        secondary_color TEXT DEFAULT '#FF6584',
        bg_color TEXT DEFAULT '#0a0a1a',
        font_family TEXT DEFAULT 'Inter',
        tagline TEXT DEFAULT 'Welcome to our store!',
        description TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        address TEXT DEFAULT '',
        sales_edit_enabled BOOLEAN DEFAULT FALSE, -- Added for manual sales management
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Products Table with Profit Tracking
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        price NUMERIC(10, 2) NOT NULL,
        compare_price NUMERIC(10, 2) DEFAULT 0,
        cost_price NUMERIC(10, 2) DEFAULT 0, -- Added for profit tracking
        stock INTEGER DEFAULT 0,
        category TEXT DEFAULT 'General',
        image_url TEXT DEFAULT '',
        images JSONB DEFAULT '[]',
        specs JSONB DEFAULT '{}',
        is_featured BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Reviews Table for Product Feedback
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        customer_name TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Promo Codes Table (Vendor-wide or Product-specific)
      CREATE TABLE IF NOT EXISTS promo_codes (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE, -- Optional product link
        code TEXT NOT NULL,
        discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
        discount_value NUMERIC(10, 2) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Orders Table with JSONB Items support
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        customer_name TEXT NOT NULL,
        customer_email TEXT DEFAULT '',
        customer_phone TEXT DEFAULT '',
        shipping_address TEXT DEFAULT '',
        total_amount NUMERIC(10, 2) NOT NULL,
        discount_amount NUMERIC(10, 2) DEFAULT 0,
        promo_code TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        payment_status TEXT DEFAULT 'unpaid',
        payment_method TEXT DEFAULT '',
        items JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Chat History Table for Persistent AI Memory
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      -- Manual Analytics Table
      CREATE TABLE IF NOT EXISTS manual_analytics (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE, -- Linked to specific product
        date DATE NOT NULL,
        orders_count INTEGER DEFAULT 0,
        revenue NUMERIC(10, 2) DEFAULT 0,
        UNIQUE(vendor_id, product_id, date)
      );
    `);

    // Check if seeding is required
    const vendorCheck = await client.query('SELECT COUNT(*) FROM vendors');
    if (parseInt(vendorCheck.rows[0].count) === 0) {
      await seedDemoData(client);
    }

    console.log('✅ PostgreSQL Database Initialized Successfully');

    // Run Migrations (Add columns if they don't exist)
    console.log('🔄 Running migrations...');
    await client.query(`
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS sales_edit_enabled BOOLEAN DEFAULT FALSE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE manual_analytics ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE CASCADE;
      
      -- Reviews table migrations
      ALTER TABLE reviews ALTER COLUMN customer_name SET NOT NULL;
      ALTER TABLE reviews ALTER COLUMN rating SET NOT NULL;

      -- Promo Codes table migrations
      ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE;
      ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE CASCADE;
      ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percentage';
      ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE promo_codes DROP COLUMN IF EXISTS discount_percent;

      -- Orders table migrations
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address TEXT DEFAULT '';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT DEFAULT '';

      -- Drop old unique constraint and add new one
      ALTER TABLE manual_analytics DROP CONSTRAINT IF EXISTS manual_analytics_vendor_id_date_key;
      -- Note: Adding a named constraint to avoid duplicates
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'manual_analytics_unique_entry') THEN
          ALTER TABLE manual_analytics ADD CONSTRAINT manual_analytics_unique_entry UNIQUE (vendor_id, product_id, date);
        END IF;
      END $$;
    `);
    console.log('✅ Migrations completed');

  } catch (err) {
    console.error('❌ Database Initialization Error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Seeds the database with demo data for a "Fashion Hub" vendor.
 */
async function seedDemoData(client) {
  console.log('🌱 Seeding demo data...');
  const hashedPassword = await bcrypt.hash('demo123', 10);

  // Insert demo vendor
  const vendorResult = await client.query(`
    INSERT INTO vendors (name, email, password, store_name, store_slug, tagline, description, primary_color, secondary_color, phone, address)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
  `, [
    'Raj Kumar',
    'demo@omnistore.com',
    hashedPassword,
    'Raj\'s Fashion Hub',
    'rajs-fashion',
    'Trendy Fashion at Affordable Prices',
    'Your one-stop destination for stylish clothing, accessories, and footwear. Quality products at unbeatable prices.',
    '#6C63FF',
    '#FF6584',
    '+91 98765 43210',
    '123 MG Road, Bangalore, India'
  ]);

  const vendorId = vendorResult.rows[0].id;

  // Insert demo products
  const products = [
    { 
      name: 'Classic White Sneakers', 
      desc: 'Premium quality white sneakers with cushioned sole.', 
      price: 1299.00, 
      compare: 1999.00, 
      stock: 25, 
      cat: 'Footwear', 
      featured: true,
      images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80'],
      specs: { material: 'Leather', sole: 'Rubber', color: 'White' }
    },
    { 
      name: 'Denim Jacket - Blue', 
      desc: 'Stylish blue denim jacket with button closure.', 
      price: 1899.00, 
      compare: 2499.00, 
      stock: 15, 
      cat: 'Jackets', 
      featured: true,
      images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=80'],
      specs: { material: 'Denim', fit: 'Regular', wash: 'Stone Wash' }
    }
  ];

  for (const p of products) {
    await client.query(`
      INSERT INTO products (vendor_id, name, description, price, compare_price, stock, category, is_featured, images, specs)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [vendorId, p.name, p.desc, p.price, p.compare, p.stock, p.cat, p.featured, JSON.stringify(p.images), JSON.stringify(p.specs)]);
  }

  console.log('✅ Demo data seeded successfully!');
}

module.exports = { pool, initDB };
