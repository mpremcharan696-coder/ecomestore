import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyNewModules() {
  const client = await pool.connect();
  console.log('✓ Connected to Neon PostgreSQL\n');

  try {
    const tables = [
      {
        label: 'SYSTEM 7: TELEGRAM CUSTOMER MESSAGING',
        name: 'telegram_customers',
        expected: [
          { col: 'customer_id',                 desc: 'Primary Key' },
          { col: 'telegram_chat_id',             desc: 'String/BigInt chat identifier' },
          { col: 'opt_in_status',                desc: 'Boolean opt-in flag' },
          { col: 'last_message_sent_timestamp',  desc: 'Timestamp last message' },
          { col: 'message_delivery_status',      desc: 'Enum: Sent, Delivered, Failed' },
        ]
      },
      {
        label: 'SYSTEM 8: PRODUCT DELIVERY INFORMATION',
        name: 'product_deliveries',
        expected: [
          { col: 'delivery_id',               desc: 'Primary Key' },
          { col: 'tracking_number',           desc: 'String tracking ID' },
          { col: 'shipping_carrier',          desc: 'String carrier name' },
          { col: 'estimated_delivery_time',   desc: 'Timestamp ETA' },
          { col: 'actual_delivery_time',      desc: 'Timestamp actual arrival' },
          { col: 'current_gps_coordinates',   desc: 'String/GeoJSON GPS coords' },
        ]
      },
      {
        label: 'SYSTEM 9: PAYMENT TRANSACTIONS',
        name: 'payment_transactions',
        expected: [
          { col: 'payment_gateway_transaction_id', desc: 'String Primary Key' },
          { col: 'payment_method',                 desc: 'Enum: UPI, Card, NetBanking, Cash' },
          { col: 'payment_status',                 desc: 'Enum: Success, Failed, Processing, Refunded' },
          { col: 'gateway_response_payload',       desc: 'JSON response from gateway' },
        ]
      },
      {
        label: 'SYSTEM 10: TELEGRAM VENDOR COMMUNITY',
        name: 'telegram_vendor_communities',
        expected: [
          { col: 'vendor_telegram_id',    desc: 'String vendor Telegram ID' },
          { col: 'community_group_id',    desc: 'String group identifier' },
          { col: 'community_role',        desc: 'Enum: Admin, Member, Moderator' },
          { col: 'join_date',             desc: 'Date joined' },
          { col: 'community_ban_status',  desc: 'Boolean ban flag' },
        ]
      },
      {
        label: 'SYSTEM 11: AI ASSISTANCE CHATBOT',
        name: 'chatbot_sessions',
        expected: [
          { col: 'session_id',              desc: 'Primary Key' },
          { col: 'user_query_text',         desc: 'Text user query' },
          { col: 'ai_response_text',        desc: 'Text AI response' },
          { col: 'intent_classification',   desc: 'String intent label' },
          { col: 'user_satisfaction_rating', desc: 'Integer 1-5 rating' },
        ]
      },
      {
        label: 'SYSTEM 12: LIVE AUCTION SYSTEM',
        name: 'live_auctions',
        expected: [
          { col: 'auction_id',              desc: 'Primary Key' },
          { col: 'distributor_id',          desc: 'Foreign Key → distributors' },
          { col: 'auction_item_id',         desc: 'Foreign Key → products' },
          { col: 'starting_bid_price',      desc: 'Decimal starting bid' },
          { col: 'current_highest_bid',     desc: 'Decimal current highest bid' },
          { col: 'highest_bidder_vendor_id', desc: 'Foreign Key → stores' },
          { col: 'auction_countdown_end',   desc: 'Timestamp countdown end' },
          { col: 'live_status',             desc: 'Boolean live/ended flag' },
        ]
      },
    ];

    let grandTotal = 0;
    let grandPass = 0;

    for (const tbl of tables) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(` ${tbl.label}`);
      console.log(`${'='.repeat(60)}`);

      const res = await client.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_name = $1
         ORDER BY ordinal_position`,
        [tbl.name]
      );

      if (res.rows.length === 0) {
        console.log(`❌ Table '${tbl.name}' does not exist in the database!`);
        grandTotal += tbl.expected.length;
        continue;
      }

      console.table(res.rows.map(r => ({
        Column: r.column_name,
        'Data Type': r.data_type,
        Nullable: r.is_nullable,
        Default: r.column_default || 'None'
      })));

      const colNames = res.rows.map(r => r.column_name);
      let allPass = true;

      for (const exp of tbl.expected) {
        grandTotal++;
        if (colNames.includes(exp.col)) {
          const row = res.rows.find(r => r.column_name === exp.col);
          console.log(`  ✓ '${exp.col}' — ${exp.desc} | Type: ${row.data_type}`);
          grandPass++;
        } else {
          console.log(`  ❌ MISSING: '${exp.col}' — ${exp.desc}`);
          allPass = false;
        }
      }

      // Row count
      const cnt = await client.query(`SELECT COUNT(*) FROM ${tbl.name}`);
      console.log(`\n  → Seeded Rows: ${cnt.rows[0].count}`);

      if (allPass) {
        console.log(`\n🎉 ${tbl.name.toUpperCase()} — ALL COLUMNS VERIFIED`);
      } else {
        console.log(`\n❌ ${tbl.name.toUpperCase()} — VERIFICATION FAILED`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(` GRAND SUMMARY: ${grandPass}/${grandTotal} columns verified across 6 new modules`);
    if (grandPass === grandTotal) {
      console.log(' 🏆 ALL 6 ADVANCED RELATIONAL MODULES FULLY VERIFIED!');
    } else {
      console.log(` ⚠️  ${grandTotal - grandPass} column(s) missing — check schema above.`);
    }
    console.log(`${'='.repeat(60)}\n`);

  } finally {
    client.release();
    await pool.end();
  }
}

verifyNewModules().catch(e => {
  console.error('❌ Verification error:', e.message);
  process.exit(1);
});
