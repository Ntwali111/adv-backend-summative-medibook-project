
const patientModel = require('../models/patientModel');

// Get all patients
async function getAllPatients(req, res, next) {
  try {
    const patients = await patientModel.getAllPatients();

    res.status(200).json({
      success: true,
      data: patients
    });
  } catch (error) {
    next(error);
  }
}

// Get one patient by ID
async function getPatientById(req, res, next) {
  try {
    const patient = await patientModel.getPatientById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    next(error);
  }
}

// Create a patient
async function createPatient(req, res, next) {
  try {
    const { first_name, last_name, email, phone } = req.body;

    if (!first_name || !last_name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email and phone are required'
      });
    }

    const patient = await patientModel.createPatient(req.body);

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: patient
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      error.statusCode = 409;
      error.message = 'A patient with this email already exists';
    }

    next(error);
  }
}

// Update a patient
async function updatePatient(req, res, next) {
  try {
    const { first_name, last_name, email, phone } = req.body;

    if (!first_name || !last_name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email and phone are required'
      });
    }

    const patient = await patientModel.updatePatient(
      req.params.id,
      req.body
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      data: patient
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      error.statusCode = 409;
      error.message = 'A patient with this email already exists';
    }

    next(error);
  }
}

// Delete a patient
async function deletePatient(req, res, next) {
  try {
    const deleted = await patientModel.deletePatient(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient
};
