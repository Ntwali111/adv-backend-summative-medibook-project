
require('dotenv').config();

const app = require('./app');
const redisClient = require('./config/redis');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    app.listen(PORT, () => {
      console.log(`MediBook server running on http://localhost:${PORT}`);
      console.log('Redis connected successfully');
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
