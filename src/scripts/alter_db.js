import pool from '../config/db.js';

const alterDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Starting alter database...');

    // Add order_type column if it doesn't exist
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'dine_in';
    `);
    
    // Drop NOT NULL constraint on table_number
    await client.query(`
      ALTER TABLE orders 
      ALTER COLUMN table_number DROP NOT NULL;
    `);

    await client.query('COMMIT');
    console.log('Alter database completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during alter database:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

alterDb();
