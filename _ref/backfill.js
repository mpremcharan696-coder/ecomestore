import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function backfill() {
  const client = await pool.connect();
  try {
    // Backfill cost_price for existing products that have 0
    await client.query(`UPDATE products SET cost_price = 85.00 WHERE product_name = 'Quantum Processor Cores' AND (cost_price IS NULL OR cost_price = 0);`);
    await client.query(`UPDATE products SET cost_price = 12.00 WHERE product_name = 'Aetheric Flux Diodes' AND (cost_price IS NULL OR cost_price = 0);`);
    await client.query(`UPDATE products SET cost_price = 42.00 WHERE product_name = 'Torus Magnetic Induction Rings' AND (cost_price IS NULL OR cost_price = 0);`);
    await client.query(`UPDATE products SET cost_price = 7.50 WHERE product_name = 'Glass Graphene Capacitors' AND (cost_price IS NULL OR cost_price = 0);`);
    console.log('✓ Backfilled cost_price for existing products');

    // Backfill product_id on existing transactions
    const stores = await client.query('SELECT store_id FROM stores');
    for (const store of stores.rows) {
      const sId = store.store_id;
      // TX_8820 -> Quantum Processor Cores
      const qpc = await client.query('SELECT product_id FROM products WHERE store_id = $1 AND product_name = $2', [sId, 'Quantum Processor Cores']);
      if (qpc.rows.length > 0) {
        await client.query('UPDATE transactions SET product_id = $1, quantity = 1 WHERE transaction_id = $2 AND (product_id IS NULL)', [qpc.rows[0].product_id, `TX_8820_${sId}`]);
      }
      // TX_5541 -> Torus Magnetic Induction Rings
      const tmr = await client.query('SELECT product_id FROM products WHERE store_id = $1 AND product_name = $2', [sId, 'Torus Magnetic Induction Rings']);
      if (tmr.rows.length > 0) {
        await client.query('UPDATE transactions SET product_id = $1, quantity = 10 WHERE transaction_id = $2 AND (product_id IS NULL)', [tmr.rows[0].product_id, `TX_5541_${sId}`]);
      }
      // TX_1092 -> Aetheric Flux Diodes
      const afd = await client.query('SELECT product_id FROM products WHERE store_id = $1 AND product_name = $2', [sId, 'Aetheric Flux Diodes']);
      if (afd.rows.length > 0) {
        await client.query('UPDATE transactions SET product_id = $1, quantity = 1 WHERE transaction_id = $2 AND (product_id IS NULL)', [afd.rows[0].product_id, `TX_1092_${sId}`]);
      }

      // Update P&L tracking with real cost/selling prices
      const txRows = await client.query(`
        SELECT t.transaction_id, t.quantity, p.cost_price, p.unit_price 
        FROM transactions t 
        JOIN products p ON t.product_id = p.product_id 
        WHERE t.store_id = $1
      `, [sId]);

      for (const tx of txRows.rows) {
        const cost = parseFloat(tx.cost_price || 0);
        const sell = parseFloat(tx.unit_price);
        const qty = parseInt(tx.quantity || 1);
        const totalExp = cost * qty;
        const totalRev = sell * qty;
        const margin = totalRev > 0 ? ((totalRev - totalExp) / totalRev * 100) : 0;
        
        await client.query(`
          UPDATE profit_loss_tracking 
          SET cost_price_per_unit = $1, selling_price_per_unit = $2, net_profit_margin = $3, total_expense = $4, total_revenue = $5
          WHERE transaction_id = $6
        `, [cost, sell, parseFloat(margin.toFixed(2)), totalExp, totalRev, tx.transaction_id]);
      }
      console.log(`✓ Backfilled product links and P&L for store ${sId}`);
    }

    // Verify
    const result = await client.query(`
      SELECT t.transaction_id, t.product_id, t.quantity, p.product_name, p.cost_price, p.unit_price,
             plt.total_expense, plt.total_revenue, plt.net_profit_margin
      FROM transactions t
      LEFT JOIN products p ON t.product_id = p.product_id
      LEFT JOIN profit_loss_tracking plt ON t.transaction_id = plt.transaction_id
      ORDER BY t.transaction_id
    `);
    console.log('\n=== VERIFICATION ===');
    for (const r of result.rows) {
      console.log(`${r.transaction_id} | Product: ${r.product_name || 'N/A'} | Qty: ${r.quantity} | Cost: $${r.cost_price} | Sell: $${r.unit_price} | TotalExp: $${r.total_expense} | TotalRev: $${r.total_revenue} | Margin: ${r.net_profit_margin}%`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

backfill().catch(e => { console.error(e); process.exit(1); });
