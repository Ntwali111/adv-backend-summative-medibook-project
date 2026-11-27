
const reportModel = require('../models/reportModel');

async function getRevenueSummary(req, res, next) {
  try {
    const data = await reportModel.getRevenueSummary();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getUpcomingAppointments(req, res, next) {
  try {
    const data = await reportModel.getUpcomingAppointments();
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
}

async function getDailyAppointments(req, res, next) {
  try {
    const data = await reportModel.getDailyAppointments();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getDoctorUtilization(req, res, next) {
  try {
    const data = await reportModel.getDoctorUtilization();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getBusyDays(req, res, next) {
  try {
    const data = await reportModel.getBusyDays();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRevenueSummary,
  getUpcomingAppointments,
  getDailyAppointments,
  getDoctorUtilization,
  getBusyDays
};
