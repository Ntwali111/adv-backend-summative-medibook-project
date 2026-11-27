
const pool = require('../config/db');
const crypto = require('crypto');

// Get all appointments
async function getAllAppointments() {
  const [rows] = await pool.query(
    `SELECT a.*,
            p.first_name AS patient_first_name,
            p.last_name AS patient_last_name,
            d.first_name AS doctor_first_name,
            d.last_name AS doctor_last_name,
            d.specialty
     FROM appointments a
     JOIN patients p ON a.patient_id = p.patient_id
     JOIN doctors d ON a.doctor_id = d.doctor_id
     ORDER BY a.appointment_datetime ASC`
  );

  return rows;
}

// Get one appointment
async function getAppointmentById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM appointments WHERE appointment_id = ?',
    [id]
  );

  return rows[0];
}

// Create an appointment
async function createAppointment(appointment) {
  const { patient_id, doctor_id, appointment_datetime } = appointment;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the doctor row to protect simultaneous bookings.
    const [doctors] = await connection.query(
      `SELECT doctor_id, consultation_fee
       FROM doctors
       WHERE doctor_id = ?
       FOR UPDATE`,
      [doctor_id]
    );

    if (doctors.length === 0) {
      const error = new Error('Doctor not found');
      error.statusCode = 404;
      throw error;
    }

    // Check that the patient exists.
    const [patients] = await connection.query(
      'SELECT patient_id FROM patients WHERE patient_id = ?',
      [patient_id]
    );

    if (patients.length === 0) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // Check the doctor's daily appointment limit.
    const [dateRows] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM appointments
       WHERE doctor_id = ?
         AND DATE(appointment_datetime) = DATE(?)
         AND status <> 'CANCELLED'`,
      [doctor_id, appointment_datetime]
    );

    if (dateRows[0].total >= 12) {
      const error = new Error(
        'This doctor has reached the maximum of 12 appointments for that day'
      );
      error.statusCode = 409;
      throw error;
    }

    // Generate an appointment reference.
    const appointment_ref =
      `MED-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const amount_paid = doctors[0].consultation_fee;

    const [result] = await connection.query(
      `INSERT INTO appointments
       (appointment_ref, patient_id, doctor_id,
        appointment_datetime, amount_paid)
       VALUES (?, ?, ?, ?, ?)`,
      [
        appointment_ref,
        patient_id,
        doctor_id,
        appointment_datetime,
        amount_paid
      ]
    );

    await connection.commit();

    return getAppointmentById(result.insertId);
  } catch (error) {
    await connection.rollback();

    if (error.code === 'ER_DUP_ENTRY') {
      const bookingError = new Error(
        'This doctor already has an appointment at that time'
      );
      bookingError.statusCode = 409;
      throw bookingError;
    }

    throw error;
  } finally {
    connection.release();
  }
}

// Cancel an appointment and calculate its refund.
async function cancelAppointment(id) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT *,
              TIMESTAMPDIFF(
                SECOND,
                NOW(),
                appointment_datetime
              ) AS seconds_until
       FROM appointments
       WHERE appointment_id = ?
       FOR UPDATE`,
      [id]
    );

    if (rows.length === 0) {
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      throw error;
    }

    const appointment = rows[0];

    if (appointment.status !== 'CONFIRMED') {
      const error = new Error(
        'Only confirmed appointments can be cancelled'
      );
      error.statusCode = 409;
      throw error;
    }

    if (appointment.seconds_until <= 0) {
      const error = new Error('Past appointments cannot be cancelled');
      error.statusCode = 400;
      throw error;
    }

    const hoursUntil = appointment.seconds_until / 3600;

    let refundPercentage;

    if (hoursUntil > 48) {
      refundPercentage = 100;
    } else if (hoursUntil >= 24) {
      refundPercentage = 50;
    } else {
      refundPercentage = 0;
    }

    const refundAmount = (
      Number(appointment.amount_paid) * refundPercentage / 100
    ).toFixed(2);

    await connection.query(
      `UPDATE appointments
       SET status = 'CANCELLED',
           cancelled_at = NOW(),
           refund_percentage = ?,
           refund_amount = ?
       WHERE appointment_id = ?`,
      [refundPercentage, refundAmount, id]
    );

    await connection.commit();

    return getAppointmentById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Export all appointment functions
module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  cancelAppointment
};
