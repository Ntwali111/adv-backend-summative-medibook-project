
const pool = require('../config/db');

// Get all patients
async function getAllPatients() {
  const [rows] = await pool.query(
    'SELECT * FROM patients ORDER BY patient_id DESC'
  );

  return rows;
}

// Get one patient by ID
async function getPatientById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM patients WHERE patient_id = ?',
    [id]
  );

  return rows[0];
}

// Create a patient
async function createPatient(patient) {
  const { first_name, last_name, email, phone, date_of_birth } = patient;

  const [result] = await pool.query(
    `INSERT INTO patients
    (first_name, last_name, email, phone, date_of_birth)
    VALUES (?, ?, ?, ?, ?)`,
    [first_name, last_name, email, phone, date_of_birth || null]
  );

  return getPatientById(result.insertId);
}

// Update a patient
async function updatePatient(id, patient) {
  const { first_name, last_name, email, phone, date_of_birth } = patient;

  const [result] = await pool.query(
    `UPDATE patients
    SET first_name = ?, last_name = ?, email = ?, phone = ?, date_of_birth = ?
    WHERE patient_id = ?`,
    [first_name, last_name, email, phone, date_of_birth || null, id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getPatientById(id);
}

// Delete a patient
async function deletePatient(id) {
  const [result] = await pool.query(
    'DELETE FROM patients WHERE patient_id = ?',
    [id]
  );

  return result.affectedRows > 0;
}

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient
};
