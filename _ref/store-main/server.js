const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool, initDB } = require('./db');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

require('dotenv').config();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'omnistore-secret-key-change-in-production';

// Multer configuration: Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'omnistore_products' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.vendorId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ========== AUTH ROUTES ==========

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, storeName } = req.body;
    if (!name || !email || !password || !storeName) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const existing = await pool.query('SELECT id FROM vendors WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const result = await pool.query(
      'INSERT INTO vendors (name, email, password, store_name, store_slug) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, email, hashedPassword, storeName, slug]
    );

    const vendorId = result.rows[0].id;
    const token = jwt.sign({ id: vendorId }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, vendor: { id: vendorId, name, email, storeName, storeSlug: slug } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM vendors WHERE email = $1', [email]);
    const vendor = result.rows[0];
    
    if (!vendor) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, vendor.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: vendor.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      vendor: {
        id: vendor.id, name: vendor.name, email: vendor.email,
        storeName: vendor.store_name, storeSlug: vendor.store_slug
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== VENDOR / STORE ROUTES ==========

app.get('/api/vendor/profile', authMiddleware, async (req, res) => {
  const result = await pool.query('SELECT * FROM vendors WHERE id = $1', [req.vendorId]);
  const vendor = result.rows[0];
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  delete vendor.password;
  res.json(vendor);
});

app.put('/api/vendor/profile', authMiddleware, async (req, res) => {
  const { store_name, tagline, description, phone, address, primary_color, secondary_color, bg_color, font_family, sales_edit_enabled } = req.body;
  
  await pool.query(`
    UPDATE vendors SET store_name=$1, tagline=$2, description=$3, phone=$4, address=$5,
    primary_color=$6, secondary_color=$7, bg_color=$8, font_family=$9, sales_edit_enabled=$10
    WHERE id=$11
  `, [store_name, tagline, description, phone, address, primary_color, secondary_color, bg_color, font_family, sales_edit_enabled || false, req.vendorId]);

  if (store_name) {
    const slug = store_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await pool.query('UPDATE vendors SET store_slug=$1 WHERE id=$2', [slug, req.vendorId]);
  }
  res.json({ success: true });
});

// ========== MANUAL ANALYTICS ROUTES ==========

app.get('/api/vendor/manual-analytics', authMiddleware, async (req, res) => {
  const result = await pool.query('SELECT * FROM manual_analytics WHERE vendor_id = $1 ORDER BY date ASC', [req.vendorId]);
  res.json(result.rows);
});

app.post('/api/vendor/manual-analytics', authMiddleware, async (req, res) => {
  const { date, orders_count, revenue, product_id } = req.body;
  try {
    await pool.query(`
      INSERT INTO manual_analytics (vendor_id, product_id, date, orders_count, revenue)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (vendor_id, product_id, date) DO UPDATE SET orders_count=$4, revenue=$5
    `, [req.vendorId, product_id, date, orders_count, revenue]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PRODUCT ROUTES ==========

app.get('/api/products', authMiddleware, async (req, res) => {
  const result = await pool.query('SELECT * FROM products WHERE vendor_id = $1 ORDER BY created_at DESC', [req.vendorId]);
  res.json(result.rows);
});

// New Multi-image Upload Endpoint
app.post('/api/vendor/products', authMiddleware, upload.array('photos', 5), async (req, res) => {
  try {
    const { name, description, price, compare_price, stock, category, specs, is_featured } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ error: 'Product name and price are required.' });
    }

    // Parse specs object string into a true object layout
    let parsedSpecs = {};
    try {
      parsedSpecs = typeof specs === 'string' ? JSON.parse(specs) : (specs || {});
    } catch (e) {
      console.warn('Failed to parse specs, defaulting to empty object');
      parsedSpecs = {};
    }

    // Process uploaded file buffers to Cloudinary
    const imagePaths = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToCloudinary(file.buffer);
        imagePaths.push(url);
      }
    }
    
    // Use the first image as the main image_url for backwards compatibility
    const mainImageUrl = imagePaths.length > 0 ? imagePaths[0] : '';

    const result = await pool.query(
      `INSERT INTO products (
        vendor_id, name, description, price, compare_price, stock, category, 
        image_url, images, specs, is_featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        req.vendorId, 
        name, 
        description || '', 
        parseFloat(price), 
        parseFloat(compare_price) || 0, 
        parseInt(stock) || 0,
        category || 'General', 
        mainImageUrl, 
        JSON.stringify(imagePaths), 
        JSON.stringify(parsedSpecs), 
        is_featured === 'true' || is_featured === true
      ]
    );

    res.json({ id: result.rows[0].id, success: true, images: imagePaths });
  } catch (err) {
    console.error('--- PRODUCT CREATION ERROR ---');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: 'Database Error: ' + err.message });
  }
});


app.put('/api/products/:id', authMiddleware, upload.array('photos', 5), async (req, res) => {
  try {
    const { name, description, price, compare_price, stock, category, specs, is_featured, existing_images } = req.body;
    
    // Process newly uploaded file buffers
    const newImagePaths = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToCloudinary(file.buffer);
        newImagePaths.push(url);
      }
    }

    // Combine with existing images if provided
    let finalImages = [];
    try {
      finalImages = typeof existing_images === 'string' ? JSON.parse(existing_images) : (existing_images || []);
    } catch (e) {
      finalImages = [];
    }
    finalImages = [...finalImages, ...newImagePaths].slice(0, 5);
    
    const mainImageUrl = finalImages.length > 0 ? finalImages[0] : '';
    
    let parsedSpecs = {};
    try {
      parsedSpecs = typeof specs === 'string' ? JSON.parse(specs) : (specs || {});
    } catch (e) {
      parsedSpecs = {};
    }

    await pool.query(
      `UPDATE products SET 
        name=$1, description=$2, price=$3, compare_price=$4, stock=$5, 
        category=$6, image_url=$7, images=$8, specs=$9, is_featured=$10 
      WHERE id=$11 AND vendor_id=$12`,
      [
        name, description, parseFloat(price), parseFloat(compare_price) || 0, 
        parseInt(stock), category, mainImageUrl, JSON.stringify(finalImages), 
        JSON.stringify(parsedSpecs), is_featured === 'true' || is_featured === true, 
        req.params.id, req.vendorId
      ]
    );
    res.json({ success: true, images: finalImages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id/insights', authMiddleware, async (req, res) => {
  try {
    const productId = req.params.id;
    
    // 1. Get Product Basic Info
    const productRes = await pool.query('SELECT * FROM products WHERE id = $1 AND vendor_id = $2', [productId, req.vendorId]);
    if (productRes.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const product = productRes.rows[0];

    // Check if manual editing is enabled
    const vendorRes = await pool.query('SELECT sales_edit_enabled FROM vendors WHERE id = $1', [req.vendorId]);
    const isManual = vendorRes.rows[0]?.sales_edit_enabled;

    let totalSalesCount = 0;
    let totalRevenue = 0;

    if (isManual) {
      const manualRes = await pool.query(`
        SELECT SUM(orders_count) as orders, SUM(revenue) as revenue 
        FROM manual_analytics 
        WHERE product_id = $1
      `, [productId]);
      totalSalesCount = parseInt(manualRes.rows[0].orders || 0);
      totalRevenue = parseFloat(manualRes.rows[0].revenue || 0);
    } else {
      // 2. Calculate Sales and Profit from Orders
      // We parse the JSONB 'items' array in the orders table
      const ordersRes = await pool.query(`
        SELECT items FROM orders WHERE vendor_id = $1
      `, [req.vendorId]);
      
      ordersRes.rows.forEach(order => {
        const items = order.items; // items is an array
        const productItem = items.find(item => item.id == productId);
        if (productItem) {
          totalSalesCount += (productItem.quantity || 1);
          totalRevenue += (productItem.price * (productItem.quantity || 1));
        }
      });
    }

    const totalProfit = totalRevenue - (totalSalesCount * (product.cost_price || 0));

    // 3. Get Ratings and Comments
    const reviewsRes = await pool.query('SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC', [productId]);
    const avgRating = reviewsRes.rows.length > 0 
      ? reviewsRes.rows.reduce((acc, r) => acc + r.rating, 0) / reviewsRes.rows.length 
      : 0;

    // 4. Get Promo Codes
    const promoRes = await pool.query('SELECT * FROM promo_codes WHERE product_id = $1 ORDER BY created_at DESC', [productId]);

    res.json({
      product,
      insights: {
        totalSales: totalSalesCount,
        totalRevenue,
        totalProfit,
        avgRating: avgRating.toFixed(1),
        reviewCount: reviewsRes.rows.length,
        reviews: reviewsRes.rows,
        promoCodes: promoRes.rows
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/:id/promo', authMiddleware, async (req, res) => {
  const { code, discount_percent } = req.body;
  try {
    await pool.query(
      'INSERT INTO promo_codes (product_id, code, discount_percent) VALUES ($1, $2, $3)',
      [req.params.id, code.toUpperCase(), discount_percent]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Promo code already exists or invalid data' });
  }
});

app.delete('/api/promo/:id', authMiddleware, async (req, res) => {
  await pool.query('DELETE FROM promo_codes WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

app.put('/api/products/:id/stock', authMiddleware, async (req, res) => {
  const { stock } = req.body;
  await pool.query('UPDATE products SET stock = $1 WHERE id = $2 AND vendor_id = $3', [stock, req.params.id, req.vendorId]);
  res.json({ success: true });
});

app.put('/api/products/:id/discount', authMiddleware, async (req, res) => {
  const { price, compare_price } = req.body;
  await pool.query('UPDATE products SET price = $1, compare_price = $2 WHERE id = $3 AND vendor_id = $4', [price, compare_price, req.params.id, req.vendorId]);
  res.json({ success: true });
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  await pool.query('DELETE FROM products WHERE id=$1 AND vendor_id=$2', [req.params.id, req.vendorId]);
  res.json({ success: true });
});

// ========== ORDER ROUTES ==========

app.get('/api/orders', authMiddleware, async (req, res) => {
  const result = await pool.query('SELECT * FROM orders WHERE vendor_id = $1 ORDER BY created_at DESC', [req.vendorId]);
  res.json(result.rows);
});

app.put('/api/orders/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  await pool.query('UPDATE orders SET status=$1 WHERE id=$2 AND vendor_id=$3', [status, req.params.id, req.vendorId]);
  res.json({ success: true });
});

// ========== ANALYTICS ROUTES ==========

app.get('/api/analytics', authMiddleware, async (req, res) => {
  const totalProducts = await pool.query('SELECT COUNT(*) as count FROM products WHERE vendor_id=$1', [req.vendorId]);
  const totalOrders = await pool.query('SELECT COUNT(*) as count FROM orders WHERE vendor_id=$1', [req.vendorId]);
  const totalRevenue = await pool.query('SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE vendor_id=$1 AND payment_status=$2', [req.vendorId, 'paid']);
  const lowStock = await pool.query('SELECT COUNT(*) as count FROM products WHERE vendor_id=$1 AND stock < 10', [req.vendorId]);
  const topProducts = await pool.query('SELECT name, stock, price FROM products WHERE vendor_id=$1 ORDER BY is_featured DESC, stock ASC LIMIT 5', [req.vendorId]);
  const recentOrders = await pool.query('SELECT * FROM orders WHERE vendor_id=$1 ORDER BY created_at DESC LIMIT 5', [req.vendorId]);

  res.json({
    totalProducts: parseInt(totalProducts.rows[0].count),
    totalOrders: parseInt(totalOrders.rows[0].count),
    totalRevenue: parseFloat(totalRevenue.rows[0].total),
    lowStock: parseInt(lowStock.rows[0].count),
    topProducts: topProducts.rows,
    recentOrders: recentOrders.rows
  });
});

app.get('/api/vendor/analytics/graph', authMiddleware, async (req, res) => {
  const range = req.query.range || '30days';
  const { product_id } = req.query;
  let interval = '30 days';
  let truncUnit = 'day';

  if (range === '3months') { interval = '3 months'; truncUnit = 'week'; }
  else if (range === '6months') { interval = '6 months'; truncUnit = 'month'; }
  else if (range === '12months') { interval = '12 months'; truncUnit = 'month'; }

  try {
    // Check if manual editing is enabled
    const vendorRes = await pool.query('SELECT sales_edit_enabled FROM vendors WHERE id = $1', [req.vendorId]);
    const isManual = vendorRes.rows[0]?.sales_edit_enabled;

    let result;
    if (isManual) {
      let query = `
        SELECT 
          date as period,
          SUM(revenue) as revenue,
          SUM(orders_count) as orders
        FROM manual_analytics
        WHERE vendor_id = $1 
          AND date >= NOW() - CAST($2 AS INTERVAL)
      `;
      const params = [req.vendorId, interval];
      if (product_id) {
        query += ` AND product_id = $3 `;
        params.push(product_id);
      }
      query += ` GROUP BY period ORDER BY period ASC `;
      result = await pool.query(query, params);
    } else {
      if (product_id) {
        result = await pool.query(`
          SELECT 
            DATE_TRUNC($1, created_at) as period,
            SUM((item->>'price')::numeric * (item->>'quantity')::numeric) as revenue,
            COUNT(DISTINCT id) as orders
          FROM orders,
          LATERAL jsonb_array_elements(items) AS item
          WHERE vendor_id = $2 
            AND payment_status = 'paid'
            AND (item->>'id')::integer = $3
            AND created_at >= NOW() - CAST($4 AS INTERVAL)
          GROUP BY period
          ORDER BY period ASC
        `, [truncUnit, req.vendorId, parseInt(product_id), interval]);
      } else {
        result = await pool.query(`
          SELECT 
            DATE_TRUNC($1, created_at) as period,
            SUM(total_amount) as revenue,
            COUNT(id) as orders
          FROM orders
          WHERE vendor_id = $2 
            AND payment_status = 'paid'
            AND created_at >= NOW() - CAST($3 AS INTERVAL)
          GROUP BY period
          ORDER BY period ASC
        `, [truncUnit, req.vendorId, interval]);
      }
    }

    const labels = result.rows.map(r => {
      const date = new Date(r.period);
      if (truncUnit === 'day') return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (truncUnit === 'week') return `Week of ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
      return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    });

    const revenueData = result.rows.map(r => parseFloat(r.revenue));
    const ordersData = result.rows.map(r => parseInt(r.orders));

    res.json({ labels, revenueData, ordersData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PUBLIC STORE ROUTES (No auth) ==========

app.get('/api/store/:slug', async (req, res) => {
  const result = await pool.query('SELECT * FROM vendors WHERE store_slug = $1', [req.params.slug]);
  const vendor = result.rows[0];
  if (!vendor) return res.status(404).json({ error: 'Store not found' });
  delete vendor.password;
  res.json(vendor);
});

app.get('/api/store/:slug/products', async (req, res) => {
  const vendorResult = await pool.query('SELECT id FROM vendors WHERE store_slug = $1', [req.params.slug]);
  if (vendorResult.rows.length === 0) return res.status(404).json({ error: 'Store not found' });
  const vendorId = vendorResult.rows[0].id;
  
  const { category, search, sort } = req.query;

  let query = 'SELECT * FROM products WHERE vendor_id = $1 AND is_active = true';
  const params = [vendorId];

  if (category && category !== 'All') {
    params.push(category);
    query += ' AND category = $' + params.length;
  }
  if (search) {
    params.push(`%${search}%`);
    query += ' AND (name ILIKE $' + params.length + ' OR description ILIKE $' + params.length + ')';
  }
  
  if (sort === 'price-low') query += ' ORDER BY price ASC';
  else if (sort === 'price-high') query += ' ORDER BY price DESC';
  else query += ' ORDER BY is_featured DESC, created_at DESC';

  const productsResult = await pool.query(query, params);
  const categoriesResult = await pool.query('SELECT DISTINCT category FROM products WHERE vendor_id = $1 AND is_active = true', [vendorId]);
  
  res.json({ 
    products: productsResult.rows, 
    categories: categoriesResult.rows.map(c => c.category) 
  });
});

app.get('/api/store/:slug/products/:id', async (req, res) => {
  const { slug, id } = req.params;
  try {
    const productRes = await pool.query(`
      SELECT p.*, v.store_name 
      FROM products p 
      JOIN vendors v ON p.vendor_id = v.id 
      WHERE v.store_slug = $1 AND p.id = $2
    `, [slug, id]);

    if (productRes.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const product = productRes.rows[0];

    // Fetch Reviews and Calculate Average Rating
    const reviewsRes = await pool.query('SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC', [id]);
    const avgRes = await pool.query('SELECT AVG(rating) as average FROM reviews WHERE product_id = $1', [id]);

    res.json({
      ...product,
      reviews: reviewsRes.rows,
      average_rating: parseFloat(avgRes.rows[0].average || 0).toFixed(1)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/store/:slug/products/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const { name, rating, comment } = req.body;
  try {
    await pool.query(`
      INSERT INTO reviews (product_id, customer_name, rating, comment)
      VALUES ($1, $2, $3, $4)
    `, [id, name, rating, comment]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/store/:slug/checkout/apply-promo', async (req, res) => {
  const { slug } = req.params;
  const { code } = req.body;
  try {
    const vendorRes = await pool.query('SELECT id FROM vendors WHERE store_slug = $1', [slug]);
    if (vendorRes.rows.length === 0) return res.status(404).json({ error: 'Store not found' });
    const vendorId = vendorRes.rows[0].id;

    const promoRes = await pool.query(`
      SELECT * FROM promo_codes 
      WHERE vendor_id = $1 AND code = $2 AND is_active = true
    `, [vendorId, code]);

    if (promoRes.rows.length === 0) return res.status(404).json({ error: 'Invalid or inactive promo code' });
    
    const promo = promoRes.rows[0];
    res.json({
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== CHECKOUT ROUTE (Public) ==========

app.post('/api/store/:slug/checkout', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { slug } = req.params;
    const { customerName, customerEmail, customerPhone, shippingAddress, items, promoCode } = req.body;

    await client.query('BEGIN');

    // 1. Resolve vendor
    const vendorRes = await client.query('SELECT id FROM vendors WHERE store_slug = $1', [slug]);
    if (vendorRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Store not found' });
    }
    const vendorId = vendorRes.rows[0].id;

    let subtotal = 0;
    const orderItems = [];

    // 2. Process Items and Lock Stock
    for (const item of items) {
      const productResult = await client.query(
        'SELECT name, stock, price FROM products WHERE id = $1 AND vendor_id = $2 FOR UPDATE', 
        [item.id, vendorId]
      );
      
      const product = productResult.rows[0];
      if (!product) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Product ${item.name} not found` });
      }

      if (product.stock < item.qty) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Item ${product.name} is out of stock!` });
      }

      subtotal += parseFloat(product.price) * item.qty;
      
      // Update inventory
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.qty, item.id]);
      
      orderItems.push({ id: item.id, name: product.name, qty: item.qty, price: product.price });
    }

    // 3. Handle Promo Code
    let discountAmount = 0;
    if (promoCode) {
      const promoRes = await client.query(
        'SELECT * FROM promo_codes WHERE vendor_id = $1 AND code = $2 AND is_active = true',
        [vendorId, promoCode]
      );
      
      if (promoRes.rows.length > 0) {
        const promo = promoRes.rows[0];
        if (promo.discount_type === 'percentage') {
          discountAmount = (subtotal * promo.discount_value) / 100;
        } else {
          discountAmount = Math.min(subtotal, promo.discount_value);
        }
      }
    }

    const finalTotal = subtotal - discountAmount;

    // 4. Record Order
    const orderResult = await client.query(
      `INSERT INTO orders (
        vendor_id, customer_name, customer_email, customer_phone, shipping_address,
        total_amount, discount_amount, promo_code, items, status, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        vendorId, customerName, customerEmail, customerPhone, shippingAddress || '',
        finalTotal, discountAmount, promoCode || '', JSON.stringify(orderItems),
        'pending', 'paid'
      ]
    );

    await client.query('COMMIT');
    res.json({ 
      success: true, 
      orderId: orderResult.rows[0].id, 
      subtotal, 
      discount: discountAmount, 
      total: finalTotal 
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Checkout Error:', err.message);
    res.status(500).json({ error: 'Transaction failed: ' + err.message });
  } finally {
    client.release();
  }
});

// ========== AI CHATBOT ROUTE ==========

app.post('/api/store/:slug/chat', async (req, res) => {
  try {
    const { slug } = req.params;
    const { message, sessionId } = req.body;

    if (!sessionId) return res.status(400).json({ error: 'sessionId is required for persistent chat' });

    // 1. Resolve Vendor by slug
    const vendorResult = await pool.query('SELECT * FROM vendors WHERE store_slug = $1', [slug]);
    const vendor = vendorResult.rows[0];
    if (!vendor) return res.status(404).json({ error: 'Store not found' });

    // 2. Fetch Live Inventory Context (is_active = true)
    const productsResult = await pool.query(
      'SELECT name, description, price, stock, category, specs FROM products WHERE vendor_id = $1 AND is_active = true',
      [vendor.id]
    );
    const products = productsResult.rows;

    // 3. Retrieve structural memory (Last 10 messages)
    const historyResult = await pool.query(
      'SELECT role, message FROM chat_history WHERE session_id = $1 AND vendor_id = $2 ORDER BY created_at ASC LIMIT 10',
      [sessionId, vendor.id]
    );

    // 4. Append User Message to history immediately
    await pool.query(
      'INSERT INTO chat_history (vendor_id, session_id, role, message) VALUES ($1, $2, $3, $4)',
      [vendor.id, sessionId, 'user', message]
    );

    // 5. Build System Prompt & Call Gemini
    const systemPrompt = `
You are the AI shopping assistant for "${vendor.store_name}".
Store Metadata: ${vendor.description || vendor.tagline}
Available Inventory: ${JSON.stringify(products, null, 2)}

Constraints:
- Only discuss products from the provided inventory.
- Be polite, professional, and helpful.
- Reference specific specs (Brand, Material, etc.) when asked.
- If an item is out of stock (stock: 0), inform the user and suggest an alternative.
`;

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;

    let reply = "";
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      // Prepare history for Gemini
      const chatHistory = historyResult.rows.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.message }]
      }));

      const chat = model.startChat({
        history: chatHistory,
        systemInstruction: systemPrompt
      });

      const result = await chat.sendMessage(message);
      reply = result.response.text();
    } else {
      reply = `I'm here to help with ${vendor.store_name}! Our inventory has ${products.length} active items. (AI features require a Gemini API key)`;
    }

    // 6. Record Assistant Response as 'model'
    await pool.query(
      'INSERT INTO chat_history (vendor_id, session_id, role, message) VALUES ($1, $2, $3, $4)',
      [vendor.id, sessionId, 'model', reply]
    );

    res.json({ reply });

  } catch (err) {
    console.error('Chat Error:', err);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// ========== VENDOR AI ASSISTANT ROUTE ==========
app.post('/api/vendor/ai-chat', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    
    // 1. Fetch Vendor context
    const vendorResult = await pool.query('SELECT * FROM vendors WHERE id = $1', [req.vendorId]);
    const vendor = vendorResult.rows[0];
    
    // 2. Fetch Store context (Product stats)
    const productCount = await pool.query('SELECT COUNT(*) FROM products WHERE vendor_id = $1', [req.vendorId]);
    const orderCount = await pool.query('SELECT COUNT(*) FROM orders WHERE vendor_id = $1', [req.vendorId]);

    const systemPrompt = `
You are the "OmniStore Business Strategist", an AI assistant for the store owner "${vendor.name}".
Store: ${vendor.store_name}
Context: The vendor has ${productCount.rows[0].count} products and ${orderCount.rows[0].count} orders.
Your Goal: Help the vendor grow their business, optimize their store, and answer platform-related questions.
Be professional, insightful, and encouraging.
`;

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.json({ reply: "AI features require a Gemini API key. Please check your configuration." });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const chat = model.startChat({
      systemInstruction: systemPrompt
    });

    const result = await chat.sendMessage(message);
    res.json({ reply: result.response.text() });

  } catch (err) {
    console.error('Vendor AI Chat Error:', err);
    res.status(500).json({ error: 'Failed to process AI assistant message' });
  }
});

// ========== AI DESCRIPTION GENERATOR ==========

app.post('/api/ai/generate-description', authMiddleware, async (req, res) => {
  const { productName, category } = req.body;

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const descriptions = [
        `Premium quality ${productName} designed for style and comfort.`,
        `Introducing our ${productName} - crafted with care.`
      ];
      return res.json({ description: descriptions[Math.floor(Math.random() * descriptions.length)] });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent(
      `Write a short, compelling e-commerce product description for "${productName}".`
    );

    res.json({ description: result.response.text() });
  } catch (err) {
    res.json({ description: `High-quality ${productName} crafted for excellence.` });
  }
});

// ========== SERVE HTML PAGES ==========

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/store/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public', 'store.html')));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ========== GLOBAL ERROR HANDLER ==========
// This ensures that even Multer errors or 500s return JSON instead of HTML
app.use((err, req, res, next) => {
  console.error('--- GLOBAL SERVER ERROR ---');
  console.error(err);
  
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// Start Server after DB init
async function start() {
  try {
    await initDB();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 OmniStore (PostgreSQL) is running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

start();
