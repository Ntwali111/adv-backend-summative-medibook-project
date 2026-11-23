
const express = require('express');

const healthRoutes = require('./routes/healthRoutes');
const notFoundMiddleware = require('./middleware/notFoundMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// Read JSON request bodies
app.use(express.json());

// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to MediBook Clinic Appointment System API'
  });
});

// Health-check route
app.use('/api/health', healthRoutes);

// Handle unknown routes
app.use(notFoundMiddleware);

// Handle application errors
app.use(errorMiddleware);

module.exports = app;
