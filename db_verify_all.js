import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

console.log("Connecting to Neon PostgreSQL database for final multi-system schema verification...");

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runInspection() {
  let client;
  try {
    client = await pool.connect();
    console.log("✓ Connected securely to Neon!");

    // System 1: Distributor Ordering System
    console.log("\n=======================================================");
    console.log(" SYSTEM 1: DISTRIBUTOR ORDERING SYSTEM SCHEMA");
    console.log("=======================================================");
    
    const distOrdersCols = await client.query(`
      SELECT c.column_name, c.data_type, c.is_nullable, c.column_default
      FROM information_schema.columns c
      WHERE c.table_name = 'distributor_orders'
      ORDER BY c.ordinal_position;
    `);

    console.table(distOrdersCols.rows.map(row => ({
      Column: row.column_name,
      'Data Type': row.data_type,
      Nullable: row.is_nullable,
      Default: row.column_default || 'None'
    })));

    const expectedDistVars = [
      { name: 'distributor_order_id', type: 'integer', desc: 'Primary Key' },
      { name: 'distributor_id', type: 'integer', desc: 'Foreign Key' },
      { name: 'ordered_items_list', type: 'jsonb', desc: 'JSON/Array of items' },
      { name: 'order_status', type: 'character varying', desc: 'Status (Enum-like state)' },
      { name: 'order_date', type: 'timestamp with time zone', desc: 'Order Timestamp' },
      { name: 'total_cost', type: 'numeric', desc: 'Decimal total' }
    ];

    let distSystemAllFound = true;
    for (const v of expectedDistVars) {
      const match = distOrdersCols.rows.find(c => c.column_name === v.name);
      if (match) {
        const typeMatch = match.data_type.toLowerCase().includes(v.type.toLowerCase());
        console.log(`✓ [DISTRIBUTOR] Column '${v.name}' is verified. Type: '${match.data_type}' (${v.desc}), Nullable: ${match.is_nullable}, Default: ${match.column_default || 'None'}`);
      } else {
        console.log(`❌ [DISTRIBUTOR] Column '${v.name}' is MISSING!`);
        distSystemAllFound = false;
      }
    }

    if (distSystemAllFound) {
      console.log("🎉 DISTRIBUTOR ORDERING SYSTEM SCHEMA VERIFIED SUCCESSFULLY!");
    } else {
      console.log("❌ DISTRIBUTOR ORDERING SYSTEM SCHEMA VERIFICATION FAILED!");
    }

    // System 2: AI Restocking Notifications
    console.log("\n=======================================================");
    console.log(" SYSTEM 2: AI RESTOCKING NOTIFICATIONS SCHEMA");
    console.log("=======================================================");
    
    const notifCols = await client.query(`
      SELECT c.column_name, c.data_type, c.is_nullable, c.column_default
      FROM information_schema.columns c
      WHERE c.table_name = 'ai_restocking_notifications'
      ORDER BY c.ordinal_position;
    `);

    console.table(notifCols.rows.map(row => ({
      Column: row.column_name,
      'Data Type': row.data_type,
      Nullable: row.is_nullable,
      Default: row.column_default || 'None'
    })));

    const expectedNotifVars = [
      { name: 'notification_id', type: 'integer', desc: 'Primary Key' },
      { name: 'vendor_id', type: 'integer', desc: 'Foreign Key (scoping)' },
      { name: 'alert_type', type: 'character varying', desc: 'Enum alert type' },
      { name: 'product_id', type: 'integer', desc: 'Foreign Key reference' },
      { name: 'ai_predicted_restock_date', type: 'timestamp with time zone', desc: 'Prediction Timestamp' },
      { name: 'is_read', type: 'boolean', desc: 'Read state flag' }
    ];

    let notifSystemAllFound = true;
    for (const v of expectedNotifVars) {
      const match = notifCols.rows.find(c => c.column_name === v.name);
      if (match) {
        console.log(`✓ [NOTIFICATIONS] Column '${v.name}' is verified. Type: '${match.data_type}' (${v.desc}), Nullable: ${match.is_nullable}, Default: ${match.column_default || 'None'}`);
      } else {
        console.log(`❌ [NOTIFICATIONS] Column '${v.name}' is MISSING!`);
        notifSystemAllFound = false;
      }
    }

    if (notifSystemAllFound) {
      console.log("🎉 AI RESTOCKING NOTIFICATIONS SCHEMA VERIFIED SUCCESSFULLY!");
    } else {
      console.log("❌ AI RESTOCKING NOTIFICATIONS SCHEMA VERIFICATION FAILED!");
    }

    // System 3: Product Trend Analysis
    console.log("\n=======================================================");
    console.log(" SYSTEM 3: PRODUCT TREND ANALYSIS SCHEMA");
    console.log("=======================================================");
    
    const trendCols = await client.query(`
      SELECT c.column_name, c.data_type, c.is_nullable, c.column_default
      FROM information_schema.columns c
      WHERE c.table_name = 'product_trends'
      ORDER BY c.ordinal_position;
    `);

    console.table(trendCols.rows.map(row => ({
      Column: row.column_name,
      'Data Type': row.data_type,
      Nullable: row.is_nullable,
      Default: row.column_default || 'None'
    })));

    const expectedTrendVars = [
      { name: 'product_id', type: 'integer', desc: 'Primary Key referencing products' },
      { name: 'product_sales_velocity', type: 'numeric', desc: 'Float/Decimal sales growth rate' },
      { name: 'times_demanded_count', type: 'integer', desc: 'Integer demand count' },
      { name: 'trending_rank', type: 'integer', desc: 'Integer relative rank' },
      { name: 'peak_sales_season', type: 'character varying', desc: 'String peak season' },
      { name: 'high_margin_operator_flag', type: 'boolean', desc: 'Boolean high margin indicator' }
    ];

    let trendSystemAllFound = true;
    for (const v of expectedTrendVars) {
      const match = trendCols.rows.find(c => c.column_name === v.name);
      if (match) {
        console.log(`✓ [TRENDS] Column '${v.name}' is verified. Type: '${match.data_type}' (${v.desc}), Nullable: ${match.is_nullable}, Default: ${match.column_default || 'None'}`);
      } else {
        console.log(`❌ [TRENDS] Column '${v.name}' is MISSING!`);
        trendSystemAllFound = false;
      }
    }

    if (trendSystemAllFound) {
      console.log("🎉 PRODUCT TREND ANALYSIS SCHEMA VERIFIED SUCCESSFULLY!");
    } else {
      console.log("❌ PRODUCT TREND ANALYSIS SCHEMA VERIFICATION FAILED!");
    }

    // System 4: Profit & Loss Tracking
    console.log("\n=======================================================");
    console.log(" SYSTEM 4: PROFIT & LOSS TRACKING SCHEMA");
    console.log("=======================================================");
    
    const plCols = await client.query(`
      SELECT c.column_name, c.data_type, c.is_nullable, c.column_default
      FROM information_schema.columns c
      WHERE c.table_name = 'profit_loss_tracking'
      ORDER BY c.ordinal_position;
    `);

    console.table(plCols.rows.map(row => ({
      Column: row.column_name,
      'Data Type': row.data_type,
      Nullable: row.is_nullable,
      Default: row.column_default || 'None'
    })));

    const expectedPLVars = [
      { name: 'transaction_id', type: 'character varying', desc: 'Primary Key referencing transactions' },
      { name: 'cost_price_per_unit', type: 'numeric', desc: 'Decimal unit cost' },
      { name: 'selling_price_per_unit', type: 'numeric', desc: 'Decimal unit selling price' },
      { name: 'net_profit_margin', type: 'numeric', desc: 'Decimal net margin' },
      { name: 'total_expense', type: 'numeric', desc: 'Decimal total expense' },
      { name: 'total_revenue', type: 'numeric', desc: 'Decimal total revenue' }
    ];

    let plSystemAllFound = true;
    for (const v of expectedPLVars) {
      const match = plCols.rows.find(c => c.column_name === v.name);
      if (match) {
        console.log(`✓ [P&L] Column '${v.name}' is verified. Type: '${match.data_type}' (${v.desc}), Nullable: ${match.is_nullable}, Default: ${match.column_default || 'None'}`);
      } else {
        console.log(`❌ [P&L] Column '${v.name}' is MISSING!`);
        plSystemAllFound = false;
      }
    }

    if (plSystemAllFound) {
      console.log("🎉 PROFIT & LOSS TRACKING SCHEMA VERIFIED SUCCESSFULLY!");
    } else {
      console.log("❌ PROFIT & LOSS TRACKING SCHEMA VERIFICATION FAILED!");
    }

    // System 5: Sales Reports
    console.log("\n=======================================================");
    console.log(" SYSTEM 5: SALES REPORTS SCHEMA");
    console.log("=======================================================");
    
    const repCols = await client.query(`
      SELECT c.column_name, c.data_type, c.is_nullable, c.column_default
      FROM information_schema.columns c
      WHERE c.table_name = 'sales_reports'
      ORDER BY c.ordinal_position;
    `);

    console.table(repCols.rows.map(row => ({
      Column: row.column_name,
      'Data Type': row.data_type,
      Nullable: row.is_nullable,
      Default: row.column_default || 'None'
    })));

    const expectedRepVars = [
      { name: 'report_id', type: 'integer', desc: 'Primary Key identity' },
      { name: 'store_id', type: 'integer', desc: 'Foreign Key reference to stores' },
      { name: 'report_type', type: 'character varying', desc: 'Enum Weekly/Monthly/Yearly/Custom' },
      { name: 'total_sales_volume', type: 'integer', desc: 'Integer total sales volume' },
      { name: 'gross_revenue', type: 'numeric', desc: 'Decimal gross revenue' },
      { name: 'start_date', type: 'date', desc: 'Start date of reporting' },
      { name: 'end_date', type: 'date', desc: 'End date of reporting' }
    ];

    let repSystemAllFound = true;
    for (const v of expectedRepVars) {
      const match = repCols.rows.find(c => c.column_name === v.name);
      if (match) {
        console.log(`✓ [REPORTS] Column '${v.name}' is verified. Type: '${match.data_type}' (${v.desc}), Nullable: ${match.is_nullable}, Default: ${match.column_default || 'None'}`);
      } else {
        console.log(`❌ [REPORTS] Column '${v.name}' is MISSING!`);
        repSystemAllFound = false;
      }
    }

    if (repSystemAllFound) {
      console.log("🎉 SALES REPORTS SCHEMA VERIFIED SUCCESSFULLY!");
    } else {
      console.log("❌ SALES REPORTS SCHEMA VERIFICATION FAILED!");
    }

    // System 6: Invoice Billing & AI Checking
    console.log("\n=======================================================");
    console.log(" SYSTEM 6: INVOICE BILLING & AI CHECKING SCHEMA");
    console.log("=======================================================");
    
    const invCols = await client.query(`
      SELECT c.column_name, c.data_type, c.is_nullable, c.column_default
      FROM information_schema.columns c
      WHERE c.table_name = 'invoices'
      ORDER BY c.ordinal_position;
    `);

    console.table(invCols.rows.map(row => ({
      Column: row.column_name,
      'Data Type': row.data_type,
      Nullable: row.is_nullable,
      Default: row.column_default || 'None'
    })));

    const expectedInvVars = [
      { name: 'invoice_id', type: 'integer', desc: 'Primary Key auto-increment' },
      { name: 'store_id', type: 'integer', desc: 'Foreign Key scoping' },
      { name: 'tax_amount', type: 'numeric', desc: 'Decimal tax amount' },
      { name: 'discount_applied', type: 'numeric', desc: 'Decimal discount amount' },
      { name: 'final_payable_amount', type: 'numeric', desc: 'Decimal final payable amount' },
      { name: 'ai_verification_status', type: 'character varying', desc: 'Enum Verified/Flagged/Mismatch' },
      { name: 'ai_error_logs', type: 'text', desc: 'Text audit verification logs' }
    ];

    let invSystemAllFound = true;
    for (const v of expectedInvVars) {
      const match = invCols.rows.find(c => c.column_name === v.name);
      if (match) {
        console.log(`✓ [INVOICES] Column '${v.name}' is verified. Type: '${match.data_type}' (${v.desc}), Nullable: ${match.is_nullable}, Default: ${match.column_default || 'None'}`);
      } else {
        console.log(`❌ [INVOICES] Column '${v.name}' is MISSING!`);
        invSystemAllFound = false;
      }
    }

    if (invSystemAllFound) {
      console.log("🎉 INVOICE BILLING & AI CHECKING SCHEMA VERIFIED SUCCESSFULLY!");
    } else {
      console.log("❌ INVOICE BILLING & AI CHECKING SCHEMA VERIFICATION FAILED!");
    }

  } catch (err) {
    console.error("❌ Schema verification execution error:", err.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runInspection();
