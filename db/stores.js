import pg from 'pg';
const { Pool } = pg;

// Initialize connection pool using the environment DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Neon requires secure SSL/TLS connections
    rejectUnauthorized: true,
  }
});

/**
 * @typedef {Object} CreateStoreInput
 * @property {string} store_name - The unique name of the store.
 */

/**
 * @typedef {Object} Store
 * @property {number} store_id - Unique auto-incremented identifier.
 * @property {string} store_name - Unique name of the store.
 * @property {string} created_at - Timestamp when the store was registered.
 */

/**
 * Parameterized query to securely insert a new store name and return the generated store_id.
 * This separates variable data ($1) from the query structure, preventing SQL injection.
 * 
 * @param {CreateStoreInput} input
 * @returns {Promise<Store>}
 */
export async function createStore(input) {
  const query = `
    INSERT INTO stores (store_name)
    VALUES ($1)
    RETURNING store_id, store_name, created_at;
  `;
  
  // Safe parameterized arguments array
  const values = [input.store_name.trim()];
  
  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error(`The store name "${input.store_name}" is already taken.`);
    }
    if (error.code === '23514') {
      throw new Error('Store name must be at least 2 characters long.');
    }
    throw error;
  }
}

export default pool;
