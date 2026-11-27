
const express = require('express');

const healthRoutes = require('./routes/healthRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

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

// Health check
app.use('/api/health', healthRoutes);

// Patient routes
app.use('/api/patients', patientRoutes);

// Doctor routes
app.use('/api/doctors', doctorRoutes);

// Appointment routes
app.use('/api/appointments', appointmentRoutes);

//report routes
app.use('/api/reports', reportRoutes);

app.use('/feedback', feedbackRoutes);

// Handle unknown routes
app.use(notFoundMiddleware);

// Handle application errors
app.use(errorMiddleware);

module.exports = app;
