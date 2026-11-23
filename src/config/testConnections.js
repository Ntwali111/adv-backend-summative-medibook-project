
const pool = require('./db');
const redisClient = require('./redis');

async function testConnections() {
  try {
    // Test MySQL
    const [rows] = await pool.query('SELECT DATABASE() AS databaseName');
    console.log('MySQL connected successfully:', rows[0].databaseName);

    // Test Redis
    await redisClient.connect();
    const response = await redisClient.ping();
    console.log('Redis connected successfully:', response);

  } catch (error) {
    console.error('Connection test failed:', error.message);
  } finally {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }

    await pool.end();
  }
}

testConnections();
