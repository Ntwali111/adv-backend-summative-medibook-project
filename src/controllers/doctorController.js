
const doctorModel = require('../models/doctorModel');

const validId = (id) => /^\d+$/.test(id) && Number(id) > 0;

const requiredFields = [
  'first_name',
  'last_name',
  'specialty',
  'consultation_fee',
  'room'
];

function validateDoctor(body) {
  return requiredFields.every((field) =>
    body[field] !== undefined &&
    body[field] !== null &&
    String(body[field]).trim() !== ''
  ) && Number.isFinite(Number(body.consultation_fee)) &&
    Number(body.consultation_fee) >= 0;
}

// Get all doctors
async function getAllDoctors(req, res, next) {
  try {
    const doctors = await doctorModel.getAllDoctors();
    res.status(200).json({ success: true, data: doctors });
  } catch (error) {
    next(error);
  }
}

// Get one doctor
async function getDoctorById(req, res, next) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID' });
    }

    const doctor = await doctorModel.getDoctorById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
}

// Create a doctor
async function createDoctor(req, res, next) {
  try {
    if (!validateDoctor(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'All doctor fields are required and consultation fee must be a valid non-negative number'
      });
    }

    const doctor = await doctorModel.createDoctor(req.body);

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: doctor
    });
  } catch (error) {
    next(error);
  }
}

// Update a doctor
async function updateDoctor(req, res, next) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID' });
    }

    if (!validateDoctor(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'All doctor fields are required and consultation fee must be a valid non-negative number'
      });
    }

    const doctor = await doctorModel.updateDoctor(req.params.id, req.body);

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Doctor updated successfully',
      data: doctor
    });
  } catch (error) {
    next(error);
  }
}

// Delete a doctor
async function deleteDoctor(req, res, next) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID' });
    }

    const deleted = await doctorModel.deleteDoctor(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Doctor deleted successfully'
    });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      error.statusCode = 409;
      error.message = 'This doctor has appointments and cannot be deleted';
    }
    next(error);
  }
}

module.exports = {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor
};
