import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fixPL() {
  const c = await pool.connect();
  try {
    const stores = await c.query('SELECT store_id FROM stores');
    for (const s of stores.rows) {
      const sId = s.store_id;
      const txs = await c.query(
        'SELECT t.transaction_id, t.quantity, p.cost_price, p.unit_price FROM transactions t JOIN products p ON t.product_id = p.product_id WHERE t.store_id = $1',
        [sId]
      );
      for (const tx of txs.rows) {
        const cost = parseFloat(tx.cost_price || 0);
        const sell = parseFloat(tx.unit_price);
        const qty = parseInt(tx.quantity || 1);
        const tExp = cost * qty;
        const tRev = sell * qty;
        const margin = tRev > 0 ? ((tRev - tExp) / tRev * 100) : 0;

        const exists = await c.query('SELECT 1 FROM profit_loss_tracking WHERE transaction_id = $1', [tx.transaction_id]);
        if (exists.rows.length > 0) {
          await c.query(
            'UPDATE profit_loss_tracking SET cost_price_per_unit = $1, selling_price_per_unit = $2, net_profit_margin = $3, total_expense = $4, total_revenue = $5 WHERE transaction_id = $6',
            [cost, sell, parseFloat(margin.toFixed(2)), tExp, tRev, tx.transaction_id]
          );
        } else {
          await c.query(
            'INSERT INTO profit_loss_tracking (transaction_id, cost_price_per_unit, selling_price_per_unit, net_profit_margin, total_expense, total_revenue) VALUES ($1, $2, $3, $4, $5, $6)',
            [tx.transaction_id, cost, sell, parseFloat(margin.toFixed(2)), tExp, tRev]
          );
        }
      }
      console.log('Fixed store', sId);
    }

    // Verify
    const check = await c.query(
      'SELECT t.transaction_id, plt.total_expense, plt.total_revenue, plt.net_profit_margin FROM transactions t JOIN profit_loss_tracking plt ON t.transaction_id = plt.transaction_id WHERE t.product_id IS NOT NULL'
    );
    console.log('\n=== VERIFIED P&L DATA ===');
    check.rows.forEach(r => console.log(`${r.transaction_id} | Exp: $${r.total_expense} | Rev: $${r.total_revenue} | Margin: ${r.net_profit_margin}%`));
  } finally {
    c.release();
    await pool.end();
  }
}

fixPL().catch(e => { console.error(e); process.exit(1); });
