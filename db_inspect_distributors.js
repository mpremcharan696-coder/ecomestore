import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

console.log("Connecting to Neon PostgreSQL database for Distributor Ordering System schema verification...");

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function inspectDistributorTables() {
  let client;
  try {
    client = await pool.connect();
    console.log("✓ Connected securely to Neon!");

    // Get list of all tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log("\n--- Active Tables in Database ---");
    console.log(tablesRes.rows.map(r => r.table_name).join(", "));

    // Check specific table distributor_orders or similar
    const targetTables = ['distributor_orders', 'distributors', 'distributor_order_system'];
    
    for (const tableName of targetTables) {
      const columnsRes = await client.query(`
        SELECT 
          c.column_name, 
          c.data_type, 
          c.is_nullable, 
          c.column_default,
          (
            SELECT EXISTS (
              SELECT 1 
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_name = c.table_name
                AND kcu.column_name = c.column_name
            )
          ) AS is_primary_key
        FROM information_schema.columns c
        WHERE c.table_name = $1
        ORDER BY c.ordinal_position;
      `, [tableName]);

      if (columnsRes.rows.length > 0) {
        console.log(`\n--- Columns in table '${tableName}' ---`);
        console.table(columnsRes.rows.map(row => ({
          Column: row.column_name,
          Type: row.data_type,
          Nullable: row.is_nullable,
          Default: row.column_default,
          'Is PK': row.is_primary_key ? 'YES' : 'NO'
        })));
      } else {
        console.log(`\n❌ Table '${tableName}' columns could not be retrieved (table may not exist yet).`);
      }
    }
    
  } catch (err) {
    console.error("❌ Error running verification:", err.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

inspectDistributorTables();
