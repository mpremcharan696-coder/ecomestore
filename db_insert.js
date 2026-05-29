import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function insertRecord() {
  const storeName = "Aetheric Neon Store";
  const query = `
    INSERT INTO stores (store_name)
    VALUES ($1)
    RETURNING store_id, store_name, created_at;
  `;
  
  try {
    console.log(`Attempting to insert store: "${storeName}"...`);
    const result = await pool.query(query, [storeName]);
    console.log("✓ Success! Store inserted securely using parameterized variables:");
    console.table(result.rows);
  } catch (error) {
    console.error("❌ Insertion failed:", error.message);
  } finally {
    await pool.end();
  }
}

insertRecord();
