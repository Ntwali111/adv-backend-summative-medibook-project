
const pool = require('./db');

async function inspectDatabase() {
  try {
    const [columns] = await pool.query('DESCRIBE doctors');

    console.log('Doctors table structure:');
    console.table(columns);

  } catch (error) {
    console.error('Database inspection failed:', error.message);
  } finally {
    await pool.end();
  }
}

inspectDatabase();
