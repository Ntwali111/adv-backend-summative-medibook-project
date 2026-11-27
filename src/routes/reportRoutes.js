
const express = require('express');

const {
  getRevenueSummary,
  getUpcomingAppointments,
  getDailyAppointments,
  getDoctorUtilization,
  getBusyDays
} = require('../controllers/reportController');

const router = express.Router();

router.get('/revenue', getRevenueSummary);
router.get('/upcoming', getUpcomingAppointments);
router.get('/daily', getDailyAppointments);
router.get('/utilization', getDoctorUtilization);
router.get('/busy-days', getBusyDays);

module.exports = router;
