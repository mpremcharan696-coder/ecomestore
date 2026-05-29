import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

console.log("Connecting to Neon PostgreSQL database for schema verification...");

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function verifySchema() {
  let client;
  try {
    client = await pool.connect();
    console.log("✓ Connected securely to Neon!");

    console.log("\n--- Checking 'products' table columns ---");
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
      WHERE c.table_name = 'products'
      ORDER BY c.ordinal_position;
    `);

    if (columnsRes.rows.length === 0) {
      console.log("❌ Table 'products' does not exist in the database!");
    } else {
      console.log(`Found ${columnsRes.rows.length} columns in table 'products':`);
      console.table(columnsRes.rows.map(row => ({
        Column: row.column_name,
        Type: row.data_type,
        Nullable: row.is_nullable,
        Default: row.column_default,
        'Is PK': row.is_primary_key ? 'YES' : 'NO'
      })));

      // Check for each requested variable specifically
      const requestedVars = [
        { name: 'product_id', expectedType: 'integer', desc: 'Primary Key' },
        { name: 'product_name', expectedType: 'character varying', desc: 'String' },
        { name: 'current_stock_level', expectedType: 'integer', desc: 'Integer' },
        { name: 'minimum_stock_threshold', expectedType: 'integer', desc: 'Integer' },
        { name: 'unit_price', expectedType: 'numeric', desc: 'Decimal' },
        { name: 'last_updated_timestamp', expectedType: 'timestamp with time zone', desc: 'Timestamp' }
      ];

      console.log("\n--- Verification Report ---");
      let allFound = true;
      for (const req of requestedVars) {
        const match = columnsRes.rows.find(c => c.column_name === req.name);
        if (match) {
          const typeMatches = match.data_type.toLowerCase().includes(req.expectedType.toLowerCase());
          console.log(`✓ Column '${req.name}' found. Type in DB: '${match.data_type}' (${req.desc}). Nullable: ${match.is_nullable}, Default: ${match.column_default || 'None'}`);
          if (req.name === 'product_id' && !match.is_primary_key) {
            console.log(`  ⚠ WARNING: product_id is not marked as PRIMARY KEY!`);
            allFound = false;
          }
        } else {
          console.log(`❌ Column '${req.name}' is MISSING!`);
          allFound = false;
        }
      }

      if (allFound) {
        console.log("\n🎉 SCHEMA VERIFICATION SUCCESSFUL: All 6 requested variables exist with correct attributes!");
      } else {
        console.log("\n❌ SCHEMA VERIFICATION FAILED: Some columns or properties do not match requirements.");
      }
    }
  } catch (err) {
    console.error("❌ Error running verification:", err.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

verifySchema();
