import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function inspect() {
  const tables = ['products', 'profit_loss_tracking', 'sales_reports', 'transactions'];
  for (const t of tables) {
    const r = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`, [t]);
    console.log(`\n=== ${t.toUpperCase()} ===`);
    r.rows.forEach(c => console.log(`  ${c.column_name} — ${c.data_type}`));
  }
  // Check sample product data  
  const p = await pool.query('SELECT product_id, product_name, unit_price, current_stock_level FROM products LIMIT 5');
  console.log('\n=== SAMPLE PRODUCTS ===');
  p.rows.forEach(r => console.log(`  ID:${r.product_id} | ${r.product_name} | Price:${r.unit_price} | Stock:${r.current_stock_level}`));
  
  // Check sample P&L data
  const pl = await pool.query('SELECT * FROM profit_loss_tracking LIMIT 3');
  console.log('\n=== SAMPLE P&L ===');
  pl.rows.forEach(r => console.log(`  ${JSON.stringify(r)}`));

  await pool.end();
}

inspect().catch(e => { console.error(e.message); process.exit(1); });
