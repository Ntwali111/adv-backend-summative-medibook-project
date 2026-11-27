
const redisClient = require('../config/redis');
const pool = require('../config/db');

// Convert a date into the format used by MySQL.
function formatMysqlDateTime(value) {
  if (value instanceof Date) {
    const pad = (number) => String(number).padStart(2, '0');

    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ` +
      `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }

  return String(value).replace('T', ' ').slice(0, 19);
}

// Create a Redis key for a doctor's appointment waiting list.
function getWaitlistKey(doctorId, appointmentDateTime) {
  const formattedDate = formatMysqlDateTime(appointmentDateTime);
  return `waitlist:${doctorId}:${formattedDate}`;
}

// Add a patient to a waiting list.
async function addToWaitlist(patientId, doctorId, appointmentDateTime) {
  const key = getWaitlistKey(doctorId, appointmentDateTime);
  const mysqlDateTime = formatMysqlDateTime(appointmentDateTime);

  const [patients] = await pool.query(
    'SELECT patient_id FROM patients WHERE patient_id = ?',
    [patientId]
  );

  if (patients.length === 0) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  const [doctors] = await pool.query(
    'SELECT doctor_id FROM doctors WHERE doctor_id = ?',
    [doctorId]
  );

  if (doctors.length === 0) {
    const error = new Error('Doctor not found');
    error.statusCode = 404;
    throw error;
  }

  const [appointments] = await pool.query(
    `SELECT appointment_id FROM appointments
     WHERE doctor_id = ?
     AND appointment_datetime = ?
     AND status = 'CONFIRMED'`,
    [doctorId, mysqlDateTime]
  );

  if (appointments.length === 0) {
    const error = new Error(
      'This appointment slot is available. Please book it directly.'
    );
    error.statusCode = 409;
    throw error;
  }

  const existingPatients = await redisClient.lRange(key, 0, -1);

  if (existingPatients.includes(String(patientId))) {
    const error = new Error('Patient is already on this waiting list');
    error.statusCode = 409;
    throw error;
  }

  await redisClient.rPush(key, String(patientId));

  return {
    patient_id: patientId,
    doctor_id: doctorId,
    appointment_datetime: mysqlDateTime,
    position: existingPatients.length + 1
  };
}

// Add a cancellation job to Redis for the background worker.
async function enqueueCancellation(appointment) {
  const job = {
    appointment_id: appointment.appointment_id,
    doctor_id: appointment.doctor_id,
    appointment_datetime: formatMysqlDateTime(
      appointment.appointment_datetime
    ),
    amount_paid: appointment.amount_paid
  };

  await redisClient.rPush(
    'cancellation:jobs',
    JSON.stringify(job)
  );

  return job;
}

module.exports = {
  getWaitlistKey,
  addToWaitlist,
  enqueueCancellation,
  formatMysqlDateTime
};
