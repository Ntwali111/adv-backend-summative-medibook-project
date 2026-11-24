
const pool = require('../config/db');

// Get all doctors
async function getAllDoctors() {
  const [rows] = await pool.query(
    'SELECT * FROM doctors ORDER BY doctor_id DESC'
  );
  return rows;
}

// Get one doctor
async function getDoctorById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM doctors WHERE doctor_id = ?',
    [id]
  );
  return rows[0];
}

// Create a doctor
async function createDoctor(doctor) {
  const { first_name, last_name, specialty, consultation_fee, room } = doctor;

  const [result] = await pool.query(
    `INSERT INTO doctors
    (first_name, last_name, specialty, consultation_fee, room)
    VALUES (?, ?, ?, ?, ?)`,
    [first_name, last_name, specialty, consultation_fee, room]
  );

  return getDoctorById(result.insertId);
}

// Update a doctor
async function updateDoctor(id, doctor) {
  const { first_name, last_name, specialty, consultation_fee, room } = doctor;

  const [result] = await pool.query(
    `UPDATE doctors
     SET first_name = ?, last_name = ?, specialty = ?,
         consultation_fee = ?, room = ?
     WHERE doctor_id = ?`,
    [first_name, last_name, specialty, consultation_fee, room, id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getDoctorById(id);
}

// Delete a doctor
async function deleteDoctor(id) {
  const [result] = await pool.query(
    'DELETE FROM doctors WHERE doctor_id = ?',
    [id]
  );

  return result.affectedRows > 0;
}

module.exports = {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor
};
