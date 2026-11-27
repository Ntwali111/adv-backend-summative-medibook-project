
const pool = require('../config/db');

// 1. Revenue summary
async function getRevenueSummary() {
  const [rows] = await pool.query(`
    SELECT
      COUNT(*) AS total_appointments,
      COALESCE(SUM(amount_paid), 0) AS total_amount_paid,
      COALESCE(SUM(
        CASE
          WHEN status = 'CANCELLED'
            THEN amount_paid - refund_amount
          ELSE amount_paid
        END
      ), 0) AS net_revenue,
      COALESCE(SUM(refund_amount), 0) AS total_refunded
    FROM appointments
  `);

  return rows[0];
}

// 2. Upcoming appointments
async function getUpcomingAppointments() {
  const [rows] = await pool.query(`
    SELECT
      a.appointment_id,
      a.appointment_ref,
      a.appointment_datetime,
      a.status,
      p.first_name AS patient_first_name,
      p.last_name AS patient_last_name,
      d.first_name AS doctor_first_name,
      d.last_name AS doctor_last_name,
      d.specialty
    FROM appointments a
    JOIN patients p ON a.patient_id = p.patient_id
    JOIN doctors d ON a.doctor_id = d.doctor_id
    WHERE a.status = 'CONFIRMED'
      AND a.appointment_datetime > NOW()
    ORDER BY a.appointment_datetime ASC
    LIMIT 20
  `);

  return rows;
}

// 3. Appointments over the next seven days
async function getDailyAppointments() {
  const [rows] = await pool.query(`
    SELECT
      DATE(appointment_datetime) AS appointment_date,
      COUNT(*) AS total_appointments,
      SUM(status = 'CONFIRMED') AS confirmed_appointments,
      SUM(status = 'CANCELLED') AS cancelled_appointments
    FROM appointments
    WHERE appointment_datetime >= CURDATE()
      AND appointment_datetime < DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(appointment_datetime)
    ORDER BY appointment_date ASC
  `);

  return rows;
}

// 4. Doctor utilization over seven days
async function getDoctorUtilization() {
  const [rows] = await pool.query(`
    SELECT
      d.doctor_id,
      d.first_name,
      d.last_name,
      d.specialty,
      COUNT(a.appointment_id) AS booked_appointments,
      84 AS available_slots,
      ROUND(COUNT(a.appointment_id) / 84 * 100, 2)
        AS utilization_percentage
    FROM doctors d
    LEFT JOIN appointments a
      ON d.doctor_id = a.doctor_id
      AND a.status <> 'CANCELLED'
      AND a.appointment_datetime >= CURDATE()
      AND a.appointment_datetime < DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    GROUP BY
      d.doctor_id,
      d.first_name,
      d.last_name,
      d.specialty
    ORDER BY utilization_percentage DESC
  `);

  return rows;
}

// 5. Days with more than 80% utilization
async function getBusyDays() {
  const [rows] = await pool.query(`
    SELECT
      d.doctor_id,
      d.first_name,
      d.last_name,
      DATE(a.appointment_datetime) AS busy_date,
      COUNT(a.appointment_id) AS booked_appointments,
      ROUND(COUNT(a.appointment_id) / 12 * 100, 2)
        AS utilization_percentage
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.doctor_id
    WHERE a.status <> 'CANCELLED'
      AND a.appointment_datetime >= CURDATE()
      AND a.appointment_datetime < DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    GROUP BY
      d.doctor_id,
      d.first_name,
      d.last_name,
      DATE(a.appointment_datetime)
    HAVING COUNT(a.appointment_id) / 12 > 0.8
    ORDER BY busy_date ASC, utilization_percentage DESC
  `);

  return rows;
}

module.exports = {
  getRevenueSummary,
  getUpcomingAppointments,
  getDailyAppointments,
  getDoctorUtilization,
  getBusyDays
};
