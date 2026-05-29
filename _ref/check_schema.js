import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function check() {
  const c = await pool.connect();
  try {
    const tables = ['products', 'transactions', 'distributor_orders', 'product_deliveries', 'live_auctions'];
    for (const t of tables) {
      const r = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`, [t]);
      console.log(`\n=== ${t} ===`);
      r.rows.forEach(row => console.log(`  ${row.column_name} (${row.data_type})`));
    }
  } finally { c.release(); await pool.end(); }
}
check().catch(e => { console.error(e); process.exit(1); });
