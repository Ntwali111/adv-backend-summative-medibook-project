
const express = require('express');

const {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  cancelAppointment,
  joinWaitlist
} = require('../controllers/appointmentController');

const router = express.Router();

router.get('/', getAllAppointments);
router.post('/waitlist', joinWaitlist);
router.get('/:id', getAppointmentById);
router.post('/', createAppointment);
router.patch('/:id/cancel', cancelAppointment);

module.exports = router;
