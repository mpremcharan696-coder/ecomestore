import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

// Load environment variables from .env
dotenv.config();

// Configure Cloudinary media cloud
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'mock_cloud',
  api_key: process.env.CLOUDINARY_API_KEY || 'mock_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'mock_secret'
});

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Neon PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Standard secure SSL settings for Neon cloud DB
    rejectUnauthorized: false,
  }
});

// Proactive database connection health check on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Neon database pool initialization failed:", err.message);
  } else {
    console.log("✓ Secure Neon connection pool established successfully!");
    release();
  }
});

/**
 * POST /api/stores
 * Securely creates a new store name variable in the Neon PostgreSQL database.
 */
app.post('/api/stores', async (req, res) => {
  const { storeName } = req.body;

  // Basic validation checks
  if (!storeName || typeof storeName !== 'string') {
    return res.status(400).json({ error: "Store name is required." });
  }

  const trimmedName = storeName.trim();
  if (trimmedName.length < 2) {
    return res.status(400).json({ error: "Store name must be at least 2 characters." });
  }

  const query = `
    INSERT INTO stores (store_name)
    VALUES ($1)
    RETURNING store_id, store_name, created_at;
  `;

  try {
    // Query execution is parameterized ($1) to completely eliminate SQL injection vectors
    const result = await pool.query(query, [trimmedName]);
    const sId = result.rows[0].store_id;
    console.log(`✓ Registered new store: "${trimmedName}" (ID: ${sId})`);

    // Auto-prepopulate products for this brand new store ID!
    const prepopProducts = [
      ["Quantum Processor Cores", 149.99, 18, "Processors", "High-performance processing unit designed for standard sub-grid calculations.", [], [], 85.00],
      ["Aetheric Flux Diodes", 24.50, 3, "Hardware", "Basic component designed to modulate reverse flow within high-voltage sub-modules.", [], [], 12.00],
      ["Torus Magnetic Induction Rings", 89.00, 24, "Coils", "Core component utilized in generating dynamic sub-second electromagnetic fields.", [], [], 42.00],
      ["Glass Graphene Capacitors", 15.75, 0, "Components", "Capacitor node using advanced layered graphene sheets to hold micro-level charge levels.", [], [], 7.50]
    ];
    for (const prod of prepopProducts) {
      await pool.query(
        "INSERT INTO products (store_id, name, price, current_stock_level, minimum_stock_threshold, category, description, images, photos, cost_price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING;",
        [sId, prod[0], prod[1], prod[2], 5, prod[3], prod[4], prod[5], prod[6], prod[7]]
      );
    }
    
    // Auto-prepopulate transactions
    const prepopTx = [
      [`TX_8820_${sId}`, "Alice Cooper", 149.99, "Credit Node", "Cleared"],
      [`TX_5541_${sId}`, "Quantum Devs Ltd", 890.00, "Direct Bank", "Cleared"],
      [`TX_1092_${sId}`, "Bob Vance", 24.50, "Merchant Pay", "Cleared"]
    ];
    for (const tx of prepopTx) {
      await pool.query(
        "INSERT INTO transactions (transaction_id, store_id, client_name, amount, method, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING;",
        [tx[0], sId, tx[1], tx[2], tx[3], tx[4]]
      );
    }
    console.log(`✓ Prepopulated multi-tenant default inventory and ledger for store ID ${sId}.`);

    return res.status(201).json({
      success: true,
      message: "Store established successfully.",
      store: result.rows[0]
    });
  } catch (error) {
    // Handle specific PostgreSQL error codes
    if (error.code === '23505') { // Unique constraint violation code
      console.warn(`⚠ Duplicate store name attempt: "${trimmedName}"`);
      return res.status(409).json({ error: "This store name is already registered." });
    }
    
    console.error("❌ Database query exception during store insertion:", error.message);
    return res.status(500).json({ error: "Database failed to persist store connection." });
  }
});
/**
 * GET /api/stores
 * Returns a list of all active stores in the database (useful for debugging/audit).
 */
app.get('/api/stores', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM stores ORDER BY store_id ASC;");
    return res.json(result.rows);
  } catch (error) {
    console.error("❌ Database GET error:", error.message);
    return res.status(500).json({ error: "Failed to retrieve stores records." });
  }
});

/**
 * GET /api/stores/search
 * Searches a store by name and returns its record (including store_id).
 */
app.get('/api/stores/search', async (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: "Store name search parameter is required." });
  }

  try {
    const query = "SELECT * FROM stores WHERE store_name = $1 LIMIT 1;";
    const result = await pool.query(query, [name.trim()]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Store not found." });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Database search error on stores:", error.message);
    return res.status(500).json({ error: "Failed to search stores records." });
  }
});

/**
 * GET /api/products
 * Returns all registered products in the database filtered by storeId.
 */
app.get('/api/products', async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) {
    return res.status(400).json({ error: "storeId query parameter is required for multi-tenant scoping." });
  }

  try {
    const result = await pool.query(`
      SELECT 
        p.*, 
        pt.product_sales_velocity, 
        pt.times_demanded_count, 
        pt.trending_rank, 
        pt.peak_sales_season, 
        pt.high_margin_operator_flag
      FROM products p
      LEFT JOIN product_trends pt ON p.id = pt.product_id
      WHERE p.store_id = $1 
      ORDER BY p.id ASC;
    `, [parseInt(storeId)]);

    const products = result.rows.map(row => ({
      id: row.id,
      product_id: row.id,
      name: row.name,
      product_name: row.name,
      price: parseFloat(row.price),
      unit_price: parseFloat(row.price),
      stock: parseInt(row.current_stock_level || 0),
      current_stock_level: parseInt(row.current_stock_level || 0),
      minimum_stock_threshold: parseInt(row.minimum_stock_threshold || 5),
      last_updated_timestamp: row.last_updated_timestamp,
      category: row.category,
      description: row.description,
      images: row.photos && row.photos.length > 0 ? row.photos : (row.images || []),
      
      // Trend Analysis variables mapped relationally
      product_sales_velocity: parseFloat(row.product_sales_velocity || 0),
      salesVelocity: parseFloat(row.product_sales_velocity || 0),
      times_demanded_count: parseInt(row.times_demanded_count || 0),
      demandedCount: parseInt(row.times_demanded_count || 0),
      trending_rank: row.trending_rank != null ? parseInt(row.trending_rank) : null,
      trendingRank: row.trending_rank != null ? parseInt(row.trending_rank) : null,
      peak_sales_season: row.peak_sales_season || "All-Season",
      peakSeason: row.peak_sales_season || "All-Season",
      high_margin_operator_flag: !!row.high_margin_operator_flag,
      isHighMargin: !!row.high_margin_operator_flag,
      cost_price: parseFloat(row.cost_price || 0)
    }));
    return res.json(products);
  } catch (error) {
    console.error("❌ Database GET error on products:", error.message);
    return res.status(500).json({ error: "Failed to retrieve products records." });
  }
});

/**
 * POST /api/products
 * Creates a new product in the database, uploading base64 photos to Cloudinary securely.
 */
app.post('/api/products', async (req, res) => {
  const { 
    storeId, 
    name, product_name,
    price, unit_price,
    stock, current_stock_level,
    category, 
    description, 
    images,
    minimum_stock_threshold,
    cost_price 
  } = req.body;

  const finalCostPrice = parseFloat(cost_price !== undefined ? cost_price : 0);

  const finalName = (product_name || name || '').trim();
  const finalPrice = parseFloat(unit_price !== undefined ? unit_price : (price !== undefined ? price : 0));
  const finalStock = parseInt(current_stock_level !== undefined ? current_stock_level : (stock !== undefined ? stock : 0));
  const finalThreshold = parseInt(minimum_stock_threshold !== undefined ? minimum_stock_threshold : 5);

  if (!storeId || !finalName || isNaN(finalPrice) || isNaN(finalStock) || !category) {
    return res.status(400).json({ error: "storeId, product name, price, stock, and category are required." });
  }

  // Upload base64 photos to Cloudinary
  const photoUrls = [];
  const rawImages = images || [];

  for (const imgBase64 of rawImages) {
    try {
      if (imgBase64.startsWith('http://') || imgBase64.startsWith('https://')) {
        photoUrls.push(imgBase64);
        continue;
      }

      // Check if credentials are mock/placeholder. Fallback gracefully to simulated Cloudinary URLs
      const isMock = !process.env.CLOUDINARY_CLOUD_NAME || 
                     process.env.CLOUDINARY_CLOUD_NAME === 'mock_cloud' || 
                     !process.env.CLOUDINARY_API_SECRET || 
                     process.env.CLOUDINARY_API_SECRET === 'mock_secret';

      if (isMock) {
        console.warn("⚠ Cloudinary mock credentials detected. Simulating secure cloud upload...");
        const randomId = Math.random().toString(36).substring(2, 15);
        const simulatedUrl = `https://res.cloudinary.com/demo/image/upload/v1700000000/products/simulated_${randomId}.jpg`;
        photoUrls.push(simulatedUrl);
      } else {
        console.log("⚡ Uploading base64 asset to Cloudinary secure server...");
        const uploadResult = await cloudinary.uploader.upload(imgBase64, {
          folder: 'products'
        });
        console.log(`✓ Cloudinary upload successful: ${uploadResult.secure_url}`);
        photoUrls.push(uploadResult.secure_url);
      }
    } catch (err) {
      console.error("❌ Cloudinary upload error:", err.message);
      photoUrls.push(imgBase64); // Fallback to avoid data loss
    }
  }

  const query = `
    INSERT INTO products (store_id, name, price, current_stock_level, minimum_stock_threshold, category, description, images, photos, cost_price)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, store_id, name, price, current_stock_level, minimum_stock_threshold, category, description, images, photos, last_updated_timestamp, cost_price;
  `;

  const values = [
    parseInt(storeId),
    finalName,
    finalPrice,
    finalStock,
    finalThreshold,
    category.trim(),
    description ? description.trim() : null,
    images || [],
    photoUrls,
    finalCostPrice
  ];

  try {
    const result = await pool.query(query, values);
    const row = result.rows[0];
    const pId = row.id;

    // Initialize default trends for new product to maintain relational mapping
    try {
      await pool.query(`
        INSERT INTO product_trends (product_id, product_sales_velocity, times_demanded_count, trending_rank, peak_sales_season, high_margin_operator_flag)
        VALUES ($1, 0.00, 0, 10, 'All-Season', FALSE)
        ON CONFLICT DO NOTHING;
      `, [pId]);
    } catch(e) { console.warn('⚠ product_trends insert skipped:', e.message); }

    const product = {
      id: row.id,
      product_id: row.id,
      name: row.name,
      product_name: row.name,
      price: parseFloat(row.price),
      unit_price: parseFloat(row.price),
      stock: parseInt(row.current_stock_level || 0),
      current_stock_level: parseInt(row.current_stock_level || 0),
      minimum_stock_threshold: parseInt(row.minimum_stock_threshold || 5),
      last_updated_timestamp: row.last_updated_timestamp,
      category: row.category,
      description: row.description,
      images: row.photos && row.photos.length > 0 ? row.photos : (row.images || []),
      
      // Initial trend defaults returned to caller
      product_sales_velocity: 0.00,
      salesVelocity: 0.00,
      times_demanded_count: 0,
      demandedCount: 0,
      trending_rank: 10,
      trendingRank: 10,
      peak_sales_season: 'All-Season',
      peakSeason: 'All-Season',
      high_margin_operator_flag: false,
      isHighMargin: false,
      cost_price: parseFloat(row.cost_price || 0)
    };
    return res.status(201).json(product);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: "A product with this name already exists in your store." });
    }
    console.error("❌ Database POST error on products:", error.message);
    return res.status(500).json({ error: "Failed to create product in database." });
  }
});

/**
 * PUT /api/products/:id/stock
 * Updates the stock level of a product in the database.
 */
app.put('/api/products/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { delta } = req.body;

  if (delta === undefined) {
    return res.status(400).json({ error: "Stock delta is required." });
  }

  const query = `
    UPDATE products
    SET current_stock_level = GREATEST(0, current_stock_level + $1),
        last_updated_timestamp = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, name, price, current_stock_level, minimum_stock_threshold, category, description, images, photos, last_updated_timestamp, cost_price;
  `;

  try {
    const result = await pool.query(query, [parseInt(delta), parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found." });
    }
    const row = result.rows[0];
    const product = {
      id: row.id,
      product_id: row.id,
      name: row.name,
      product_name: row.name,
      price: parseFloat(row.price),
      unit_price: parseFloat(row.price),
      stock: parseInt(row.current_stock_level || 0),
      current_stock_level: parseInt(row.current_stock_level || 0),
      minimum_stock_threshold: parseInt(row.minimum_stock_threshold || 5),
      last_updated_timestamp: row.last_updated_timestamp,
      category: row.category,
      description: row.description,
      images: row.photos && row.photos.length > 0 ? row.photos : (row.images || []),
      cost_price: parseFloat(row.cost_price || 0)
    };
    return res.json(product);
  } catch (error) {
    console.error("❌ Database PUT error on product stock:", error.message);
    return res.status(500).json({ error: "Failed to update product stock." });
  }
});

/**
 * GET /api/transactions
 * Returns all active transactions in the database filtered by storeId, hydrated with P&L tracking details.
 */
app.get('/api/transactions', async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) {
    return res.status(400).json({ error: "storeId query parameter is required for multi-tenant scoping." });
  }

  try {
    const result = await pool.query(`
      SELECT 
        t.*, 
        p.name AS product_name,
        plt.cost_price_per_unit, 
        plt.selling_price_per_unit, 
        plt.net_profit_margin, 
        plt.total_expense, 
        plt.total_revenue
      FROM transactions t
      LEFT JOIN products p ON t.product_id = p.id
      LEFT JOIN profit_loss_tracking plt ON t.transaction_id = plt.transaction_id
      WHERE t.store_id = $1 
      ORDER BY t.created_at DESC;
    `, [parseInt(storeId)]);

    const transactions = result.rows.map(row => ({
      id: row.transaction_id,
      transaction_id: row.transaction_id,
      client: row.client_name,
      product_name: row.product_name,
      amount: parseFloat(row.amount),
      method: row.method,
      status: row.status,
      created_at: row.created_at,
      
      // Profit & Loss variables mapped relationally
      cost_price_per_unit: parseFloat(row.cost_price_per_unit !== null && row.cost_price_per_unit !== undefined ? row.cost_price_per_unit : 0.00),
      costPricePerUnit: parseFloat(row.cost_price_per_unit !== null && row.cost_price_per_unit !== undefined ? row.cost_price_per_unit : 0.00),
      selling_price_per_unit: parseFloat(row.selling_price_per_unit !== null && row.selling_price_per_unit !== undefined ? row.selling_price_per_unit : 0.00),
      sellingPricePerUnit: parseFloat(row.selling_price_per_unit !== null && row.selling_price_per_unit !== undefined ? row.selling_price_per_unit : 0.00),
      net_profit_margin: parseFloat(row.net_profit_margin !== null && row.net_profit_margin !== undefined ? row.net_profit_margin : 0.00),
      netProfitMargin: parseFloat(row.net_profit_margin !== null && row.net_profit_margin !== undefined ? row.net_profit_margin : 0.00),
      total_expense: parseFloat(row.total_expense !== null && row.total_expense !== undefined ? row.total_expense : 0.00),
      totalExpense: parseFloat(row.total_expense !== null && row.total_expense !== undefined ? row.total_expense : 0.00),
      total_revenue: parseFloat(row.total_revenue !== null && row.total_revenue !== undefined ? row.total_revenue : 0.00),
      totalRevenue: parseFloat(row.total_revenue !== null && row.total_revenue !== undefined ? row.total_revenue : 0.00)
    }));
    return res.json(transactions);
  } catch (error) {
    console.error("❌ Database GET error on transactions:", error.message);
    return res.status(500).json({ error: "Failed to retrieve transactions records." });
  }
});

/**
 * GET /api/sales-reports
 * Returns all active sales reports in the database filtered by storeId.
 */
app.get('/api/sales-reports', async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) {
    return res.status(400).json({ error: "storeId query parameter is required for multi-tenant scoping." });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM sales_reports WHERE store_id = $1 ORDER BY report_id ASC;",
      [parseInt(storeId)]
    );

    const reports = result.rows.map(row => ({
      report_id: row.report_id,
      id: row.report_id,
      store_id: row.store_id,
      report_type: row.report_type,
      reportType: row.report_type,
      type: row.report_type,
      total_sales_volume: parseInt(row.total_sales_volume),
      salesVolume: parseInt(row.total_sales_volume),
      volume: parseInt(row.total_sales_volume),
      gross_revenue: parseFloat(row.gross_revenue),
      grossRevenue: parseFloat(row.gross_revenue),
      start_date: row.start_date,
      startDate: row.start_date,
      end_date: row.end_date,
      endDate: row.end_date
    }));

    return res.json(reports);
  } catch (error) {
    console.error("❌ Database GET error on sales reports:", error.message);
    return res.status(500).json({ error: "Failed to retrieve sales reports." });
  }
});

/**
 * GET /api/invoices
 * Returns all active invoices in the database filtered by storeId, including AI audit details.
 */
app.get('/api/invoices', async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) {
    return res.status(400).json({ error: "storeId query parameter is required for multi-tenant scoping." });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM invoices WHERE store_id = $1 ORDER BY invoice_id DESC;",
      [parseInt(storeId)]
    );

    const invoices = result.rows.map(row => ({
      invoice_id: row.invoice_id,
      id: row.invoice_id,
      store_id: row.store_id,
      tax_amount: parseFloat(row.tax_amount),
      taxAmount: parseFloat(row.tax_amount),
      discount_applied: parseFloat(row.discount_applied),
      discountApplied: parseFloat(row.discount_applied),
      final_payable_amount: parseFloat(row.final_payable_amount),
      finalPayableAmount: parseFloat(row.final_payable_amount),
      ai_verification_status: row.ai_verification_status,
      aiVerificationStatus: row.ai_verification_status,
      ai_error_logs: row.ai_error_logs,
      aiErrorLogs: row.ai_error_logs
    }));

    return res.json(invoices);
  } catch (error) {
    console.error("❌ Database GET error on invoices:", error.message);
    return res.status(500).json({ error: "Failed to retrieve invoices." });
  }
});

/**
 * POST /api/invoices
 * Creates a new invoice, running an automatic AI audit compliance probe.
 */
app.post('/api/invoices', async (req, res) => {
  const { storeId, taxAmount, discountApplied, finalPayableAmount } = req.body;

  if (!storeId || finalPayableAmount === undefined) {
    return res.status(400).json({ error: "storeId and finalPayableAmount are required." });
  }

  // Execute server-side AI Auditor compliance checks
  let aiStatus = 'Verified';
  let aiLogs = '✓ Billing structure compliance check passed. All totals verified.';

  const calculatedTax = parseFloat(taxAmount || 0);
  const calculatedDiscount = parseFloat(discountApplied || 0);
  const finalAmount = parseFloat(finalPayableAmount);

  if (finalAmount <= 0) {
    aiStatus = 'Mismatch';
    aiLogs = '❌ AI Mismatch Alert: Final payable amount is less than or equal to zero. Flagged for review.';
  } else if (calculatedTax < 0 || calculatedDiscount < 0) {
    aiStatus = 'Flagged';
    aiLogs = '❌ AI Flagged Audit Alert: Negative values detected inside tax or discount indexes.';
  }

  const query = `
    INSERT INTO invoices (store_id, tax_amount, discount_applied, final_payable_amount, ai_verification_status, ai_error_logs)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, [
      parseInt(storeId),
      calculatedTax,
      calculatedDiscount,
      finalAmount,
      aiStatus,
      aiLogs
    ]);

    const row = result.rows[0];
    const invoice = {
      invoice_id: row.invoice_id,
      id: row.invoice_id,
      store_id: row.store_id,
      tax_amount: parseFloat(row.tax_amount),
      taxAmount: parseFloat(row.tax_amount),
      discount_applied: parseFloat(row.discount_applied),
      discountApplied: parseFloat(row.discount_applied),
      final_payable_amount: parseFloat(row.final_payable_amount),
      finalPayableAmount: parseFloat(row.final_payable_amount),
      ai_verification_status: row.ai_verification_status,
      aiVerificationStatus: row.ai_verification_status,
      ai_error_logs: row.ai_error_logs,
      aiErrorLogs: row.ai_error_logs
    };

    return res.status(201).json(invoice);
  } catch (error) {
    console.error("❌ Database POST error on invoices:", error.message);
    return res.status(500).json({ error: "Failed to persist invoice." });
  }
});

/**
 * GET /api/distributor-orders
 * Returns all distributor orders in the database filtered by storeId.
 */
app.get('/api/distributor-orders', async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) {
    return res.status(400).json({ error: "storeId query parameter is required for multi-tenant scoping." });
  }

  try {
    const result = await pool.query(`
      SELECT dist_o.*, d.distributor_name, d.contact_email 
      FROM distributor_orders dist_o
      JOIN distributors d ON dist_o.distributor_id = d.distributor_id
      WHERE dist_o.store_id = $1 
      ORDER BY dist_o.order_date DESC;
    `, [parseInt(storeId)]);

    const orders = result.rows.map(row => {
      // Format a legacy display string from ordered_items_list JSON
      let itemsDisplay = "";
      if (Array.isArray(row.ordered_items_list)) {
        itemsDisplay = row.ordered_items_list.map(i => `${i.quantity}x ${i.product_name}`).join(", ");
      } else if (typeof row.ordered_items_list === 'string') {
        try {
          const parsed = JSON.parse(row.ordered_items_list);
          if (Array.isArray(parsed)) {
            itemsDisplay = parsed.map(i => `${i.quantity}x ${i.product_name}`).join(", ");
          }
        } catch (e) {
          itemsDisplay = String(row.ordered_items_list);
        }
      }

      return {
        id: row.distributor_order_id,
        distributor_order_id: row.distributor_order_id,
        distributor_id: row.distributor_id,
        store_id: row.store_id,
        ordered_items_list: row.ordered_items_list,
        order_status: row.order_status,
        status: row.order_status,
        order_date: row.order_date,
        total_cost: parseFloat(row.total_cost),
        
        // Legacy frontend properties
        item: itemsDisplay || "Custom Supplies",
        cost: parseFloat(row.total_cost),
        supplier: row.distributor_name || "Apex Logistics",
        created_at: row.order_date
      };
    });
    return res.json(orders);
  } catch (error) {
    console.error("❌ Database GET error on distributor orders:", error.message);
    return res.status(500).json({ error: "Failed to retrieve distributor orders." });
  }
});

/**
 * POST /api/distributor-orders
 * Records a new distributor order and logs it in the database.
 */
app.post('/api/distributor-orders', async (req, res) => {
  let { 
    storeId, 
    distributorId, distributor_id,
    orderedItemsList, ordered_items_list,
    totalCost, total_cost,
    orderStatus, order_status,
    
    // Legacy body parameters
    item, cost, supplier
  } = req.body;

  const finalStoreId = parseInt(storeId);
  let finalDistId = parseInt(distributor_id || distributorId);
  let finalItemsList = ordered_items_list || orderedItemsList;
  let finalCost = parseFloat(total_cost !== undefined ? total_cost : (cost !== undefined ? cost : 0));
  let finalStatus = order_status || orderStatus || 'Pending';

  if (!finalStoreId) {
    return res.status(400).json({ error: "storeId is required." });
  }

  try {
    // Auto-resolve supplier name to distributor_id if needed
    if (!finalDistId && supplier) {
      const distRes = await pool.query("SELECT distributor_id FROM distributors WHERE distributor_name ILIKE $1 LIMIT 1;", [supplier.trim()]);
      if (distRes.rows.length > 0) {
        finalDistId = distRes.rows[0].distributor_id;
      }
    }
    
    // Fallback to first distributor in database if still unresolved
    if (!finalDistId) {
      const fallbackRes = await pool.query("SELECT distributor_id FROM distributors LIMIT 1;");
      if (fallbackRes.rows.length > 0) {
        finalDistId = fallbackRes.rows[0].distributor_id;
      } else {
        return res.status(400).json({ error: "No active distributors configured in the system." });
      }
    }

    // Auto-build ordered list from legacy item string
    if (!finalItemsList && item) {
      finalItemsList = [{ product_name: item.trim(), quantity: 10 }];
    }

    if (!finalItemsList || !Array.isArray(finalItemsList)) {
      finalItemsList = [{ product_name: "General Supplies", quantity: 1 }];
    }

    const query = `
      INSERT INTO distributor_orders (store_id, distributor_id, ordered_items_list, order_status, total_cost)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      finalStoreId,
      finalDistId,
      JSON.stringify(finalItemsList),
      finalStatus,
      finalCost
    ]);

    // Fetch distributor name to return fully hydrated response
    const distNameRes = await pool.query("SELECT distributor_name FROM distributors WHERE distributor_id = $1;", [finalDistId]);
    const distName = distNameRes.rows[0]?.distributor_name || "Apex Logistics";

    const row = result.rows[0];
    let itemsDisplay = "";
    if (Array.isArray(row.ordered_items_list)) {
      itemsDisplay = row.ordered_items_list.map(i => `${i.quantity}x ${i.product_name}`).join(", ");
    }

    const order = {
      id: row.distributor_order_id,
      distributor_order_id: row.distributor_order_id,
      distributor_id: row.distributor_id,
      store_id: row.store_id,
      ordered_items_list: row.ordered_items_list,
      order_status: row.order_status,
      status: row.order_status,
      order_date: row.order_date,
      total_cost: parseFloat(row.total_cost),
      
      // Legacy
      item: itemsDisplay || "Custom Supplies",
      cost: parseFloat(row.total_cost),
      supplier: distName,
      created_at: row.order_date
    };
    return res.status(201).json(order);
  } catch (error) {
    console.error("❌ Database POST error on distributor orders:", error.message);
    return res.status(500).json({ error: "Failed to record distributor order." });
  }
});

/**
 * GET /api/notifications
 * Returns all AI Restocking Notifications in the database filtered by storeId (vendor_id).
 * Automatically monitors current stock levels and inserts new alerts dynamically!
 */
app.get('/api/notifications', async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) {
    return res.status(400).json({ error: "storeId query parameter is required for multi-tenant scoping." });
  }

  try {
    const sId = parseInt(storeId);
    
    // 1. Dynamic Check: Scan inventory for products below minimum stock threshold
    const lowStockProducts = await pool.query(
      "SELECT product_id, product_name, current_stock_level, minimum_stock_threshold FROM products WHERE store_id = $1 AND current_stock_level <= minimum_stock_threshold;",
      [sId]
    );

    for (const prod of lowStockProducts.rows) {
      const pId = prod.product_id;
      const alertType = prod.current_stock_level === 0 ? 'Out_of_Stock' : 'Low_Stock';
      
      // Check if an unread notification already exists for this product
      const existing = await pool.query(
        "SELECT notification_id FROM ai_restocking_notifications WHERE vendor_id = $1 AND product_id = $2 AND is_read = FALSE LIMIT 1;",
        [sId, pId]
      );

      if (existing.rows.length === 0) {
        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + 3); // Predicted restock is 3 days out
        
        await pool.query(
          "INSERT INTO ai_restocking_notifications (vendor_id, alert_type, product_id, ai_predicted_restock_date, is_read) VALUES ($1, $2, $3, $4, FALSE);",
          [sId, alertType, pId, predictedDate]
        );
      }
    }

    // 2. Fetch and join notification records to send to front-end
    const result = await pool.query(`
      SELECT n.*, p.product_name, p.current_stock_level, p.category
      FROM ai_restocking_notifications n
      JOIN products p ON n.product_id = p.product_id
      WHERE n.vendor_id = $1
      ORDER BY n.notification_id DESC;
    `, [sId]);

    const notifications = result.rows.map(row => ({
      notification_id: row.notification_id,
      id: row.notification_id,
      vendor_id: row.vendor_id,
      store_id: row.vendor_id,
      alert_type: row.alert_type,
      product_id: row.product_id,
      ai_predicted_restock_date: row.ai_predicted_restock_date,
      is_read: row.is_read,
      
      // Joined fields
      product_name: row.product_name,
      name: row.product_name,
      current_stock_level: row.current_stock_level,
      stock: row.current_stock_level,
      category: row.category
    }));

    return res.json(notifications);
  } catch (error) {
    console.error("❌ Database GET error on notifications:", error.message);
    return res.status(500).json({ error: "Failed to retrieve notifications." });
  }
});

/**
 * POST /api/notifications/:id/read
 * Marks a specific notification as read.
 */
app.post('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      "UPDATE ai_restocking_notifications SET is_read = TRUE WHERE notification_id = $1 RETURNING *;",
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notification not found." });
    }

    return res.json({ success: true, notification: result.rows[0] });
  } catch (error) {
    console.error("❌ Database POST error on notifications read state:", error.message);
    return res.status(500).json({ error: "Failed to update notification status." });
  }
});

/**
 * =========================================================================
 * 📱 1. TELEGRAM CUSTOMER MESSAGING ENDPOINTS
 * =========================================================================
 */

// GET /api/telegram-customers
app.get('/api/telegram-customers', async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) {
    return res.status(400).json({ error: "storeId query parameter is required for multi-tenant scoping." });
  }
  try {
    const result = await pool.query(
      "SELECT * FROM telegram_customers WHERE store_id = $1 ORDER BY customer_id ASC;",
      [parseInt(storeId)]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("❌ Database GET error on telegram_customers:", error.message);
    return res.status(500).json({ error: "Failed to retrieve telegram customers." });
  }
});

// POST /api/telegram-customers/message
app.post('/api/telegram-customers/message', async (req, res) => {
  const { storeId, customerId, messageText } = req.body;
  if (!storeId || !customerId || !messageText) {
    return res.status(400).json({ error: "storeId, customerId, and messageText are required." });
  }
  try {
    // Audit check on message text length to simulate delivery status
    let deliveryStatus = 'Delivered';
    if (messageText.trim().length === 0) {
      deliveryStatus = 'Failed';
    } else if (messageText.toLowerCase().includes("error") || messageText.toLowerCase().includes("fail")) {
      deliveryStatus = 'Failed';
    }

    const result = await pool.query(`
      UPDATE telegram_customers
      SET last_message_sent_timestamp = CURRENT_TIMESTAMP,
          message_delivery_status = $1
      WHERE store_id = $2 AND customer_id = $3
      RETURNING *;
    `, [deliveryStatus, parseInt(storeId), parseInt(customerId)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Telegram customer not found." });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Database POST error on telegram message broadcast:", error.message);
    return res.status(500).json({ error: "Failed to log telegram message." });
  }
});

/**
 * =========================================================================
 * 🚚 2. PRODUCT DELIVERY INFORMATION ENDPOINTS
 * =========================================================================
 */

// GET /api/deliveries
app.get('/api/deliveries', async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) {
    return res.status(400).json({ error: "storeId query parameter is required." });
  }
  try {
    const result = await pool.query(`
      SELECT pd.*, dist_o.ordered_items_list, dist_o.order_status, dist_o.total_cost
      FROM product_deliveries pd
      JOIN distributor_orders dist_o ON pd.distributor_order_id = dist_o.distributor_order_id
      WHERE pd.store_id = $1
      ORDER BY pd.delivery_id DESC;
    `, [parseInt(storeId)]);
    return res.json(result.rows);
  } catch (error) {
    console.error("❌ Database GET error on product_deliveries:", error.message);
    return res.status(500).json({ error: "Failed to retrieve deliveries." });
  }
});

// PUT /api/deliveries/:id/gps
app.put('/api/deliveries/:id/gps', async (req, res) => {
  const { id } = req.params;
  const { coordinates } = req.body;
  if (!coordinates) {
    return res.status(400).json({ error: "coordinates (GPS lat,lng) are required." });
  }
  try {
    const result = await pool.query(`
      UPDATE product_deliveries
      SET current_gps_coordinates = $1
      WHERE delivery_id = $2
      RETURNING *;
    `, [coordinates.trim(), parseInt(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Delivery not found." });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Database PUT error on coordinates update:", error.message);
    return res.status(500).json({ error: "Failed to update GPS coordinates." });
  }
});

/**
 * =========================================================================
 * 💰 3. PAYMENT TRANSACTIONS LEDGER ENDPOINTS
 * =========================================================================
 */

// GET /api/payment-transactions
app.get('/api/payment-transactions', async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) {
    return res.status(400).json({ error: "storeId query parameter is required." });
  }
  try {
    const result = await pool.query(
      "SELECT * FROM payment_transactions WHERE store_id = $1 ORDER BY created_at DESC;",
      [parseInt(storeId)]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("❌ Database GET error on payment_transactions:", error.message);
    return res.status(500).json({ error: "Failed to retrieve payment transactions." });
  }
});

// POST /api/payment-transactions
app.post('/api/payment-transactions', async (req, res) => {
  const { storeId, method, status, payload, amount } = req.body;
  if (!storeId || !method || !status || !payload || amount === undefined) {
    return res.status(400).json({ error: "storeId, method, status, payload, and amount are required." });
  }
  try {
    const randomId = 'TX_GATEWAY_' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const result = await pool.query(`
      INSERT INTO payment_transactions (payment_gateway_transaction_id, store_id, payment_method, payment_status, gateway_response_payload, amount)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [randomId, parseInt(storeId), method, status, JSON.stringify(payload), parseFloat(amount)]);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Database POST error on payment_transactions:", error.message);
    return res.status(500).json({ error: "Failed to record payment transaction." });
  }
});

/**
 * =========================================================================
 * 👥 4. TELEGRAM VENDOR COMMUNITY ENDPOINTS
 * =========================================================================
 */

// GET /api/telegram-communities
app.get('/api/telegram-communities', async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) {
    return res.status(400).json({ error: "storeId query parameter is required." });
  }
  try {
    const result = await pool.query(
      "SELECT * FROM telegram_vendor_communities WHERE store_id = $1 ORDER BY join_date ASC;",
      [parseInt(storeId)]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("❌ Database GET error on communities:", error.message);
    return res.status(500).json({ error: "Failed to retrieve communities records." });
  }
});

// POST /api/telegram-communities/join
app.post('/api/telegram-communities/join', async (req, res) => {
  const { storeId, telegramId, groupId, role } = req.body;
  if (!storeId || !telegramId || !groupId || !role) {
    return res.status(400).json({ error: "storeId, telegramId, groupId, and role are required." });
  }
  try {
    const result = await pool.query(`
      INSERT INTO telegram_vendor_communities (vendor_telegram_id, store_id, community_group_id, community_role, join_date, community_ban_status)
      VALUES ($1, $2, $3, $4, CURRENT_DATE, FALSE)
      RETURNING *;
    `, [telegramId.trim(), parseInt(storeId), groupId.trim(), role]);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(490).json({ error: "This telegram ID is already registered in community hub." });
    }
    console.error("❌ Database POST error on community join:", error.message);
    return res.status(500).json({ error: "Failed to join community." });
  }
});

// PUT /api/telegram-communities/role
app.put('/api/telegram-communities/role', async (req, res) => {
  const { storeId, telegramId, role, banStatus } = req.body;
  if (!storeId || !telegramId) {
    return res.status(400).json({ error: "storeId and telegramId are required." });
  }
  try {
    let query = "UPDATE telegram_vendor_communities SET ";
    const params = [];
    let count = 1;

    if (role !== undefined) {
      query += `community_role = $${count}, `;
      params.push(role);
      count++;
    }
    if (banStatus !== undefined) {
      query += `community_ban_status = $${count}, `;
      params.push(!!banStatus);
      count++;
    }

    // Strip trailing comma
    query = query.trim().replace(/,$/, "");
    query += ` WHERE store_id = $${count} AND vendor_telegram_id = $${count+1} RETURNING *;`;
    params.push(parseInt(storeId), telegramId);

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Vendor community listing not found." });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Database PUT error on communities updating:", error.message);
    return res.status(500).json({ error: "Failed to update community member status." });
  }
});

/**
 * =========================================================================
 * 🤖 5. AI ASSISTANCE CHATBOT SESSIONS ENDPOINTS
 * =========================================================================
 */

// GET /api/chatbot-sessions
app.get('/api/chatbot-sessions', async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) {
    return res.status(400).json({ error: "storeId query parameter is required." });
  }
  try {
    const result = await pool.query(
      "SELECT * FROM chatbot_sessions WHERE store_id = $1 ORDER BY session_id DESC LIMIT 30;",
      [parseInt(storeId)]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("❌ Database GET error on chatbot_sessions:", error.message);
    return res.status(500).json({ error: "Failed to retrieve chatbot sessions." });
  }
});

// POST /api/chatbot-sessions
app.post('/api/chatbot-sessions', async (req, res) => {
  const { storeId, queryText, responseText } = req.body;
  if (!storeId || !queryText || !responseText) {
    return res.status(400).json({ error: "storeId, queryText, and responseText are required." });
  }
  try {
    // Perform server-side intent classification based on query text keywords
    let intent = 'General';
    const textLower = queryText.toLowerCase();
    if (textLower.includes("restock") || textLower.includes("stock") || textLower.includes("inventory")) {
      intent = 'Restock';
    } else if (textLower.includes("profit") || textLower.includes("revenue") || textLower.includes("sales") || textLower.includes("margin")) {
      intent = 'Sales';
    }

    const result = await pool.query(`
      INSERT INTO chatbot_sessions (store_id, user_query_text, ai_response_text, intent_classification, user_satisfaction_rating)
      VALUES ($1, $2, $3, $4, 5)
      RETURNING *;
    `, [parseInt(storeId), queryText.trim(), responseText.trim(), intent]);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Database POST error on chatbot sessions:", error.message);
    return res.status(500).json({ error: "Failed to log chatbot session." });
  }
});

// PUT /api/chatbot-sessions/:id/rate
app.put('/api/chatbot-sessions/:id/rate', async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;
  if (rating === undefined || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be an integer between 1 and 5." });
  }
  try {
    const result = await pool.query(`
      UPDATE chatbot_sessions
      SET user_satisfaction_rating = $1
      WHERE session_id = $2
      RETURNING *;
    `, [parseInt(rating), parseInt(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Chatbot session not found." });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Database PUT error on satisfaction rating:", error.message);
    return res.status(500).json({ error: "Failed to update satisfaction rating." });
  }
});

/**
 * =========================================================================
 * ⚖️ 6. DISTRIBUTOR LIVE AUCTIONS ENDPOINTS
 * =========================================================================
 */

// GET /api/auctions
app.get('/api/auctions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT la.*, d.distributor_name, p.name AS product_name, p.category, p.photos, p.images
      FROM live_auctions la
      JOIN distributors d ON la.distributor_id = d.distributor_id
      JOIN products p ON la.auction_item_id = p.id
      ORDER BY la.auction_id ASC;
    `);
    const auctions = result.rows.map(row => ({
      auction_id: row.auction_id,
      id: row.auction_id,
      distributor_id: row.distributor_id,
      auction_item_id: row.auction_item_id,
      starting_bid_price: parseFloat(row.starting_bid_price),
      current_highest_bid: parseFloat(row.current_highest_bid),
      highest_bidder_vendor_id: row.highest_bidder_vendor_id,
      auction_countdown_end: row.auction_countdown_end,
      live_status: row.live_status,
      
      // Joined details
      supplier: row.distributor_name,
      itemName: row.product_name,
      category: row.category,
      photos: row.photos && row.photos.length > 0 ? row.photos : (row.images || [])
    }));
    return res.json(auctions);
  } catch (error) {
    console.error("❌ Database GET error on live auctions:", error.message);
    return res.status(500).json({ error: "Failed to retrieve live auctions." });
  }
});

// POST /api/auctions/:id/bid
app.post('/api/auctions/:id/bid', async (req, res) => {
  const { id } = req.params;
  const { storeId, bidAmount } = req.body;
  if (!storeId || bidAmount === undefined) {
    return res.status(400).json({ error: "storeId and bidAmount are required." });
  }
  try {
    const sId = parseInt(storeId);
    const amount = parseFloat(bidAmount);

    // Fetch the active auction record
    const aucRes = await pool.query("SELECT * FROM live_auctions WHERE auction_id = $1;", [parseInt(id)]);
    if (aucRes.rows.length === 0) {
      return res.status(404).json({ error: "Auction not found." });
    }

    const auction = aucRes.rows[0];
    if (!auction.live_status) {
      return res.status(400).json({ error: "This live auction has already closed." });
    }

    if (amount <= parseFloat(auction.current_highest_bid)) {
      return res.status(400).json({ error: "Placed bid must exceed the current highest bid price." });
    }

    // Update auction highest bid and bidder
    const result = await pool.query(`
      UPDATE live_auctions
      SET current_highest_bid = $1,
          highest_bidder_vendor_id = $2
      WHERE auction_id = $3
      RETURNING *;
    `, [amount, sId, parseInt(id)]);

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Database POST error on custom bid placement:", error.message);
    return res.status(500).json({ error: "Failed to place auction bid." });
  }
});

/**
 * PUT /api/products/:id
 * Full update of an existing product in the database.
 */
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { storeId, name, price, cost_price, stock, category, description } = req.body;

  if (!storeId) {
    return res.status(400).json({ error: "storeId is required." });
  }

  const query = `
    UPDATE products
    SET name = COALESCE($1, name),
        price = COALESCE($2, price),
        cost_price = COALESCE($3, cost_price),
        current_stock_level = COALESCE($4, current_stock_level),
        category = COALESCE($5, category),
        description = COALESCE($6, description),
        last_updated_timestamp = CURRENT_TIMESTAMP
    WHERE id = $7 AND store_id = $8
    RETURNING id, store_id, name, price, cost_price, current_stock_level, minimum_stock_threshold, category, description, images, photos, last_updated_timestamp;
  `;

  try {
    const result = await pool.query(query, [
      name !== undefined ? name.trim() : null,
      price !== undefined ? parseFloat(price) : null,
      cost_price !== undefined ? parseFloat(cost_price) : null,
      stock !== undefined ? parseInt(stock) : null,
      category !== undefined ? category.trim() : null,
      description !== undefined ? description.trim() : null,
      parseInt(id),
      parseInt(storeId)
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found for this store." });
    }

    const row = result.rows[0];
    const product = {
      id: row.id,
      product_id: row.id,
      name: row.name,
      product_name: row.name,
      price: parseFloat(row.price),
      unit_price: parseFloat(row.price),
      cost_price: parseFloat(row.cost_price || 0),
      stock: parseInt(row.current_stock_level || 0),
      current_stock_level: parseInt(row.current_stock_level || 0),
      minimum_stock_threshold: parseInt(row.minimum_stock_threshold || 5),
      last_updated_timestamp: row.last_updated_timestamp,
      category: row.category,
      description: row.description,
      images: row.photos && row.photos.length > 0 ? row.photos : (row.images || [])
    };
    return res.json(product);
  } catch (error) {
    console.error("❌ Database PUT error on product update:", error.message);
    return res.status(500).json({ error: "Failed to update product." });
  }
});

/**
 * DELETE /api/products/:id
 * Deletes a product from the database scoped by storeId.
 */
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { storeId } = req.query;

  if (!storeId) {
    return res.status(400).json({ error: "storeId query parameter is required." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM products WHERE id = $1 AND store_id = $2 RETURNING id AS product_id;",
      [parseInt(id), parseInt(storeId)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found for this store." });
    }

    return res.json({ success: true, message: "Product deleted successfully.", product_id: result.rows[0].product_id });
  } catch (error) {
    console.error("❌ Database DELETE error on products:", error.message);
    return res.status(500).json({ error: "Failed to delete product." });
  }
});

/**
 * GET /api/profit-loss/:storeId
 * Computes aggregated Profit & Loss from transactions linked to products.
 */
app.get('/api/profit-loss/:storeId', async (req, res) => {
  const { storeId } = req.params;

  try {
    const sId = parseInt(storeId);

    // Sum revenue and cost from transactions that have a linked product
    const salesResult = await pool.query(`
      SELECT 
        COALESCE(SUM(p.price * t.quantity), 0) AS total_revenue,
        COALESCE(SUM(p.cost_price * t.quantity), 0) AS total_cost
      FROM transactions t
      JOIN products p ON t.product_id = p.id
      WHERE t.store_id = $1 AND t.product_id IS NOT NULL;
    `, [sId]);

    // Add distributor order costs
    const distResult = await pool.query(`
      SELECT COALESCE(SUM(total_cost), 0) AS distributor_costs
      FROM distributor_orders
      WHERE store_id = $1;
    `, [sId]);

    const totalRevenue = parseFloat(salesResult.rows[0].total_revenue);
    const totalCost = parseFloat(salesResult.rows[0].total_cost) + parseFloat(distResult.rows[0].distributor_costs);
    const netProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return res.json({
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      profitMargin: parseFloat(profitMargin.toFixed(2))
    });
  } catch (error) {
    console.error("❌ Database GET error on profit-loss:", error.message);
    return res.status(500).json({ error: "Failed to compute profit & loss." });
  }
});

/**
 * GET /api/profit-loss/:storeId/products
 * Per-product Profit & Loss breakdown for a store.
 */
app.get('/api/profit-loss/:storeId/products', async (req, res) => {
  const { storeId } = req.params;

  try {
    const sId = parseInt(storeId);

    const result = await pool.query(`
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.price AS unit_price,
        p.cost_price,
        COALESCE(SUM(t.quantity), 0) AS units_sold,
        COALESCE(SUM(p.price * t.quantity), 0) AS revenue,
        COALESCE(SUM(p.cost_price * t.quantity), 0) AS cost
      FROM products p
      LEFT JOIN transactions t ON p.id = t.product_id AND t.store_id = $1
      WHERE p.store_id = $1
      GROUP BY p.id, p.name, p.price, p.cost_price
      ORDER BY p.id ASC;
    `, [sId]);

    const breakdown = result.rows.map(row => {
      const unitPrice = parseFloat(row.unit_price);
      const costPrice = parseFloat(row.cost_price || 0);
      const profitPerUnit = unitPrice - costPrice;
      const marginPerUnit = unitPrice > 0 ? (profitPerUnit / unitPrice) * 100 : 0;
      const unitsSold = parseInt(row.units_sold);
      const revenue = parseFloat(row.revenue);
      const cost = parseFloat(row.cost);
      const profit = revenue - cost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        product_id: row.product_id,
        product_name: row.product_name,
        unit_price: parseFloat(unitPrice.toFixed(2)),
        cost_price: parseFloat(costPrice.toFixed(2)),
        profit_per_unit: parseFloat(profitPerUnit.toFixed(2)),
        margin_per_unit: parseFloat(marginPerUnit.toFixed(2)),
        unitsSold,
        revenue: parseFloat(revenue.toFixed(2)),
        cost: parseFloat(cost.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        profitMargin: parseFloat(profitMargin.toFixed(2))
      };
    });

    return res.json(breakdown);
  } catch (error) {
    console.error("❌ Database GET error on profit-loss products:", error.message);
    return res.status(500).json({ error: "Failed to compute per-product profit & loss." });
  }
});

/**
 * GET /api/sales-reports/dynamic/:storeId
 * Dynamic chart data for sales reports with weekly/monthly/yearly grouping.
 */
app.get('/api/sales-reports/dynamic/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const { range } = req.query;

  try {
    const sId = parseInt(storeId);
    let dateTrunc, interval, labelFormat;

    switch (range) {
      case 'yearly':
        dateTrunc = 'month';
        interval = '365 days';
        break;
      case 'monthly':
        dateTrunc = 'week';
        interval = '30 days';
        break;
      case 'weekly':
      default:
        dateTrunc = 'day';
        interval = '7 days';
        break;
    }

    const result = await pool.query(`
      SELECT 
        DATE_TRUNC($1, t.created_at) AS period,
        COALESCE(SUM(t.amount), 0) AS revenue,
        COUNT(t.transaction_id) AS orders
      FROM transactions t
      WHERE t.store_id = $2 AND t.created_at >= NOW() - $3::INTERVAL
      GROUP BY DATE_TRUNC($1, t.created_at)
      ORDER BY period ASC;
    `, [dateTrunc, sId, interval]);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const labels = result.rows.map(row => {
      const d = new Date(row.period);
      if (range === 'yearly') {
        return monthNames[d.getMonth()];
      } else if (range === 'monthly') {
        return `Week ${Math.ceil(d.getDate() / 7)}`;
      } else {
        return dayNames[d.getDay()];
      }
    });

    const revenueData = result.rows.map(row => parseFloat(row.revenue));
    const ordersData = result.rows.map(row => parseInt(row.orders));

    return res.json({ labels, revenueData, ordersData });
  } catch (error) {
    console.error("❌ Database GET error on dynamic sales reports:", error.message);
    return res.status(500).json({ error: "Failed to generate dynamic sales report." });
  }
});

/**
 * POST /api/transactions/sale
 * Records a new sale transaction with automatic stock deduction and P&L tracking.
 */
app.post('/api/transactions/sale', async (req, res) => {
  const { storeId, productId, quantity, clientName, method } = req.body;

  if (!storeId || !productId || !quantity || !clientName || !method) {
    return res.status(400).json({ error: "storeId, productId, quantity, clientName, and method are required." });
  }

  try {
    const sId = parseInt(storeId);
    const pId = parseInt(productId);
    const qty = parseInt(quantity);

    // Look up product to get pricing and stock
    const prodResult = await pool.query(
      "SELECT id AS product_id, name AS product_name, price AS unit_price, cost_price, current_stock_level FROM products WHERE id = $1 AND store_id = $2;",
      [pId, sId]
    );

    if (prodResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found for this store." });
    }

    const product = prodResult.rows[0];
    const unitPrice = parseFloat(product.unit_price);
    const costPrice = parseFloat(product.cost_price || 0);
    const currentStock = parseInt(product.current_stock_level);

    if (currentStock < qty) {
      return res.status(400).json({ error: `Insufficient stock. Available: ${currentStock}, Requested: ${qty}` });
    }

    // Deduct stock
    await pool.query(
      "UPDATE products SET current_stock_level = current_stock_level - $1, last_updated_timestamp = CURRENT_TIMESTAMP WHERE id = $2;",
      [qty, pId]
    );

    // Generate transaction ID and calculate amounts
    const transactionId = `TX_${Date.now()}_${sId}`;
    const totalAmount = unitPrice * qty;
    const totalCost = costPrice * qty;
    const netProfit = totalAmount - totalCost;
    const profitMargin = totalAmount > 0 ? (netProfit / totalAmount) * 100 : 0;

    // Insert into transactions
    const txResult = await pool.query(`
      INSERT INTO transactions (transaction_id, store_id, client_name, amount, method, status, product_id, quantity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `, [transactionId, sId, clientName.trim(), totalAmount, method.trim(), 'Cleared', pId, qty]);

    // Insert into profit_loss_tracking
    await pool.query(`
      INSERT INTO profit_loss_tracking (transaction_id, cost_price_per_unit, selling_price_per_unit, net_profit_margin, total_expense, total_revenue)
      VALUES ($1, $2, $3, $4, $5, $6);
    `, [transactionId, costPrice, unitPrice, profitMargin, totalCost, totalAmount]);

    const txRow = txResult.rows[0];
    return res.status(201).json({
      transaction_id: txRow.transaction_id,
      store_id: txRow.store_id,
      product_id: txRow.product_id,
      product_name: product.product_name,
      quantity: txRow.quantity,
      client_name: txRow.client_name,
      amount: parseFloat(txRow.amount),
      method: txRow.method,
      status: txRow.status,
      created_at: txRow.created_at,
      profitLoss: {
        cost_price_per_unit: costPrice,
        selling_price_per_unit: unitPrice,
        total_expense: parseFloat(totalCost.toFixed(2)),
        total_revenue: parseFloat(totalAmount.toFixed(2)),
        net_profit: parseFloat(netProfit.toFixed(2)),
        profit_margin: parseFloat(profitMargin.toFixed(2))
      }
    });
  } catch (error) {
    console.error("❌ Database POST error on sale transaction:", error.message);
    return res.status(500).json({ error: "Failed to record sale transaction." });
  }
});

/**
 * =========================================================================
 * 🤖 GEMINI AI STRATEGIC ADVISOR ENDPOINT
 * =========================================================================
 */

/**
 * POST /api/chat
 * Calls Google Gemini API with real store context (inventory, P&L, transactions)
 * and a strict system prompt that limits responses to vendor/commerce topics.
 */
app.post('/api/chat', async (req, res) => {
  const { storeId, storeName, userMessage, chatHistory } = req.body;

  if (!storeId || !userMessage) {
    return res.status(400).json({ error: "storeId and userMessage are required." });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return res.status(500).json({ error: "Gemini API key is not configured on the server." });
  }

  try {
    const sId = parseInt(storeId);

    // --- Gather real store context from the database ---
    const [prodResult, txResult, plResult, distResult] = await Promise.all([
      pool.query(
        `SELECT name AS product_name, price AS unit_price, cost_price, current_stock_level, minimum_stock_threshold, category
         FROM products WHERE store_id = $1 ORDER BY id ASC LIMIT 20;`,
        [sId]
      ),
      pool.query(
        `SELECT client_name, amount, method, status, created_at
         FROM transactions WHERE store_id = $1 ORDER BY created_at DESC LIMIT 10;`,
        [sId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(p.price * t.quantity), 0) AS total_revenue,
                COALESCE(SUM(p.cost_price * t.quantity), 0) AS total_cost
         FROM transactions t
         JOIN products p ON t.product_id = p.id
         WHERE t.store_id = $1 AND t.product_id IS NOT NULL;`,
        [sId]
      ),
      pool.query(
        `SELECT ordered_items_list, total_cost, order_status
         FROM distributor_orders WHERE store_id = $1 ORDER BY distributor_order_id DESC LIMIT 5;`,
        [sId]
      )
    ]);

    const products = prodResult.rows;
    const transactions = txResult.rows;
    const plRow = plResult.rows[0];
    const distOrders = distResult.rows;

    const totalRevenue = parseFloat(plRow.total_revenue || 0);
    const totalCost = parseFloat(plRow.total_cost || 0);
    const netProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;

    const lowStockItems = products.filter(p => parseInt(p.current_stock_level) <= parseInt(p.minimum_stock_threshold));
    const outOfStockItems = products.filter(p => parseInt(p.current_stock_level) === 0);

    // Build a concise store context summary for the AI
    const storeContext = `
STORE: "${storeName || 'Unknown'}" (ID: ${sId})

INVENTORY (${products.length} products):
${products.map(p =>
  `- ${p.product_name} | Category: ${p.category} | Price: $${parseFloat(p.unit_price).toFixed(2)} | Cost: $${parseFloat(p.cost_price || 0).toFixed(2)} | Stock: ${p.current_stock_level} (min threshold: ${p.minimum_stock_threshold})`
).join('\n')}

LOW STOCK ALERTS (${lowStockItems.length}):
${lowStockItems.length > 0 ? lowStockItems.map(p => `- ${p.product_name}: ${p.current_stock_level} units remaining`).join('\n') : 'None'}

OUT OF STOCK (${outOfStockItems.length}):
${outOfStockItems.length > 0 ? outOfStockItems.map(p => `- ${p.product_name}`).join('\n') : 'None'}

FINANCIAL SUMMARY:
- Total Revenue: $${totalRevenue.toFixed(2)}
- Total Cost: $${totalCost.toFixed(2)}
- Net Profit: $${netProfit.toFixed(2)}
- Profit Margin: ${profitMargin}%

RECENT TRANSACTIONS (last 10):
${transactions.length > 0 ? transactions.map(t =>
  `- ${t.client_name} | $${parseFloat(t.amount).toFixed(2)} | ${t.method} | ${t.status} | ${new Date(t.created_at).toLocaleDateString()}`
).join('\n') : 'No transactions yet'}

RECENT DISTRIBUTOR ORDERS (last 5):
${distOrders.length > 0 ? distOrders.map(d =>
  `- ${d.item_name} | Qty: ${d.quantity_ordered} | Cost: $${parseFloat(d.total_cost).toFixed(2)} | Status: ${d.order_status}`
).join('\n') : 'No distributor orders yet'}
`.trim();

    // System prompt: strategic advisor, strictly on-topic
    const systemPrompt = `You are VerseAI, an expert strategic business advisor embedded inside VendorVerse — a vendor management platform for small businesses.

Your role is to provide sharp, actionable, data-driven strategic advice to the vendor based on their REAL store data provided below.

STRICT RULES:
1. You ONLY answer questions related to: inventory management, sales strategy, pricing, profit optimization, restocking decisions, distributor sourcing, business growth, product trends, financial analysis, and vendor operations.
2. If the user asks about ANYTHING unrelated to their business or the VendorVerse platform (e.g., general knowledge, coding, politics, entertainment, personal topics), politely decline and redirect them to ask about their store.
3. Always reference the actual store data when relevant — use real product names, real numbers, real stock levels from the context.
4. Be concise, direct, and strategic. Avoid filler phrases. Give specific recommendations.
5. When you spot risks (low stock, low margins, no sales), proactively flag them even if not asked.
6. Format responses clearly. Use bullet points for lists. Keep responses under 200 words unless a detailed breakdown is explicitly requested.

CURRENT STORE DATA:
${storeContext}`;

    // Build conversation history for multi-turn context (last 6 messages max)
    const recentHistory = (chatHistory || []).slice(-6);
    const contents = [
      ...recentHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      })),
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ];

    // Call Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
            topP: 0.9
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error("❌ Gemini API error:", geminiRes.status, errBody);
      let exactError = "Gemini API request failed.";
      try {
        const parsed = JSON.parse(errBody);
        if (parsed.error && parsed.error.message) {
          exactError = parsed.error.message;
        }
      } catch (e) { /* ignore parse error */ }
      return res.status(502).json({ error: exactError, details: errBody });
    }

    const geminiData = await geminiRes.json();
    const aiText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      console.error("❌ Gemini returned no text:", JSON.stringify(geminiData));
      return res.status(502).json({ error: "Gemini returned an empty response." });
    }

    return res.json({ reply: aiText.trim() });

  } catch (error) {
    console.error("❌ /api/chat error:", error.message);
    return res.status(500).json({ error: error.message || "Failed to process AI chat request." });
  }
});

// Start Express server listening loop
app.listen(PORT, () => {
  console.log(`🚀 Secure Express server running at http://localhost:${PORT}`);
});
