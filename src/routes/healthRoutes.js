
const express = require('express');
const pool = require('../config/db');
const redisClient = require('../config/redis');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');

    if (!redisClient.isReady) {
      throw new Error('Redis is not ready');
    }

    res.status(200).json({
      success: true,
      message: 'MediBook API is healthy',
      services: {
        mysql: 'connected',
        redis: 'connected'
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
