import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fixSchema() {
  const c = await pool.connect();
  try {
    console.log('Fixing products table...');
    
    // Add missing columns to products
    const alters = [
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id INTEGER`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS current_stock_level INTEGER DEFAULT 0`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS minimum_stock_threshold INTEGER DEFAULT 5`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS last_updated_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[]`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS photos TEXT[]`,
    ];
    
    for (const sql of alters) {
      try {
        await c.query(sql);
        console.log('  ✓', sql.substring(0, 60));
      } catch(e) {
        console.log('  ⚠', e.message);
      }
    }

    // Backfill store_id from vendor_id where store_id is null
    try {
      await c.query(`UPDATE products SET store_id = vendor_id WHERE store_id IS NULL AND vendor_id IS NOT NULL`);
      console.log('  ✓ Backfilled store_id from vendor_id');
    } catch(e) { console.log('  ⚠', e.message); }

    // Verify columns
    const r = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position`);
    console.log('\n=== Updated products schema ===');
    r.rows.forEach(row => console.log(`  ${row.column_name} (${row.data_type})`));

  } finally { c.release(); await pool.end(); }
}

fixSchema().catch(e => { console.error(e); process.exit(1); });
